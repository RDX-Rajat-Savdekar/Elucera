from elucera.assemble.captions import _ts, chunk, to_ass
from elucera.models import WordTiming


def w(word, start, end):
    return WordTiming(word=word, start=start, end=end)


def test_chunk_breaks_on_size_sentence_end_and_pause():
    words = [w("one", 0, 0.2), w("two", 0.2, 0.4), w("three.", 0.4, 0.6), w("four", 0.6, 0.8), w("five", 2.0, 2.2)]
    assert [[x.word for x in c] for c in chunk(words, size=3)] == [["one", "two", "three."], ["four"], ["five"]]


def test_timestamp_format():
    assert _ts(0) == "0:00:00.00"
    assert _ts(61.234) == "0:01:01.23"


def test_ass_has_one_event_per_word_with_highlight():
    words = [w("pick", 0, 0.3), w("a", 0.3, 0.4), w("pivot", 0.4, 0.9)]
    events = [ln for ln in to_ass(words).splitlines() if ln.startswith("Dialogue:")]
    assert len(events) == 3
    assert "\\c&H0066D1FF" in events[2] and "PIVOT" in events[2]
    assert events[0].split(",")[1:3] == ["0:00:00.00", "0:00:00.30"]
