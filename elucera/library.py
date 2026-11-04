"""Persistent asset library: every scene that rendered, every reel we finished, and lessons from fixed errors.

Layout (code, metadata and thumbnails are committed; .mp4 files are gitignored):

    library/
      scenes/<id>/   scene.py|scene.tsx, meta.json, thumb.png, clip.mp4
      reels/<slug>/  script.json, plan.json, results.json, strip.png, final.mp4
      lessons.jsonl  one {renderer, error, fix} per error the repair loop got past

Future runs pull the most similar past scenes into the coder prompt as worked examples and list known
pitfalls, so each run builds on the previous ones.
"""

import json
import re
import shutil
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel

from elucera.config import ROOT, get_settings
from elucera.models import Renderer, SceneSpec

LIBRARY = ROOT / "library"
SUFFIX = {Renderer.manim: ".py", Renderer.remotion: ".tsx", Renderer.three: ".tsx", Renderer.seek: ".html"}
STOP = set(
    "a an the and or but of to in on at for is are was were be it its this that with as by from then into "
    "each one two three at its their them they which while when over under so up down out".split()
)


class SceneMeta(BaseModel):
    id: str
    renderer: Renderer
    topic: str
    role: str = ""
    narration: str = ""
    description: str
    beats: list[dict] = []
    duration: float
    attempts: int = 1
    source: str = ""
    created: str
    starred: bool = False


def _dir() -> Path:
    return get_settings().library_dir


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2 and t not in STOP}


def _thumb(video: Path, out: Path, width: int = 270) -> None:
    s = get_settings()
    try:
        dur = float(subprocess.run([s.ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                                   capture_output=True, text=True, check=True).stdout)
        subprocess.run([s.ffmpeg, "-v", "error", "-y", "-ss", f"{dur * 0.6:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", f"scale={width}:-1", str(out)], check=True, capture_output=True)
    except (subprocess.CalledProcessError, ValueError):
        pass  # a thumbnail is nice-to-have


# ---------- scenes ----------

def save_scene(spec: SceneSpec, code: str, video: Path | None, *, topic: str, role: str = "", narration: str = "",
               attempts: int = 1, source: str = "") -> SceneMeta:
    meta = SceneMeta(
        id=f"{datetime.now():%Y%m%d}-{spec.renderer.value}-{uuid.uuid4().hex[:6]}",
        renderer=spec.renderer, topic=topic, role=role, narration=narration, description=spec.description,
        beats=[b.model_dump() for b in spec.beats], duration=round(spec.duration, 3), attempts=attempts,
        source=source, created=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    d = _dir() / "scenes" / meta.id
    d.mkdir(parents=True, exist_ok=True)
    (d / f"scene{SUFFIX[spec.renderer]}").write_text(code)
    (d / "meta.json").write_text(meta.model_dump_json(indent=2))
    if video and video.exists():
        shutil.copy(video, d / "clip.mp4")
        _thumb(video, d / "thumb.png")
    if meta.renderer == Renderer.three:
        # Best-effort interactive preview bundle for the library copy.
        try:
            from elucera.render.player_bundle import build_player_bundle
            scene_file = d / f"scene{SUFFIX[spec.renderer]}"
            if scene_file.exists():
                build_player_bundle(scene_file, meta.duration, d / "player.js")
        except Exception:
            pass  # interactive preview is nice-to-have
    return meta


def scenes(renderer: Renderer | None = None) -> list[tuple[SceneMeta, Path]]:
    out = []
    for f in sorted((_dir() / "scenes").glob("*/meta.json")):
        meta = SceneMeta.model_validate_json(f.read_text())
        if renderer is None or meta.renderer == renderer:
            out.append((meta, f.parent))
    return out


def scene_code(path: Path) -> str:
    return next(path.glob("scene.*")).read_text()


def similar(spec: SceneSpec, k: int = 2, max_chars: int = 6000) -> list[tuple[SceneMeta, str]]:
    """Most similar past scenes for the same renderer (token overlap on description + narration; starred first)."""
    want = _tokens(spec.description + " " + " ".join(b.action for b in spec.beats))
    ranked = []
    for meta, path in scenes(spec.renderer):
        have = _tokens(meta.description + " " + meta.narration + " " + meta.topic)
        score = len(want & have) / (len(want | have) or 1) + (0.5 if meta.starred else 0)
        ranked.append((score, meta, path))
    ranked.sort(key=lambda r: -r[0])
    out, used = [], 0
    for _, meta, path in ranked:
        code = scene_code(path)
        if used + len(code) > max_chars:
            continue
        out.append((meta, code))
        used += len(code)
        if len(out) == k:
            break
    return out


def set_star(scene_id: str, starred: bool) -> None:
    f = _dir() / "scenes" / scene_id / "meta.json"
    meta = SceneMeta.model_validate_json(f.read_text())
    meta.starred = starred
    f.write_text(meta.model_dump_json(indent=2))


def remove(scene_id: str) -> None:
    shutil.rmtree(_dir() / "scenes" / scene_id)


# ---------- lessons ----------

def _error_key(error: str) -> str:
    """The most informative line of an error, with paths/line numbers stripped so repeats dedupe."""
    lines = [ln.strip() for ln in error.strip().splitlines() if ln.strip()]
    pick = next((ln for ln in reversed(lines) if re.search(r"Error|error TS|Banned|not allowed|not defined", ln)), lines[-1] if lines else "")
    pick = re.sub(r"Scene\.tsx\(\d+,\d+\)", "Scene.tsx", pick)
    pick = re.sub(r"line \d+", "line N", pick)
    return pick[:300]


# Environment/infra failures say nothing about how to write a scene; keep them out of prompts.
INFRA = re.compile(r"env: node|No such file or directory|timed out|LLM call failed|Cannot connect to the Docker|docker: ", re.I)


def add_lesson(renderer: Renderer, error: str, note: str = "") -> None:
    key = _error_key(error)
    if not key or INFRA.search(error) or any(l["renderer"] == renderer.value and l["error"] == key for l in lessons()):
        return
    with open(_dir() / "lessons.jsonl", "a") as f:
        f.write(json.dumps({"renderer": renderer.value, "error": key, "note": note, "at": int(time.time())}) + "\n")


def lessons(renderer: Renderer | None = None) -> list[dict]:
    f = _dir() / "lessons.jsonl"
    if not f.exists():
        return []
    rows = [json.loads(ln) for ln in f.read_text().splitlines() if ln.strip()]
    if renderer:
        # three and remotion share the TSX toolchain, so their lessons apply to each other
        group = {Renderer.manim: {"manim"}}.get(renderer, {"remotion", "three"})
        rows = [r for r in rows if r["renderer"] in group]
    return rows


KIT_MARKERS = {
    Renderer.remotion: ("<Stage", "<Slot"),
    Renderer.three: ("<Stage", "<Slot", "<Scene3D"),
    Renderer.manim: ("KTitle(", ".place(", "MArray(", "MGrid(", "MLinkedList(", "MBinaryTree(", "MGraph(", "Icon("),
}


def uses_kit(code: str, renderer: Renderer) -> bool:
    """True when a past scene is built from the house kit (only those are shown to coders as examples)."""
    return any(m in code for m in KIT_MARKERS.get(renderer, ()))


def prompt_context(spec: SceneSpec) -> str:
    """Examples + pitfalls appended to a coder's task."""
    parts = []
    pits = lessons(spec.renderer)[-15:]
    if pits:
        parts.append("Mistakes previous scenes made (avoid them):\n" + "\n".join(
            f"- {p['error']}" + (f" → {p['note']}" if p.get("note") else "") for p in pits))
    for meta, code in similar(spec, k=2):
        if not uses_kit(code, spec.renderer):
            continue  # pre-kit scenes are long hand-drawn code: showing them would teach the old verbose style
        lang = "python" if spec.renderer == Renderer.manim else "tsx"
        parts.append(f"A past scene that rendered successfully (for patterns only — do not copy its content):\n"
                     f"Description: {meta.description[:400]}\n```{lang}\n{code}\n```")
    return "\n\n".join(parts)


# ---------- reels ----------

def save_reel(job_dir: Path, topic: str) -> Path:
    d = _dir() / "reels" / job_dir.name
    d.mkdir(parents=True, exist_ok=True)
    for name in ("script.json", "plan.json", "results.json", "audio.json"):
        if (job_dir / name).exists():
            shutil.copy(job_dir / name, d / name)
    (d / "topic.txt").write_text(topic + "\n")
    final = job_dir / "final.mp4"
    if final.exists():
        shutil.copy(final, d / "final.mp4")
        _strip(final, d / "strip.png")
    return d


def _strip(video: Path, out: Path, n: int = 5) -> None:
    s = get_settings()
    try:
        dur = float(subprocess.run([s.ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                                   capture_output=True, text=True, check=True).stdout)
        fps = n / dur
        subprocess.run([s.ffmpeg, "-v", "error", "-y", "-i", str(video), "-vf",
                        f"fps={fps:.5f},scale=216:-1,tile={n}x1", "-frames:v", "1", str(out)], check=True, capture_output=True)
    except (subprocess.CalledProcessError, ValueError):
        pass


def import_job(job_dir: Path) -> list[SceneMeta]:
    """Backfill the library from an existing outputs/<job> directory."""
    script = json.loads((job_dir / "script.json").read_text())
    plan = [SceneSpec.model_validate(p) for p in json.loads((job_dir / "plan.json").read_text())]
    results = {r["index"]: r for r in json.loads((job_dir / "results.json").read_text())}
    topic = (job_dir / "topic.txt").read_text().strip() if (job_dir / "topic.txt").exists() else script["title"]
    saved = []
    for spec in plan:
        r = results.get(spec.index)
        if not r or r["fallback"]:
            continue
        code_file = job_dir / f"seg{spec.index}_try{r['attempts']}{SUFFIX[spec.renderer]}"
        if not code_file.exists():
            continue
        seg = script["segments"][spec.index]
        saved.append(save_scene(spec, code_file.read_text(), job_dir / f"seg{spec.index}.mp4", topic=topic,
                                role=seg["role"], narration=seg["narration"], attempts=r["attempts"], source=job_dir.name))
    for err_file in sorted(job_dir.glob("seg*_try*.err")):
        seg_i = int(re.match(r"seg(\d+)_", err_file.name).group(1))
        r = results.get(seg_i)
        if r and not r["fallback"]:
            add_lesson(plan[seg_i].renderer, err_file.read_text())
    save_reel(job_dir, topic)
    return saved
