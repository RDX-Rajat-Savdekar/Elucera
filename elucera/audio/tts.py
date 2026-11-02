import logging
import re
import subprocess
import tempfile
import time
import wave
from pathlib import Path

from google import genai
from google.genai import errors, types

from elucera.audio.keys import get_pool, next_pacific_midnight
from elucera.config import get_settings

log = logging.getLogger(__name__)

SAMPLE_RATE = 24_000
MAX_WAIT_S = 90  # longer waits mean a daily quota, not a per-minute one
STYLE = "Say this energetically and clearly, like a punchy tech explainer on Instagram Reels:"


def _wait_seconds(msg: str) -> float | None:
    """The wait Gemini asks for in a 429 ("retry in 7h51m34s" or retryDelay), if any."""
    m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s|'retryDelay': '(\d+)s'", msg)
    if not m:
        return None
    if m.group(4):
        return float(m.group(4)) + 1
    return int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3)) + 1


def _is_bad_key(e: errors.APIError) -> bool:
    return e.code in (401, 403) or (e.code == 400 and re.search(r"API_KEY_INVALID|API key not valid|expired", str(e)) is not None)


class QuotaExhausted(RuntimeError):
    pass


def synthesize(text: str, out: Path, voice: str | None = None, info: dict | None = None) -> float:
    """Gemini TTS, falling back to the macOS voice when the Gemini quota is used up.

    If `info` is given it is filled with {"provider": "gemini" | "macos", "note": ...}.
    """
    info = info if info is not None else {}
    try:
        dur = synthesize_gemini(text, out, voice)
        info.update(provider="gemini", note="")
        return dur
    except QuotaExhausted as e:
        if not get_settings().fallback_voice:
            raise
        log.warning("Gemini TTS quota exhausted; using macOS voice %r (%s)", get_settings().fallback_voice, e)
        info.update(provider="macos", note=f"All Gemini keys are out of quota; used the {get_settings().fallback_voice} voice instead.")
        dur = synthesize_say(text, out)
        from elucera import usage
        usage.record("macos-say", get_settings().fallback_voice, audio_seconds=round(dur, 2))
        return dur


def synthesize_say(text: str, out: Path) -> float:
    """Offline fallback: macOS `say`, converted to the same 24kHz mono 16-bit wav format."""
    s = get_settings()
    with tempfile.TemporaryDirectory() as tmp:
        aiff = Path(tmp) / "say.aiff"
        subprocess.run(["say", "-v", s.fallback_voice, "-r", "185", "-o", str(aiff), text], check=True, capture_output=True)
        subprocess.run([s.ffmpeg, "-v", "error", "-y", "-i", str(aiff), "-ar", str(SAMPLE_RATE), "-ac", "1",
                        "-sample_fmt", "s16", str(out)], check=True, capture_output=True)
    with wave.open(str(out), "rb") as r:
        return r.getnframes() / r.getframerate()


def _request(key: str, text: str, voice: str) -> bytes:
    """One Gemini TTS call; returns raw 24kHz 16-bit mono PCM."""
    s = get_settings()
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))
        ),
    )
    client = genai.Client(api_key=key)
    resp = client.models.generate_content(model=s.gemini_tts_model, contents=f"{STYLE} {text}", config=config)
    return resp.candidates[0].content.parts[0].inline_data.data


def synthesize_gemini(text: str, out: Path, voice: str | None = None, rounds: int = 3) -> float:
    """Synthesize `text` to a 24kHz mono wav at `out`, rotating through the key pool. Returns duration in seconds.

    Daily-quota and invalid keys are parked and skipped; a per-minute limit moves on to the next key, and we only
    sleep when every remaining key is minute-limited.
    """
    voice = voice or get_settings().gemini_tts_voice
    started = time.time()
    pool = get_pool()
    pcm = None
    for _ in range(rounds):
        keys = pool.available()
        if not keys:
            break
        minute_waits = []
        for key in keys:
            try:
                pcm = _request(key, text, voice)
                pool.good(key)
                break
            except errors.APIError as e:
                msg = str(e)
                if e.code == 429:
                    wait = _wait_seconds(msg)
                    if "per day" in msg or (wait or 0) > MAX_WAIT_S:
                        until = time.time() + wait if wait else next_pacific_midnight()
                        pool.exhausted(key, until, "daily quota")
                        log.warning("Gemini key …%s hit its daily quota; rotating", key[-4:])
                    else:
                        minute_waits.append(wait or 20)
                        log.info("Gemini key …%s is rate-limited for %.0fs; trying next key", key[-4:], wait or 20)
                elif _is_bad_key(e):
                    pool.invalid(key, f"rejected ({e.code})")
                    log.warning("Gemini key …%s was rejected (%s); skipping it", key[-4:], e.code)
                else:
                    raise
        if pcm is not None:
            break
        if minute_waits:
            time.sleep(min(min(minute_waits), MAX_WAIT_S))
    if pcm is None:
        raise QuotaExhausted(f"all {len(pool.keys)} Gemini keys are rate-limited or exhausted")
    from elucera import usage
    seconds = len(pcm) / 2 / SAMPLE_RATE
    usage.record("gemini-tts", get_settings().gemini_tts_model, input_tokens=round(len(text) / 4),
                 audio_tokens=round(seconds * 25), audio_seconds=round(seconds, 2), seconds=round(time.time() - started, 2))
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    return len(pcm) / 2 / SAMPLE_RATE


def split_wav(src: Path, cuts: list[float], outs: list[Path]) -> None:
    """Split `src` at the given times (seconds) into len(cuts) + 1 files."""
    with wave.open(str(src), "rb") as r:
        params, frames = r.getparams(), r.readframes(r.getnframes())
    width = params.sampwidth * params.nchannels
    edges = [0, *(round(c * params.framerate) for c in cuts), len(frames) // width]
    for out, a, b in zip(outs, edges, edges[1:]):
        with wave.open(str(out), "wb") as w:
            w.setparams(params)
            w.writeframes(frames[a * width : b * width])


def concat_wavs(wavs: list[Path], out: Path) -> None:
    """Concatenate same-format wavs (all produced by `synthesize`)."""
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        for p in wavs:
            with wave.open(str(p), "rb") as r:
                w.writeframes(r.readframes(r.getnframes()))
