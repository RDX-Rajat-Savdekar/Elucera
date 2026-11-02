"""Key rotation, tested against a fake Gemini (no network)."""

import pytest
from google.genai import errors

from elucera.audio import keys as keymod
from elucera.audio import tts
from elucera.audio.keys import KeyPool


def api_error(code: int, msg: str) -> errors.APIError:
    return errors.APIError(code, {"error": {"code": code, "message": msg, "status": "X"}})


DAILY = api_error(429, "Quota exceeded ... requests per day limit exceeded on Free Tier. Please retry in 7h51m34.2s.")
MINUTE = api_error(429, "Quota exceeded ... requests per minute. Please retry in 2.5s.")
INVALID = api_error(400, "API key not valid. Please pass a valid API key. API_KEY_INVALID")


@pytest.fixture
def pool(tmp_path, monkeypatch):
    p = KeyPool(["k-one", "k-two", "k-three"], tmp_path / "state.json")
    monkeypatch.setattr(keymod, "_pool", p)
    monkeypatch.setattr(tts.time, "sleep", lambda s: None)
    return p


def fake_gemini(monkeypatch, behaviour):
    calls = []

    def _request(key, text, voice):
        calls.append(key)
        outcome = behaviour.get(key)
        if isinstance(outcome, list):
            outcome = outcome.pop(0) if outcome else None
        if isinstance(outcome, Exception):
            raise outcome
        return b"\x00\x00" * 2400  # 0.1s of silence

    monkeypatch.setattr(tts, "_request", _request)
    return calls


def test_daily_quota_rotates_and_persists(pool, tmp_path, monkeypatch):
    calls = fake_gemini(monkeypatch, {"k-one": DAILY})
    assert tts.synthesize_gemini("hi", tmp_path / "a.wav") == pytest.approx(0.1)
    assert calls == ["k-one", "k-two"]
    # k-two is now sticky; k-one stays parked, also after a "restart"
    calls.clear()
    tts.synthesize_gemini("hi", tmp_path / "b.wav")
    assert calls == ["k-two"]
    reloaded = KeyPool(pool.keys, pool.state_file)
    assert reloaded.available()[0] == "k-two" and "k-one" not in reloaded.available()


def test_invalid_key_is_skipped_forever(pool, tmp_path, monkeypatch):
    calls = fake_gemini(monkeypatch, {"k-one": INVALID})
    tts.synthesize_gemini("hi", tmp_path / "a.wav")
    assert calls == ["k-one", "k-two"]
    assert "k-one" not in pool.available(now=10**12)


def test_minute_limit_tries_next_key_without_parking(pool, tmp_path, monkeypatch):
    calls = fake_gemini(monkeypatch, {"k-one": [MINUTE]})
    tts.synthesize_gemini("hi", tmp_path / "a.wav")
    assert calls == ["k-one", "k-two"]
    assert "k-one" in pool.available()


def test_all_exhausted_raises_then_falls_back_to_macos_voice(pool, tmp_path, monkeypatch):
    fake_gemini(monkeypatch, {k: DAILY for k in pool.keys})
    with pytest.raises(tts.QuotaExhausted):
        tts.synthesize_gemini("hi", tmp_path / "a.wav")
    monkeypatch.setattr(tts, "synthesize_say", lambda text, out: 1.23)
    assert tts.synthesize("hi", tmp_path / "b.wav") == 1.23


def test_state_file_never_contains_keys(pool, tmp_path, monkeypatch):
    fake_gemini(monkeypatch, {"k-one": DAILY})
    tts.synthesize_gemini("hi", tmp_path / "a.wav")
    text = pool.state_file.read_text()
    assert "k-one" not in text and "k-two" not in text
