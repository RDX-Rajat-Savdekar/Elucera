from itertools import pairwise

from elucera.audio.align import align_to_script
from elucera.graph import offset_words
from elucera.models import SegmentAudio, WordTiming


def test_matches_and_interpolates_unrecognised_words():
    heard = [WordTiming(word="Quick", start=0.0, end=0.4), WordTiming(word="pivot", start=1.0, end=1.4)]
    out = align_to_script("Quick sort's pivot!", heard, duration=2.0)
    assert [x.word for x in out] == ["Quick", "sort's", "pivot!"]
    assert out[0].start == 0.0 and out[2].start == 1.0
    assert 0.4 <= out[1].start < out[1].end <= 1.0


def test_trailing_words_spread_to_duration():
    out = align_to_script("a b c", [WordTiming(word="a", start=0, end=0.5)], duration=1.5)
    assert out[-1].end == 1.5
    assert all(x.start <= y.start for x, y in pairwise(out))


def test_offset_words_shifts_by_previous_durations(tmp_path):
    def seg(i, d):
        return SegmentAudio(index=i, wav=tmp_path / "x.wav", duration=d, words=[WordTiming(word="w", start=0.5, end=0.7)])
    out = offset_words([seg(0, 2.0), seg(1, 3.0)])
    assert [x.start for x in out] == [0.5, 2.5]


def test_segment_cuts_split_in_the_pause_between_segments():
    from elucera.audio.align import segment_cuts

    ws = [WordTiming(word=x, start=s, end=e) for x, s, e in [("a", 0, 0.4), ("b", 0.5, 1.0), ("c", 1.6, 2.0), ("d", 2.2, 2.5)]]
    assert segment_cuts(ws, [2, 1, 1]) == [1.3, 2.1]


def test_heard_preamble_does_not_shift_narration_anchors():
    # TTS sometimes speaks the director-style preamble before the narration.
    # align_to_script must anchor narration words to their real (later) position:
    # longest-match wins, so a preamble fragment ("after each …") loses to the
    # full narration run that follows it.
    heard = [WordTiming(word=w, start=i * 0.4, end=i * 0.4 + 0.3) for i, w in enumerate(
        ["leave", "a", "short", "beat", "after", "each", "important", "definition",
         "after", "each", "test", "today"])]
    out = align_to_script("after each test today", heard, duration=6.0)
    assert [x.word for x in out] == ["after", "each", "test", "today"]
    assert out[0].start >= 3.0, f"first narration word anchored into the preamble: {out[0]}"


def test_split_wav_roundtrip(tmp_path):
    import wave

    from elucera.audio.tts import concat_wavs, split_wav

    src = tmp_path / "a.wav"
    with wave.open(str(src), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(bytes(range(256)) * 375)  # 2s
    outs = [tmp_path / f"{i}.wav" for i in range(3)]
    split_wav(src, [0.5, 1.25], outs)
    def read(p, n=None):
        with wave.open(str(p)) as r:
            return r.getnframes() if n is None else r.readframes(n)

    lens = [read(o) for o in outs]
    assert lens == [12000, 18000, 18000]
    concat_wavs(outs, tmp_path / "b.wav")
    assert read(tmp_path / "b.wav", 48000) == read(src, 48000)
