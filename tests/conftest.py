"""Safety net for the whole suite: no test may reach Muse or Gemini, or write the real cache."""

import pytest

from elucera.config import get_settings


@pytest.fixture(autouse=True)
def no_network_models(tmp_path_factory, monkeypatch):
    def refuse(*a, **k):
        raise AssertionError("tests must not call real Muse/Gemini; fake the step instead")

    monkeypatch.setattr("elucera.llm.MuseClient.complete", refuse)
    monkeypatch.setattr("elucera.audio.tts._request", refuse)
    s = get_settings()
    monkeypatch.setattr(s, "prefetch_on_pitch", False)
    monkeypatch.setattr(s, "cache_dir", tmp_path_factory.mktemp("cache"))
