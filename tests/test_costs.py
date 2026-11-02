"""Usage ledger, plan reuse from review-time prefetch, and per-reel cost reports (all offline)."""

import json

import pytest

import elucera.graph as graph
from elucera import cache, costs, usage
from elucera.config import get_settings
from elucera.models import Beat, SceneSpec, Script, SegmentAudio, WordTiming

ROLES = ("hook", "setup", "mechanism", "payoff")


@pytest.fixture(autouse=True)
def tmp_dirs(tmp_path, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "outputs_dir", tmp_path / "out")
    monkeypatch.setattr(s, "cache_dir", tmp_path / "cache")


def script():
    return Script(title="T", idea="I", segments=[{"role": r, "narration": f"{r} words", "visual_directive": "v"} for r in ROLES])


def audio():
    return [SegmentAudio(index=i, wav="x.wav", duration=2.0, words=[WordTiming(word="w", start=0.1, end=0.3)]) for i in range(4)]


def test_usage_follows_work_into_graph_threads(tmp_path):
    """LangGraph runs nodes in worker threads; the job's ledger must still receive their rows."""
    from langgraph.graph import END, START, StateGraph
    from typing import TypedDict

    class S(TypedDict, total=False):
        x: int

    def node(state):
        with usage.purpose("scene0:code"):
            usage.record("muse", "m", input_tokens=10, output_tokens=20)
        return {"x": 1}

    g = StateGraph(S)
    g.add_node("n", node)
    g.add_edge(START, "n")
    g.add_edge("n", END)
    with usage.sink(tmp_path / "job"):
        g.compile().invoke({"x": 0})
    rows = usage.read(tmp_path / "job")
    assert rows and rows[0]["purpose"] == "scene0:code" and rows[0]["output_tokens"] == 20


def test_plan_made_during_review_is_reused_on_approval(monkeypatch):
    calls = []

    def fake_plan(llm, sc, au, preferred=None, note=""):
        calls.append(note)
        return [SceneSpec(index=i, renderer="remotion", duration=2.0, description="d", beats=[Beat(t=0.1, word="w", action="a")]) for i in range(4)]

    monkeypatch.setattr(graph, "plan_scenes", fake_plan)
    monkeypatch.setattr(graph, "MuseClient", lambda **k: None)
    events = []
    emit = lambda type, **d: events.append(type)  # noqa: E731
    graph.make_plan(script(), audio(), "timeline view", None)  # review time
    graph.make_plan(script(), audio(), "timeline view", None, emit)  # approval, unchanged
    assert calls == ["timeline view"] and events == ["plan_cached"]
    graph.make_plan(script(), audio(), "a different note", None, emit)  # note changed → fresh plan
    assert calls == ["timeline view", "a different note"]


def test_cost_report_uses_ledger_and_splits_redo_spend(tmp_path):
    d = get_settings().outputs_dir / "abc123"
    d.mkdir(parents=True)
    (d / "state.json").write_text(json.dumps({"id": "abc123", "topic": "tcp", "status": "done", "created": 100.0}))
    ev = [{"seq": 0, "t": 100.0, "type": "queued"},
          {"seq": 1, "t": 100.0, "type": "stage", "stage": "voice"},
          {"seq": 2, "t": 110.0, "type": "voice", "duration": 60.0, "provider": "gemini"},
          {"seq": 3, "t": 110.0, "type": "stage", "stage": "render"},
          {"seq": 4, "t": 150.0, "type": "scene", "index": 0, "renderer": "remotion", "status": "rendering"},
          {"seq": 5, "t": 160.0, "type": "scene", "index": 0, "renderer": "remotion", "status": "done", "attempt": 1},
          {"seq": 6, "t": 160.0, "type": "stage", "stage": "assemble"},
          {"seq": 7, "t": 170.0, "type": "done", "duration": 60.0},
          {"seq": 8, "t": 900.0, "type": "scene", "index": 0, "renderer": "remotion", "status": "rendering"}]
    (d / "events.jsonl").write_text("\n".join(json.dumps(e) for e in ev))
    (d / "usage.jsonl").write_text("\n".join(json.dumps(r) for r in [
        {"t": 120.0, "provider": "muse", "model": "muse-spark-1.3", "purpose": "scene0:code", "input_tokens": 1_000_000, "output_tokens": 0},
        {"t": 105.0, "provider": "gemini-tts", "model": "g", "purpose": "voice", "input_tokens": 0, "audio_tokens": 1_000_000},
        {"t": 950.0, "provider": "muse", "model": "muse-spark-1.3", "purpose": "scene0:code", "input_tokens": 0, "output_tokens": 1_000_000},
    ]))
    r = costs.job_report(d)
    assert r["measured"] and r["time_to_reel_s"] == 70.0 and r["stages"]["render"] == 50.0
    assert r["cost"]["muse"] == 1.25 and r["cost"]["tts"] == 10.0  # list prices, first run only
    assert r["cost"]["iteration"] == 4.25  # the redo after the first `done`
    assert r["renders"] == 2 and r["cost_per_minute"] == round(r["cost"]["total"], 3)


def test_estimated_report_for_jobs_before_the_ledger():
    d = get_settings().outputs_dir / "old1"
    d.mkdir(parents=True)
    (d / "state.json").write_text(json.dumps({"id": "old1", "topic": "x", "status": "done", "created": 0}))
    (d / "events.jsonl").write_text("\n".join(json.dumps(e) for e in [
        {"t": 0, "type": "voice", "duration": 30.0}, {"t": 60, "type": "done", "duration": 30.0}]))
    (d / "seg0_try1.tsx").write_text("x" * 3200)
    r = costs.job_report(d)
    assert not r["measured"] and r["tokens"]["output_tokens"] > 1000 and r["cost"]["total"] > 0
