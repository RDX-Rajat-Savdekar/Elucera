import re
import wave
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

import numpy as np

from elucera.config import get_settings
from elucera.models import WordTiming


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


@lru_cache
def _model():
    from faster_whisper import WhisperModel

    return WhisperModel(get_settings().whisper_model, device="cpu", compute_type="int8")


def _load_16k(wav: Path) -> np.ndarray:
    """Read a 16-bit mono wav as float32 at 16kHz (what Whisper expects), without PyAV."""
    with wave.open(str(wav), "rb") as r:
        sr = r.getframerate()
        pcm = np.frombuffer(r.readframes(r.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    n = int(len(pcm) * 16000 / sr)
    return np.interp(np.linspace(0, len(pcm) - 1, n), np.arange(len(pcm)), pcm).astype(np.float32)


def transcribe_words(wav: Path) -> list[WordTiming]:
    segments, _ = _model().transcribe(_load_16k(wav), word_timestamps=True, language="en", vad_filter=False)
    return [WordTiming(word=w.word.strip(), start=w.start, end=w.end) for s in segments for w in (s.words or [])]


def align_to_script(script_text: str, heard: list[WordTiming], duration: float) -> list[WordTiming]:
    """Give every word of the known script a timing, using recognized words as anchors.

    Captions show the script's spelling; unmatched words are interpolated between neighbouring anchors.
    """
    words = script_text.split()
    if not words:
        return []
    times: list[tuple[float, float] | None] = [None] * len(words)
    sm = SequenceMatcher(a=[_norm(w) for w in words], b=[_norm(h.word) for h in heard], autojunk=False)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            times[a + k] = (heard[b + k].start, heard[b + k].end)

    # Fill gaps by spreading unmatched runs evenly between known anchors.
    i = 0
    while i < len(words):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(words) and times[j] is None:
            j += 1
        lo = times[i - 1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(words) else duration
        step = max(hi - lo, 0.0) / (j - i)
        for k in range(i, j):
            times[k] = (lo + step * (k - i), lo + step * (k - i + 1))
        i = j

    out: list[WordTiming] = []
    for w, (start, end) in zip(words, times):
        start = max(start, out[-1].start if out else 0.0)  # keep monotonic
        out.append(WordTiming(word=w, start=round(start, 3), end=round(max(end, start), 3)))
    return out


def align(wav: Path, script_text: str, duration: float) -> list[WordTiming]:
    return align_to_script(script_text, transcribe_words(wav), duration)


def segment_cuts(words: list[WordTiming], counts: list[int]) -> list[float]:
    """Cut points between consecutive segments: the middle of the pause after each segment's last word."""
    cuts, k = [], 0
    for n in counts[:-1]:
        k += n
        cuts.append(round((words[k - 1].end + words[k].start) / 2, 3))
    return cuts
