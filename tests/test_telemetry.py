"""Telemetry endpoint + aggregation tests (no pipeline, no network)."""

from fastapi.testclient import TestClient

from elucera import api, telemetry
from elucera.config import get_settings


def _client(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "analytics_dir", tmp_path / "analytics")
    monkeypatch.setattr(api, "JOBS", {})
    monkeypatch.setattr(api, "EVENTS", {})
    return TestClient(api.app)


def test_telemetry_event_roundtrip(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.post("/telemetry/event", json={"event": "demo_view", "props": {"route": "#/"}}).status_code == 204
    assert c.post("/telemetry/event", json={"event": "pitch_submit", "props": {"len": 42}}).status_code == 204
    # bad names are dropped but still 204 (beacon must never break the UI)
    assert c.post("/telemetry/event", json={"event": "!!!", "props": {}}).status_code == 204
    s = c.get("/analytics/telemetry?days=14").json()
    assert s["recent"] == 2
    assert s["funnel"]["demo_view"] == 1
    assert s["funnel"]["pitch_submit"] == 1
    assert "demo_view" in s["by_event"]


def test_telemetry_beacon_uid_query(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    blob = '{"event": "page_view", "props": {"view": "home"}}'
    r = c.post("/telemetry/event?uid=abc123", content=blob, headers={"Content-Type": "application/json"})
    assert r.status_code == 204
    s = c.get("/analytics/telemetry?days=14").json()
    assert s["funnel"]["page_view"] == 1
    assert s["unique_browsers"] == 1


def test_telemetry_props_truncated(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    c.post("/telemetry/event", json={"event": "reel_play", "props": {"title": "x" * 500, "n": 3}})
    row = telemetry._rows()[-1]
    assert len(row["props"]["title"]) <= 200
    assert row["props"]["n"] == 3


def test_server_funnel_events_recorded(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    monkeypatch.setattr(get_settings(), "outputs_dir", tmp_path / "outputs")
    c.post("/pitches", json={"topic": "how does gps work", "target_length": "standard"})
    s = c.get("/analytics/telemetry?days=14").json()
    assert s["funnel"]["pitch_submit"] >= 1
