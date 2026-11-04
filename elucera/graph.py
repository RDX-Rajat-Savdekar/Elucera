"""LangGraph pipeline: script → voice → plan → (scene × N in parallel) → assemble.

Every step reports structured events through an `emit(type, **data)` callback (passed in the run config) so the
UI can stream exactly what is happening, including each scene's attempts and errors.
"""

import json
import logging
import operator
import shutil
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Annotated, TypedDict

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from elucera import cache, library, usage
from elucera.agents.coders import build_scene, coder_for
from elucera.agents.scene_planner import plan_scenes
from elucera.agents.script import write_script
from elucera.assemble import ffmpeg as ff
from elucera.assemble.captions import write_ass
from elucera.audio.align import align, segment_cuts
from elucera.audio.tts import concat_wavs, split_wav, synthesize
from elucera.config import get_settings
from elucera.fsutil import write_text_atomic
from elucera.llm import MuseClient
from elucera.models import Renderer, RenderResult, SceneSpec, Script, Segment, SegmentAudio, WordTiming
from elucera.prompts import load as load_prompt

log = logging.getLogger(__name__)

Emit = Callable[..., None]  # emit(type: str, **data)

STAGES = {
    "script": "Writing the script",
    "voice": "Recording the voiceover",
    "align": "Syncing every word to the audio",
    "plan": "Directing the scenes",
    "render": "Animating scenes",
    "assemble": "Assembling and captioning",
}


def _noop(type: str, **data) -> None:
    log.info("%s %s", type, data)


def _emit(config: RunnableConfig) -> Emit:
    return config.get("configurable", {}).get("emit") or _noop


def _stage(emit: Emit, stage: str) -> None:
    emit("stage", stage=stage, label=STAGES[stage])


class State(TypedDict, total=False):
    job_dir: Path
    topic: str
    preferred_renderer: str | None
    note: str
    script: Script
    audio: list[SegmentAudio]
    specs: list[SceneSpec]
    results: Annotated[list[RenderResult], operator.add]
    final: Path


class SceneTask(TypedDict):
    job_dir: Path
    topic: str
    title: str
    segment: Segment
    spec: SceneSpec
    audio: SegmentAudio


def _save(job_dir: Path, name: str, data) -> None:
    write_text_atomic(job_dir / name, json.dumps(data, indent=2, default=str))


def script_node(state: State, config: RunnableConfig) -> State:
    emit = _emit(config)
    _stage(emit, "script")
    with usage.purpose("script"):
        script = write_script(MuseClient(), state["topic"])
    _save(state["job_dir"], "script.json", script.model_dump())
    emit("script", script=script.model_dump())
    return {"script": script}


def voice_node(state: State, config: RunnableConfig) -> State:
    emit = _emit(config)
    _stage(emit, "voice")
    d = state["job_dir"]
    segments = state["script"].segments
    # One TTS request for the whole script (Gemini free tier allows 3/min), split by word timings after.
    # The director style prompt steers delivery; only the TRANSCRIPT section is spoken.
    full = d / "voice_full.wav"
    text = load_prompt("vo_style").strip() + "\n\n#### TRANSCRIPT\n" + "\n\n".join(s.narration for s in segments)
    script_text = "\n\n".join(s.narration for s in segments)
    hit = cache.tts_get(text, full)
    if hit:
        duration, words = hit
        emit("voice", duration=round(duration, 2), provider="gemini", cached=True,
             note="Narration unchanged — reused the recorded voiceover and word timings.")
        _stage(emit, "align")
    else:
        info: dict = {}
        with usage.purpose("voice"):
            duration = synthesize(text, full, info=info, spoken=script_text)
        emit("voice", duration=round(duration, 2), provider=info.get("provider", "gemini"), note=info.get("note", ""))
        _stage(emit, "align")
        # Align narration ONLY: the styled text above may itself be spoken, and any
        # preamble words must never leak into segment word lists or timings.
        words = align(full, script_text, duration)
        cache.tts_put(text, full, duration, words, info.get("provider", "gemini"))
    counts = [len(s.narration.split()) for s in segments]
    cuts = segment_cuts(words, counts)
    wavs = [d / f"seg{i}.wav" for i in range(len(segments))]
    split_wav(full, cuts, wavs)
    edges = [0.0, *cuts, duration]
    audio, k = [], 0
    for i, n in enumerate(counts):
        t0 = edges[i]
        seg_words = [WordTiming(word=w.word, start=round(w.start - t0, 3), end=round(w.end - t0, 3)) for w in words[k : k + n]]
        audio.append(SegmentAudio(index=i, wav=wavs[i], duration=round(edges[i + 1] - t0, 3), words=seg_words))
        k += n
    _save(d, "audio.json", [a.model_dump() for a in audio])
    return {"audio": audio}


def plan_node(state: State, config: RunnableConfig) -> State:
    emit = _emit(config)
    _stage(emit, "plan")
    specs = make_plan(state["script"], state["audio"], state.get("note", ""), state.get("preferred_renderer"), emit)
    _save(state["job_dir"], "plan.json", [s.model_dump() for s in specs])
    emit("plan", scenes=[
        {"index": s.index, "role": state["script"].segments[s.index].role, "renderer": s.renderer.value,
         "duration": s.duration, "description": s.description}
        for s in specs
    ])
    _stage(emit, "render")
    return {"specs": specs}


def make_plan(script: Script, audio: list[SegmentAudio], note: str, preferred: str | None, emit: Emit = _noop) -> list[SceneSpec]:
    """Plan the scenes, reusing a plan made for the identical script + timings + note (e.g. during review)."""
    hit = cache.plan_get(script, audio, note, preferred)
    if hit:
        emit("plan_cached")
        return hit
    with usage.purpose("plan"):
        specs = plan_scenes(MuseClient(), script, audio, preferred=preferred, note=note)
    cache.plan_put(script, audio, note, preferred, specs)
    return specs


def fan_out(state: State) -> list[Send]:
    done = {r.index for r in state.get("results", [])}
    return [
        Send("scene", SceneTask(job_dir=state["job_dir"], topic=state["topic"], title=state["script"].title,
                                segment=state["script"].segments[spec.index], spec=spec, audio=a))
        for spec, a in zip(state["specs"], state["audio"], strict=True) if spec.index not in done
    ]


def render_entry(state: State, config: RunnableConfig) -> State:
    """Entry point when resuming with a plan already made: go straight to the unfinished scenes."""
    _stage(_emit(config), "render")
    return {}


def _coder_llm() -> MuseClient:
    """Scene code runs at its own (lower) reasoning effort: it is the slowest, most parallel step."""
    return MuseClient(effort=get_settings().muse_code_effort)


def scene_node(task: SceneTask, config: RunnableConfig) -> State:
    spec = task["spec"]
    res = build_scene(_coder_llm(), coder_for(spec.renderer), spec, task["audio"], task["title"], task["job_dir"],
                      topic=task["topic"], segment=task["segment"], emit=_emit(config))
    save_result(task["job_dir"], res)
    return {"results": [res]}


def save_result(d: Path, res: RenderResult) -> None:
    """Each finished scene is persisted on its own, so a failed run can resume without redoing it."""
    write_text_atomic(d / f"seg{res.index}.result.json", res.model_dump_json(exclude={"code"}))


def assemble_node(state: State, config: RunnableConfig) -> State:
    final = assemble_job(state["job_dir"], state["audio"], state["results"], state["topic"], _emit(config))
    return {"final": final}


def assemble_job(d: Path, audio: list[SegmentAudio], results: list[RenderResult], topic: str, emit: Emit = _noop) -> Path:
    """Fit clips to their narration, concat, mux audio, burn captions; save to the library."""
    _stage(emit, "assemble")
    results = sorted(results, key=lambda r: r.index)
    # Pair clips with narration by scene index, never by position: a missing scene must fail loudly, not shift
    # every later clip onto the wrong audio.
    if [r.index for r in results] != [a.index for a in audio]:
        raise ValueError(f"scene clips {[r.index for r in results]} don't match narration segments "
                         f"{[a.index for a in audio]}")
    _save(d, "results.json", [r.model_dump(exclude={"code"}) for r in results])
    with ThreadPoolExecutor(max_workers=4) as pool:  # independent encodes: run side by side
        fitted = list(pool.map(lambda ra: ff.fit_clip(ra[0].video, ra[1].duration, d / f"fit{ra[0].index}.mp4"),
                               zip(results, audio, strict=True)))
    video = ff.concat(fitted, d / "video.mp4")
    narration = d / "narration.wav"
    concat_wavs([a.wav for a in audio], narration)
    words = offset_words(audio)
    final = ff.finalize(video, narration, write_ass(words, d / "captions.ass"), d / "final.mp4", get_settings().music_path)
    if get_settings().use_library:
        library.save_reel(d, topic)
    emit("done", duration=round(sum(a.duration for a in audio), 2))
    return final


def offset_words(audio: list[SegmentAudio]) -> list[WordTiming]:
    """Shift each segment's word timings by the total duration of the segments before it."""
    out, t0 = [], 0.0
    for a in audio:
        out += [WordTiming(word=w.word, start=w.start + t0, end=w.end + t0) for w in a.words]
        t0 += a.duration
    return out


ORDER = ["script", "voice", "plan", "render"]


def _graph(entry: str = "script"):
    """script → voice → plan → scene × N → assemble, entered at `entry` (later steps reuse saved artifacts)."""
    g = StateGraph(State)
    nodes = {"script": script_node, "voice": voice_node, "plan": plan_node, "render": render_entry}
    steps = [n for n in ORDER[ORDER.index(entry):] if n != "render" or entry == "render"]
    for name in steps:
        g.add_node(name, nodes[name])
    g.add_node("scene", scene_node)
    g.add_node("assemble", assemble_node)
    g.add_edge(START, steps[0])
    for a, b in zip(steps, steps[1:], strict=False):
        g.add_edge(a, b)
    g.add_conditional_edges("plan" if "plan" in steps else "render", fan_out, ["scene"])
    g.add_edge("scene", "assemble")
    g.add_edge("assemble", END)
    return g.compile()


def build_graph():
    return _graph("script")


def build_approved_graph():
    """Voice → plan → scene → assemble for an already-approved script."""
    return _graph("voice")


LENGTH_HINTS = {
    "short": " (aim for about 30 seconds of spoken narration: tight hook, lean mechanism)",
    "standard": " (aim for 40 to 50 seconds of spoken narration)",
    "deep": " (aim for 55 to 65 seconds of spoken narration: roomy mechanism with one concrete example)",
}

CONFIG = {"max_concurrency": 4}


def _brief(job_dir: Path, preferred_renderer: str | None, note: str) -> None:
    """What resume needs to repeat the run faithfully."""
    _save(job_dir, "brief.json", {"preferred_renderer": preferred_renderer, "note": note})


def run_approved(topic: str, job_dir: Path, script: Script, emit: Emit | None = None,
                 preferred_renderer: str | None = None, note: str = "", wait_for: Callable[[], None] | None = None) -> Path:
    emit = emit or _noop
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "topic.txt").write_text(topic + "\n")
    _brief(job_dir, preferred_renderer, note)
    _save(job_dir, "script.json", script.model_dump())
    # The script step already happened in review: show it as done instead of skipping straight to the voice.
    emit("stage", stage="script", label="Using your approved script")
    emit("script", script=script.model_dump(), approved=True)
    if wait_for:
        wait_for()
    state = build_approved_graph().invoke(
        {"topic": topic, "job_dir": job_dir, "results": [], "script": script,
         "preferred_renderer": preferred_renderer, "note": note},
        config={"configurable": {"emit": emit}, **CONFIG},
    )
    return state["final"]


def run(topic: str, job_dir: Path, emit: Emit | None = None, preferred_renderer: str | None = None) -> Path:
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "topic.txt").write_text(topic + "\n")
    _brief(job_dir, preferred_renderer, "")
    state = build_graph().invoke(
        {"topic": topic, "job_dir": job_dir, "results": [], "preferred_renderer": preferred_renderer},
        config={"configurable": {"emit": emit or _noop}, **CONFIG},
    )
    return state["final"]


# ---------- speculative work while the user reviews the storyboard ----------

def prefetch(work_dir: Path, script: Script, note: str = "", preferred: str | None = None) -> None:
    """Record the voiceover and plan the scenes for a pitch before it is approved.

    Results land in the TTS and plan caches, so an approval with unchanged narration/visuals/note skips both steps.
    """
    work_dir.mkdir(parents=True, exist_ok=True)
    state: State = {"job_dir": work_dir, "script": script, "topic": script.title}
    audio = voice_node(state, {"configurable": {"emit": _noop}})["audio"]
    make_plan(script, audio, note, preferred)


# ---------- resuming a failed or interrupted run ----------

def resume_point(d: Path) -> str:
    """The first step whose output is missing: script | voice | plan | render | assemble."""
    if not (d / "script.json").exists():
        return "script"
    if not (d / "audio.json").exists():
        return "voice"
    if not (d / "plan.json").exists():
        return "plan"
    n = len(json.loads((d / "plan.json").read_text()))
    return "assemble" if len(saved_results(d)) == n else "render"


def saved_results(d: Path) -> list[RenderResult]:
    """Finished scenes: per-scene result files (newest), falling back to results.json; only ones whose clip exists."""
    out: dict[int, RenderResult] = {}
    if (d / "results.json").exists():
        for r in json.loads((d / "results.json").read_text()):
            out[r["index"]] = RenderResult.model_validate(r)
    for f in d.glob("seg*.result.json"):
        r = RenderResult.model_validate_json(f.read_text())
        out[r.index] = r
    return sorted((r for r in out.values() if r.video and Path(r.video).exists()), key=lambda r: r.index)


def resume(d: Path, emit: Emit = _noop) -> Path:
    """Continue a job from the first missing artifact, reusing everything already produced."""
    topic = (d / "topic.txt").read_text().strip()
    brief = json.loads((d / "brief.json").read_text()) if (d / "brief.json").exists() else {}
    pref, note = brief.get("preferred_renderer"), brief.get("note", "")
    point = resume_point(d)
    emit("resume", stage=point, label=STAGES.get(point, "Assembling and captioning"))
    if point == "script":
        return run(topic, d, emit, preferred_renderer=pref)
    script = Script.model_validate_json((d / "script.json").read_text())
    emit("stage", stage="script", label="Reusing the finished script")
    emit("script", script=script.model_dump(), reused=True)
    state: State = {"topic": topic, "job_dir": d, "results": [], "script": script,
                    "preferred_renderer": pref, "note": note}
    if point == "voice":
        return _graph("voice").invoke(state, config={"configurable": {"emit": emit}, **CONFIG})["final"]
    audio = [SegmentAudio.model_validate(a) for a in json.loads((d / "audio.json").read_text())]
    emit("stage", stage="voice", label="Reusing the recorded voiceover")
    state["audio"] = audio
    if point == "plan":
        return _graph("plan").invoke(state, config={"configurable": {"emit": emit}, **CONFIG})["final"]
    specs = [SceneSpec.model_validate(s) for s in json.loads((d / "plan.json").read_text())]
    emit("stage", stage="plan", label="Reusing the scene plan")
    emit("plan", reused=True, scenes=[
        {"index": s.index, "role": script.segments[s.index].role, "renderer": s.renderer.value,
         "duration": s.duration, "description": s.description} for s in specs])
    done = saved_results(d)
    for r in done:  # finished scenes show as done straight away
        emit("scene", index=r.index, renderer=r.renderer.value, status="fallback" if r.fallback else "done",
             attempt=r.attempts, max_attempts=get_settings().max_render_attempts, reused=True)
    if point == "assemble":
        return assemble_job(d, audio, done, topic, emit)
    state.update(specs=specs, results=done)
    return _graph("render").invoke(state, config={"configurable": {"emit": emit}, **CONFIG})["final"]


# ---------- re-rendering a single scene ----------

def load_job(d: Path) -> tuple[Script, list[SegmentAudio], list[SceneSpec], list[RenderResult]]:
    script = Script.model_validate_json((d / "script.json").read_text())
    audio = [SegmentAudio.model_validate(a) for a in json.loads((d / "audio.json").read_text())]
    specs = [SceneSpec.model_validate(s) for s in json.loads((d / "plan.json").read_text())]
    return script, audio, specs, saved_results(d)


def history(d: Path, index: int | None = None) -> list[dict]:
    f = d / "scene_history.json"
    rows = json.loads(f.read_text()) if f.exists() else []
    return [r for r in rows if index is None or r["index"] == index]


def _add_history(d: Path, row: dict) -> None:
    rows = history(d)
    rows.append(row)
    _save(d, "scene_history.json", rows)


def _versions(d: Path, index: int) -> list[int]:
    return sorted(int(p.name.split(".v")[1].split(".")[0]) for p in d.glob(f"seg{index}.v*.mp4"))


def _archive(d: Path, index: int) -> int:
    """Keep the current clip as seg{i}.v{n}.mp4 so the redo can be compared and reverted. Returns n."""
    n = (max(_versions(d, index)) + 1) if _versions(d, index) else 1
    cur = d / f"seg{index}.mp4"
    if cur.exists():
        shutil.copy(cur, d / f"seg{index}.v{n}.mp4")
    return n


def retry_scene(d: Path, index: int, note: str = "", renderer: str | None = None, emit: Emit = _noop,
                description: str | None = None, library_scene: str | None = None) -> Path | None:
    """Rebuild ONE scene and record exactly what changed. Does not reassemble: call `rebake` for that.

    `description` replaces the animator prompt; `note` is appended as viewer feedback; `library_scene` reuses a
    saved library clip instead of generating new code.
    """
    script, audio, specs, results = load_job(d)
    topic = (d / "topic.txt").read_text().strip() if (d / "topic.txt").exists() else script.title
    before = specs[index]
    prev = next((r for r in results if r.index == index), None)
    version = _archive(d, index)
    spec = before.model_copy()
    if renderer:
        spec.renderer = Renderer(renderer)
    if description and description.strip():
        spec.description = description.strip()
    if note:
        spec.description += f"\n\nViewer feedback for this new version (follow it): {note}"
    _stage(emit, "render")
    if library_scene:
        meta, path = next(((m, p) for m, p in library.scenes() if m.id == library_scene), (None, None))
        if not meta or not (path / "clip.mp4").exists():
            raise ValueError(f"library scene {library_scene} has no clip")
        shutil.copy(path / "clip.mp4", d / f"seg{index}.mp4")
        spec.renderer, spec.description = meta.renderer, meta.description
        res = RenderResult(index=index, renderer=meta.renderer, ok=True, video=d / f"seg{index}.mp4", attempts=0)
        emit("scene", index=index, renderer=meta.renderer.value, status="done", attempt=0, max_attempts=0,
             library=library_scene)
    else:
        res = build_scene(_coder_llm(), coder_for(spec.renderer), spec, audio[index], script.title, d,
                          topic=topic, segment=script.segments[index], emit=emit, use_cache=False)
    specs[index] = spec
    _save(d, "plan.json", [s.model_dump() for s in specs])
    save_result(d, res)
    errors = [(d / f"seg{index}_try{k}.err").read_text().strip().splitlines()[-1][:240]
              for k in range(1, (res.attempts or 0) + 1) if (d / f"seg{index}_try{k}.err").exists()]
    row = {
        "index": index, "version": version + 1, "previous_version": version, "at": round(time.time(), 2),
        "note": note, "renderer_before": before.renderer.value, "renderer_after": spec.renderer.value,
        "description_before": before.description, "description_after": spec.description,
        "description_edited": bool(description and description.strip() and description.strip() != before.description),
        "library_scene": library_scene, "attempts": res.attempts, "fallback": res.fallback,
        "previous_fallback": bool(prev and prev.fallback), "errors": errors,
    }
    _add_history(d, row)
    emit("scene_redone", **row)
    final = d / "final.mp4"
    return final if final.exists() else None


def revert_scene(d: Path, index: int, emit: Emit = _noop) -> dict:
    """Swap the current clip back to the previous version (the current one is archived too, so it can be re-picked)."""
    rows = history(d, index)
    if not rows:
        raise ValueError("this scene has not been redone")
    last = rows[-1]
    src = d / f"seg{index}.v{last['previous_version']}.mp4"
    if not src.exists():
        raise ValueError("the previous version is no longer on disk")
    version = _archive(d, index)
    shutil.copy(src, d / f"seg{index}.mp4")
    specs = [SceneSpec.model_validate(s) for s in json.loads((d / "plan.json").read_text())]
    specs[index].renderer = Renderer(last["renderer_before"])
    specs[index].description = last["description_before"]
    _save(d, "plan.json", [s.model_dump() for s in specs])
    prev = RenderResult(index=index, renderer=Renderer(last["renderer_before"]), ok=True, video=d / f"seg{index}.mp4",
                        fallback=last.get("previous_fallback", False))
    save_result(d, prev)
    row = {"index": index, "version": version + 1, "previous_version": version, "at": round(time.time(), 2),
           "reverted_to": last["previous_version"], "note": "", "renderer_before": last["renderer_after"],
           "renderer_after": last["renderer_before"], "description_before": last["description_after"],
           "description_after": last["description_before"], "description_edited": False, "library_scene": None,
           "attempts": 0, "fallback": prev.fallback, "previous_fallback": last.get("fallback", False), "errors": []}
    _add_history(d, row)
    emit("scene_redone", **row)
    return row


def rebake(d: Path, emit: Emit = _noop) -> Path:
    """Reassemble the reel from the current clips (after one or more scene redos)."""
    script, audio, specs, results = load_job(d)
    missing = sorted({s.index for s in specs} - {r.index for r in results})
    if missing:
        raise ValueError(f"scenes {', '.join(str(i + 1) for i in missing)} are not rendered yet; resume the job first")
    topic = (d / "topic.txt").read_text().strip() if (d / "topic.txt").exists() else script.title
    return assemble_job(d, audio, results, topic, emit)
