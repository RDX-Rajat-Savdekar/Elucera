"""Content-addressed cache so identical work is never paid for twice.

    cache/tts/<key>/     voice.wav + words.json   (key = voice text + voice + model)
    cache/scenes/<key>/  clip.mp4 + scene code     (key = renderer + description + beats + duration)

A re-approved script with unchanged narration skips Gemini TTS and Whisper; a resumed or re-run job skips
code generation and rendering for any scene whose spec is unchanged.
"""

import hashlib
import json
import shutil
from pathlib import Path

from elucera.config import get_settings
from elucera.models import SceneSpec, WordTiming


def _key(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()[:24]


def _root(kind: str) -> Path:
    return get_settings().cache_dir / kind


def _on() -> bool:
    return get_settings().use_cache


# ---------- voiceover ----------

def tts_key(text: str) -> str:
    s = get_settings()
    return _key(text, s.gemini_tts_voice, s.gemini_tts_model)


def tts_get(text: str, out: Path) -> tuple[float, list[WordTiming]] | None:
    """Copy a cached voiceover to `out`; returns (duration, aligned words) or None."""
    d = _root("tts") / tts_key(text)
    if not _on() or not (d / "voice.wav").exists() or not (d / "words.json").exists():
        return None
    meta = json.loads((d / "words.json").read_text())
    shutil.copy(d / "voice.wav", out)
    return meta["duration"], [WordTiming.model_validate(w) for w in meta["words"]]


def tts_put(text: str, wav: Path, duration: float, words: list[WordTiming], provider: str) -> None:
    if not _on() or provider != "gemini":  # never cache the fallback voice: a later run should get the real one
        return
    d = _root("tts") / tts_key(text)
    d.mkdir(parents=True, exist_ok=True)
    shutil.copy(wav, d / "voice.wav")
    (d / "words.json").write_text(json.dumps({"duration": duration, "words": [w.model_dump() for w in words]}))


# ---------- rendered scenes ----------

def scene_key(spec: SceneSpec) -> str:
    beats = json.dumps([b.model_dump() for b in spec.beats], sort_keys=True)
    return _key(spec.renderer.value, spec.description.strip(), beats, f"{spec.duration:.1f}")


def scene_get(spec: SceneSpec, out: Path) -> str | None:
    """Copy a cached clip for an identical spec to `out`; returns its code or None."""
    d = _root("scenes") / scene_key(spec)
    if not _on() or not (d / "clip.mp4").exists():
        return None
    shutil.copy(d / "clip.mp4", out)
    code = next(iter(d.glob("scene.*")), None)
    return code.read_text() if code else ""


def scene_put(spec: SceneSpec, clip: Path, code: str, suffix: str) -> None:
    if not _on() or not clip.exists():
        return
    d = _root("scenes") / scene_key(spec)
    d.mkdir(parents=True, exist_ok=True)
    shutil.copy(clip, d / "clip.mp4")
    (d / f"scene{suffix}").write_text(code)


# ---------- scene plans (made during storyboard review, reused on approval) ----------

def plan_key(script, audio, note: str, preferred: str | None) -> str:
    timings = json.dumps([[a.duration, [[w.word, w.start, w.end] for w in a.words]] for a in audio])
    return _key(script.model_dump_json(), timings, (note or "").strip(), preferred or "")


def plan_get(script, audio, note: str, preferred: str | None) -> list[SceneSpec] | None:
    f = _root("plans") / f"{plan_key(script, audio, note, preferred)}.json"
    if not _on() or not f.exists():
        return None
    return [SceneSpec.model_validate(s) for s in json.loads(f.read_text())]


def plan_put(script, audio, note: str, preferred: str | None, specs: list[SceneSpec]) -> None:
    if not _on():
        return
    d = _root("plans")
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{plan_key(script, audio, note, preferred)}.json").write_text(json.dumps([s.model_dump(mode="json") for s in specs]))
