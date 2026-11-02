"""Resume, redo → rebake, revert, auto-retry, caching, pitch persistence and chat ownership (no Muse/Gemini calls)."""

import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import elucera.graph as graph
from elucera import api, cache, chats
from elucera.config import get_settings
from elucera.models import Beat, RenderResult, Renderer, SceneSpec, Script, SegmentAudio, WordTiming

ROLES = ("hook", "setup", "mechanism", "payoff")


@pytest.fixture(autouse=True)
def tmp_dirs(tmp_path, monkeypatch):
    s = get_settings()
    for name in ("outputs_dir", "chats_dir", "cache_dir", "library_dir", "analytics_dir"):
        monkeypatch.setattr(s, name, tmp_path / name)
    (tmp_path / "library_dir" / "scenes").mkdir(parents=True)
    monkeypatch.setattr(s, "auto_retry_delay_s", 0.0)
    monkeypatch.setattr(s, "use_library", False)
    monkeypatch.setattr(api, "JOBS", {})
    monkeypatch.setattr(api, "EVENTS", {})


@pytest.fixture
def client():
    return TestClient(api.app)


def script() -> Script:
    return Script(title="T", idea="I", segments=[{"role": r, "narration": f"{r} words", "visual_directive": "v"} for r in ROLES])


def make_job(d: Path, scenes_done=(0, 1, 2, 3), with_audio=True, with_plan=True) -> None:
    """A job dir as the pipeline leaves it, optionally cut short."""
    d.mkdir(parents=True, exist_ok=True)
    (d / "topic.txt").write_text("tcp\n")
    (d / "script.json").write_text(script().model_dump_json())
    if with_audio:
        (d / "audio.json").write_text(json.dumps([SegmentAudio(index=i, wav=d / f"seg{i}.wav", duration=2.0, words=[]).model_dump(mode="json") for i in range(4)]))
    if with_plan:
        (d / "plan.json").write_text(json.dumps([SceneSpec(index=i, renderer="remotion", duration=2.0, description=f"scene {i}",
                                                           beats=[]).model_dump(mode="json") for i in range(4)]))
    for i in scenes_done:
        (d / f"seg{i}.mp4").write_bytes(f"clip{i}".encode())
        graph.save_result(d, RenderResult(index=i, renderer=Renderer.remotion, ok=True, video=d / f"seg{i}.mp4", attempts=1))


def collect():
    events = []
    return events, (lambda type, **data: events.append({"type": type, **data}))


# ---------- resume ----------

def test_resume_point_walks_artifacts(tmp_path):
    d = tmp_path / "j"
    d.mkdir()
    assert graph.resume_point(d) == "script"
    make_job(d, scenes_done=(), with_audio=False, with_plan=False)
    assert graph.resume_point(d) == "voice"
    make_job(d, scenes_done=(), with_plan=False)
    assert graph.resume_point(d) == "plan"
    make_job(d, scenes_done=(0, 2))
    assert graph.resume_point(d) == "render"
    assert [r.index for r in graph.saved_results(d)] == [0, 2]
    make_job(d)
    assert graph.resume_point(d) == "assemble"


def test_resume_only_renders_missing_scenes(tmp_path, monkeypatch):
    d = tmp_path / "j"
    make_job(d, scenes_done=(0, 2))
    built = []

    def fake_build(llm, coder, spec, audio, title, out_dir, **kw):
        built.append(spec.index)
        (out_dir / f"seg{spec.index}.mp4").write_bytes(b"new")
        return RenderResult(index=spec.index, renderer=spec.renderer, ok=True, video=out_dir / f"seg{spec.index}.mp4", attempts=1)

    assembled = {}

    def fake_assemble(d_, audio, results, topic, emit=None):
        assembled["indexes"] = sorted(r.index for r in results)
        (d_ / "final.mp4").write_bytes(b"final")
        return d_ / "final.mp4"

    monkeypatch.setattr(graph, "build_scene", fake_build)
    monkeypatch.setattr(graph, "assemble_job", fake_assemble)
    monkeypatch.setattr(graph, "MuseClient", lambda **k: None)
    events, emit = collect()
    assert graph.resume(d, emit) == d / "final.mp4"
    assert sorted(built) == [1, 3]
    assert assembled["indexes"] == [0, 1, 2, 3]
    assert events[0] == {"type": "resume", "stage": "render", "label": graph.STAGES["render"]}
    assert [e["stage"] for e in events if e["type"] == "stage"][:3] == ["script", "voice", "plan"]


# ---------- redo → rebake ----------

def test_redo_records_change_and_does_not_reassemble(tmp_path, monkeypatch):
    d = tmp_path / "j"
    make_job(d)
    (d / "final.mp4").write_bytes(b"old final")
    seen = {}

    def fake_build(llm, coder, spec, audio, title, out_dir, use_cache=True, **kw):
        seen.update(desc=spec.description, renderer=spec.renderer.value, use_cache=use_cache)
        (out_dir / "seg1.mp4").write_bytes(b"redone")
        return RenderResult(index=1, renderer=spec.renderer, ok=True, video=out_dir / "seg1.mp4", attempts=2)

    monkeypatch.setattr(graph, "build_scene", fake_build)
    monkeypatch.setattr(graph, "MuseClient", lambda **k: None)
    monkeypatch.setattr(graph, "assemble_job", lambda *a, **k: pytest.fail("redo must not reassemble"))
    events, emit = collect()
    graph.retry_scene(d, 1, note="bigger text", renderer="three", emit=emit, description="a spinning globe")
    assert seen == {"desc": "a spinning globe\n\nViewer feedback for this new version (follow it): bigger text",
                    "renderer": "three", "use_cache": False}
    assert (d / "seg1.v1.mp4").read_bytes() == b"clip1" and (d / "seg1.mp4").read_bytes() == b"redone"
    row = graph.history(d, 1)[0]
    assert row["renderer_before"] == "remotion" and row["renderer_after"] == "three"
    assert row["description_before"] == "scene 1" and row["description_edited"] and row["attempts"] == 2
    assert any(e["type"] == "scene_redone" and e["version"] == 2 for e in events)
    # revert brings back the original clip and prompt
    graph.revert_scene(d, 1)
    assert (d / "seg1.mp4").read_bytes() == b"clip1"
    assert json.loads((d / "plan.json").read_text())[1]["description"] == "scene 1"


def test_rebake_endpoint_reassembles(client, monkeypatch):
    from elucera.models import JobState

    d = get_settings().outputs_dir / "abc123"
    make_job(d, scenes_done=(0, 1, 2))
    (d / "state.json").write_text(JobState(id="abc123", topic="tcp", status="done").model_dump_json())
    assert client.post("/jobs/abc123/rebake").status_code == 409  # scene 3 missing
    make_job(d)
    def fake_assemble(d_, audio, results, topic, emit=None):
        (d_ / "final.mp4").write_bytes(b"f")
        return d_ / "final.mp4"

    monkeypatch.setattr(graph, "assemble_job", fake_assemble)
    assert client.post("/jobs/abc123/rebake").status_code == 202
    assert client.get("/jobs/abc123").json()["status"] == "done"
    assert (d / "final.mp4").read_bytes() == b"f"


# ---------- auto-retry once ----------

def test_transient_failure_auto_retries_once_then_reports_resumable(client, monkeypatch):
    calls = []

    def flaky(topic, job_dir, emit, preferred_renderer=None):
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "topic.txt").write_text(topic)
        emit("stage", stage="plan", label="Directing the scenes")
        raise ConnectionError("connection reset by api.meta.ai")

    def resume(d, emit):
        calls.append(d)
        raise ConnectionError("connection reset again")

    monkeypatch.setattr(graph, "run", flaky)
    monkeypatch.setattr(graph, "resume", resume)
    job = client.post("/jobs", json={"topic": "tcp handshake"}).json()
    events = [json.loads(ln) for ln in (get_settings().outputs_dir / job["id"] / "events.jsonl").read_text().splitlines()]
    types = [e["type"] for e in events]
    assert len(calls) == 1 and types.count("auto_retry") == 1
    failed = events[-1]
    assert failed["type"] == "failed" and failed["resumable"] is True and failed["stage"] == "plan"


def test_code_bug_is_not_auto_retried(client, monkeypatch):
    def broken(topic, job_dir, emit, preferred_renderer=None):
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "topic.txt").write_text(topic)
        raise KeyError("segments")

    monkeypatch.setattr(graph, "run", broken)
    monkeypatch.setattr(graph, "resume", lambda d, emit: pytest.fail("should not retry"))
    job = client.post("/jobs", json={"topic": "tcp handshake"}).json()
    assert client.get(f"/jobs/{job['id']}").json()["status"] == "failed"


# ---------- caches ----------

def test_tts_cache_roundtrip(tmp_path):
    wav = tmp_path / "a.wav"
    wav.write_bytes(b"RIFF")
    words = [WordTiming(word="hi", start=0.0, end=0.4)]
    cache.tts_put("hello", wav, 1.5, words, "macos")
    assert cache.tts_get("hello", tmp_path / "b.wav") is None  # fallback voice is never cached
    cache.tts_put("hello", wav, 1.5, words, "gemini")
    dur, got = cache.tts_get("hello", tmp_path / "b.wav")
    assert dur == 1.5 and got == words and (tmp_path / "b.wav").read_bytes() == b"RIFF"
    assert cache.tts_get("hello!", tmp_path / "c.wav") is None


def test_scene_cache_skips_codegen(tmp_path):
    from elucera.agents.coders.base import build_scene

    spec = SceneSpec(index=0, renderer="remotion", duration=2.0, description="packets", beats=[Beat(t=0.1, word="a", action="b")])
    clip = tmp_path / "c.mp4"
    clip.write_bytes(b"cached clip")
    cache.scene_put(spec, clip, "// code", ".tsx")

    class Boom:
        def __getattr__(self, name):
            raise AssertionError("coder must not be called on a cache hit")

    events, emit = collect()
    out = tmp_path / "job"
    out.mkdir()
    audio = SegmentAudio(index=0, wav=tmp_path / "x.wav", duration=2.0, words=[])
    res = build_scene(Boom(), Boom(), spec, audio, "T", out, emit=emit)
    assert res.ok and res.attempts == 0 and (out / "seg0.mp4").read_bytes() == b"cached clip"
    assert events[-1]["cached"] is True


# ---------- approved script, pitches, chats ----------

def test_run_approved_marks_script_step_done(tmp_path, monkeypatch):
    class G:
        def invoke(self, state, config):
            return {"final": tmp_path / "final.mp4"}

    monkeypatch.setattr(graph, "build_approved_graph", lambda: G())
    events, emit = collect()
    graph.run_approved("tcp", tmp_path / "j", script(), emit)
    assert events[0] == {"type": "stage", "stage": "script", "label": "Using your approved script"}
    assert events[1]["type"] == "script" and events[1]["approved"] is True


def test_pitch_exists_immediately_and_is_saved_to_thread(client, monkeypatch):
    monkeypatch.setattr("elucera.agents.script.write_script", lambda llm, topic: script())
    h = {"X-Elucera-User": "browserA"}
    pid = client.post("/pitches", json={"topic": "black holes", "thread_id": "t1"}, headers=h).json()["id"]
    assert client.get(f"/pitches/{pid}").status_code == 200
    t = client.get("/chats/t1", headers=h).json()
    assert [(i["kind"], i["id"]) for i in t["items"]] == [("pitch", pid)]
    # another browser can't see it
    assert client.get("/chats", headers={"X-Elucera-User": "browserB"}).json() == []
    assert client.get("/chats/t1", headers={"X-Elucera-User": "browserB"}).status_code == 404
    assert [x["id"] for x in client.get("/chats", headers=h).json()] == ["t1"]
    # approving turns the pitch item into the job, in place
    monkeypatch.setattr(graph, "run_approved", lambda *a, **k: None)
    job = client.post(f"/pitches/{pid}/approve", json={"thread_id": "t1"}, headers=h).json()
    items = client.get("/chats/t1", headers=h).json()["items"]
    assert [(i["kind"], i["id"]) for i in items] == [("job", job["id"])]
    assert client.delete("/chats/t1", headers={"X-Elucera-User": "browserB"}).status_code == 404
    assert client.delete("/chats/t1", headers=h).status_code == 204
    assert client.get("/chats", headers=h).json() == []


def test_legacy_threads_without_owner_still_load(client):
    (get_settings().chats_dir).mkdir(parents=True, exist_ok=True)
    (get_settings().chats_dir / "old.json").write_text(json.dumps({"id": "old", "title": "x", "updated": 1, "jobs": []}))
    assert client.get("/chats/old", headers={"X-Elucera-User": "anyone"}).json()["items"] == []
    assert chats.list_threads("anyone")[0]["id"] == "old"
