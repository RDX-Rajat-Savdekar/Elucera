import json
import logging
import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from elucera import cache, library, usage
from elucera.config import get_settings
from elucera.llm import LLMClient, extract_block
from elucera.models import RenderResult, SceneSpec, Segment, SegmentAudio
from elucera.prompts import load
from elucera.render.base import Check, Renderer
from elucera.render.fallback import render_fallback
from elucera.render.player_bundle import build_player_bundle

log = logging.getLogger(__name__)


@dataclass
class Coder:
    """Writes scene code for one renderer and repairs it from error messages."""

    system: str
    renderer: Renderer

    def task(self, spec: SceneSpec, audio: SegmentAudio) -> str:
        words = " ".join(f"[{w.start:.2f}]{w.word}" for w in audio.words)
        return (
            f"Target duration: {spec.duration:.2f}s ({round(spec.duration * 30)} frames at 30fps).\n\n"
            f"Scene description:\n{spec.description}\n\n"
            f"Beats (seconds from scene start):\n{json.dumps([b.model_dump() for b in spec.beats], indent=1)}\n\n"
            f"Narration word timings: {words}"
        ) + (f"\n\n{library.prompt_context(spec)}" if get_settings().use_library else "")

    def generate(self, llm: LLMClient, spec: SceneSpec, audio: SegmentAudio) -> str:
        return extract_block(llm.complete(self.system, self.task(spec, audio)))

    def fix(self, llm: LLMClient, spec: SceneSpec, audio: SegmentAudio, code: str, error: str) -> str:
        user = f"{self.task(spec, audio)}\n\n{load('fix')}\n\nCode:\n```\n{code}\n```\n\nError:\n```\n{error[-3000:]}\n```"
        return extract_block(llm.complete(self.system, user))


def _summary(error: str) -> str:
    """One readable line for the UI: the most telling line of an error."""
    lines = [ln.strip() for ln in error.strip().splitlines() if ln.strip()]
    for ln in reversed(lines):
        if re.search(r"Error|error TS|Banned|not allowed|timed out|failed", ln):
            return ln[:240]
    return (lines[-1] if lines else "unknown error")[:240]


def _player(spec: SceneSpec, out_dir: Path, code: str | None = None) -> bool:
    """Best-effort interactive preview bundle for 3D scenes; never fails the scene."""
    if spec.renderer.value != "three":
        return False
    seg_tsx = out_dir / f"seg{spec.index}.tsx"
    if code:
        seg_tsx.write_text(code)
    if not seg_tsx.exists():
        return False
    try:
        res = build_player_bundle(seg_tsx, spec.duration, out_dir / f"seg{spec.index}.player.js")
    except Exception as e:  # noqa: BLE001
        log.warning("seg%d: no interactive preview: %s", spec.index, e)
        return False
    if not res.ok:
        log.warning("seg%d: no interactive preview: %s", spec.index, res.error)
    return res.ok


def build_scene(llm: LLMClient, coder: Coder, spec: SceneSpec, audio: SegmentAudio, title: str, out_dir: Path,
                topic: str = "", segment: Segment | None = None, emit: Callable[..., None] | None = None,
                use_cache: bool = True) -> RenderResult:
    """Generate → validate → render, feeding errors back to the coder; fall back to a template card.

    Every step is reported via `emit("scene", ...)`. Successes are saved to the asset library, and errors the loop
    got past become lessons for future runs.
    """
    emit = emit or (lambda *a, **k: None)
    i, r = spec.index, spec.renderer.value
    out = out_dir / f"seg{spec.index}.mp4"
    code, err = "", ""  # last code that ran through validate/render, and its error
    llm_err = ""  # last LLM/network failure (never fed to the fixer as if it were a code error)
    errors: list[str] = []
    attempts = get_settings().max_render_attempts
    if use_cache:
        cached = cache.scene_get(spec, out)
        if cached is not None:
            player = _player(spec, out_dir, cached)
            emit("scene", index=i, renderer=r, status="done", attempt=0, max_attempts=attempts, player=player, cached=True)
            return RenderResult(index=spec.index, renderer=spec.renderer, ok=True, video=out, code=cached, attempts=0)
    for attempt in range(1, attempts + 1):
        emit("scene", index=i, renderer=r, status="fixing" if code else "coding", attempt=attempt, max_attempts=attempts)
        try:
            with usage.purpose(f"scene{i}:{'fix' if code else 'code'}"):
                code = coder.fix(llm, spec, audio, code, err) if code else coder.generate(llm, spec, audio)
        except Exception as e:  # LLM/network failure: next attempt retries the same step (code + err unchanged)
            llm_err = f"LLM call failed: {e}"
            log.warning("seg%d attempt %d: %s", spec.index, attempt, llm_err)
            emit("scene", index=i, renderer=r, status="error", attempt=attempt, max_attempts=attempts,
                 stage="writing code", error=_summary(llm_err), detail=llm_err[-1500:])
            continue
        (out_dir / f"seg{spec.index}_try{attempt}{coder.renderer.suffix}").write_text(code)
        emit("scene", index=i, renderer=r, status="checking", attempt=attempt, max_attempts=attempts)
        check: Check = coder.renderer.validate(code)
        stage = "checking code"
        if check.ok:
            emit("scene", index=i, renderer=r, status="rendering", attempt=attempt, max_attempts=attempts)
            check = coder.renderer.render(code, spec.duration, out)
            stage = "rendering"
        if check.ok:
            if get_settings().use_library:
                for e in errors:
                    library.add_lesson(spec.renderer, e)
                library.save_scene(spec, code, out, topic=topic or title, role=segment.role if segment else "",
                                   narration=segment.narration if segment else "", attempts=attempt, source=out_dir.name)
            cache.scene_put(spec, out, code, coder.renderer.suffix)
            player = _player(spec, out_dir)
            emit("scene", index=i, renderer=r, status="done", attempt=attempt, max_attempts=attempts, player=player)
            return RenderResult(index=spec.index, renderer=spec.renderer, ok=True, video=out, code=code, attempts=attempt)
        err = check.error
        errors.append(err)
        (out_dir / f"seg{spec.index}_try{attempt}.err").write_text(err)
        log.warning("seg%d attempt %d failed: %s", spec.index, attempt, err.splitlines()[-1] if err else "")
        emit("scene", index=i, renderer=r, status="error", attempt=attempt, max_attempts=attempts,
             stage=stage, error=_summary(err), detail=err[-1500:])

    err = err or llm_err
    log.warning("seg%d: using fallback card", spec.index)
    emit("scene", index=i, renderer=r, status="fallback_rendering", attempt=attempts, max_attempts=attempts)
    fb = render_fallback(title, audio.words, spec.duration, out)
    if not fb.ok:
        emit("scene", index=i, renderer=r, status="failed", error=_summary(fb.error), detail=fb.error[-1500:])
        raise RuntimeError(f"fallback render failed for segment {spec.index}: {fb.error}")
    emit("scene", index=i, renderer=r, status="fallback", attempt=attempts, max_attempts=attempts,
         error=_summary(err) if err else "", detail=err[-1500:] if err else "")
    return RenderResult(index=spec.index, renderer=spec.renderer, ok=True, video=out, code=code, attempts=attempts, error=err, fallback=True)
