from elucera.llm import LLMClient, complete_json
from elucera.models import Renderer, Script, SceneSpec, ScenePlan, SegmentAudio
from elucera.prompts import load


def format_timed_words(audio: SegmentAudio) -> str:
    return " ".join(f"[{w.start:.2f}]{w.word}" for w in audio.words)


def plan_scenes(llm: LLMClient, script: Script, audio: list[SegmentAudio],
                preferred: str | Renderer | None = None, note: str = "") -> list[SceneSpec]:
    preferred = Renderer(preferred) if preferred else None
    parts = [f"Reel: {script.title}\nCore idea: {script.idea}\n"]
    if note.strip():
        parts.append(f"Director note (must follow it): {note.strip()}")
    for seg, a in zip(script.segments, audio):
        parts.append(
            f"## Segment {a.index} — {seg.role} — duration {a.duration:.2f}s\n"
            f"Narration: {seg.narration}\nWriter's visual idea: {seg.visual_directive}\n"
            f"Word timings (seconds from segment start): {format_timed_words(a)}\n"
        )
    parts.append(f"Return exactly {len(audio)} scenes, one per segment, in order.")
    if preferred:
        parts.append(
            f"Hard constraint from the user: use renderer \"{preferred.value}\" for ALL scenes. "
            f"Write every description for that renderer."
        )
    plan = complete_json(llm, load("scene_plan"), "\n".join(parts), ScenePlan)
    if len(plan.scenes) != len(audio):
        raise ValueError(f"planner returned {len(plan.scenes)} scenes for {len(audio)} segments")
    if preferred:
        for p in plan.scenes:
            p.renderer = preferred
    return [
        SceneSpec(index=a.index, renderer=p.renderer, duration=a.duration, description=p.description, beats=p.beats)
        for p, a in zip(plan.scenes, audio)
    ]
