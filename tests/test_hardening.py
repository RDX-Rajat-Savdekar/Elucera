"""Regression tests for the code-review fixes: job claiming, auth, chat ownership, sandbox gates, voice fallback,
scene-loop retries, cache keys and clip/audio pairing. No Muse/Gemini calls, no renderers."""

import json
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import elucera.graph as graph
from elucera import api, cache, chats, telemetry
from elucera.agents.coders.base import Coder, build_scene
from elucera.audio import tts
from elucera.config import get_settings
from elucera.models import JobState, JobStatus, Renderer, RenderResult, SceneSpec, Script, SegmentAudio
from elucera.render.base import Check
from elucera.render.manim_renderer import ManimRenderer
from elucera.render.seek_renderer import SeekRenderer


@pytest.fixture(autouse=True)
def tmp_dirs(tmp_path, monkeypatch):
    s = get_settings()
    for name in ("outputs_dir", "chats_dir", "library_dir", "analytics_dir"):
        monkeypatch.setattr(s, name, tmp_path / name)
    monkeypatch.setattr(s, "use_library", False)
    monkeypatch.setattr(api, "JOBS", {})
    monkeypatch.setattr(api, "EVENTS", {})


@pytest.fixture
def client():
    return TestClient(api.app)


def _job(status=JobStatus.done) -> JobState:
    job = JobState(id="abc123", topic="t", status=status, created=0.0)
    api._persist(job)
    return job


# ---------- API: claiming, eviction, idempotent approval ----------

def test_second_claim_on_a_running_job_is_rejected():
    _job()
    job, prev = api._claim("abc123")
    assert prev == JobStatus.done and job.status == JobStatus.running
    with pytest.raises(HTTPException) as e:
        api._claim("abc123")
    assert e.value.status_code == 409
    api._release(job, prev)
    assert "abc123" not in api.JOBS and api._load("abc123").status == JobStatus.done
    api._claim("abc123")  # free again


def test_finished_jobs_are_evicted_from_memory(client, monkeypatch):
    monkeypatch.setattr(graph, "run", lambda topic, d, emit, preferred_renderer=None: None)
    job = client.post("/jobs", json={"topic": "dna"}).json()
    assert job["id"] not in api.JOBS and job["id"] not in api.EVENTS
    assert client.get(f"/jobs/{job['id']}").json()["status"] == "done"


def test_rejected_rebake_releases_the_job(client):
    _job()
    assert client.post("/jobs/abc123/rebake").status_code == 409  # no scenes yet
    assert "abc123" not in api.JOBS and api._load("abc123").status == JobStatus.done


def test_approving_a_pitch_twice_starts_one_job(client, monkeypatch):
    pid = "p1"
    d = get_settings().outputs_dir / "pitches" / pid
    d.mkdir(parents=True)
    script = Script(title="T", idea="I", segments=[{"role": r, "narration": "n", "visual_directive": "v"}
                                                   for r in ("hook", "setup", "mechanism", "payoff")])
    (d / "pitch.json").write_text(json.dumps({"id": pid, "topic": "t", "status": "ready", "renderer": None,
                                              "note": "", "script": script.model_dump()}))
    runs = []
    monkeypatch.setattr(graph, "run_approved", lambda *a, **k: runs.append(1))
    first = client.post(f"/pitches/{pid}/approve", json={}).json()
    second = client.post(f"/pitches/{pid}/approve", json={}).json()
    assert first["id"] == second["id"] and len(runs) == 1


# ---------- API: auth + player isolation ----------

def test_api_token_required_when_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "api_token", "s3cret")
    assert client.get("/jobs/nope").status_code == 401
    assert client.get("/jobs/nope", headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.get("/jobs/nope", headers={"Authorization": "Bearer s3cret"}).status_code == 404
    r = client.get("/jobs/nope?token=s3cret")
    assert r.status_code == 404 and r.cookies.get(api.AUTH_COOKIE) == "s3cret"
    assert client.get("/jobs/nope").status_code == 404  # cookie from the previous response
    # player bundles stay reachable for the sandboxed (cookie-less) iframe
    assert TestClient(api.app).get("/jobs/abc123/scenes/0/player.js").status_code == 404


def test_player_page_is_sandboxed(client):
    _job()
    (get_settings().outputs_dir / "abc123" / "seg0.player.js").write_text("export {}")
    page = client.get("/jobs/abc123/scenes/0/player")
    assert page.headers["content-security-policy"] == "sandbox allow-scripts"
    js = client.get("/jobs/abc123/scenes/0/player.js")
    assert js.headers["access-control-allow-origin"] == "*"
    assert 'sandbox="allow-scripts"' in (Path(__file__).parent.parent / "web/app.js").read_text()


def test_oversized_beacon_is_ignored(client):
    big = json.dumps({"event": "page_view", "props": {"x": "y" * 20_000}})
    assert client.post("/telemetry/event", content=big).status_code == 204
    assert telemetry.summary()["total"] == 0


def test_telemetry_log_rotates(monkeypatch):
    monkeypatch.setattr(get_settings(), "telemetry_max_bytes", 200)
    for _ in range(10):
        telemetry.record("page_view", {"path": "/" * 50})
    d = get_settings().analytics_dir
    assert (d / "telemetry.jsonl.1").exists() and (d / "telemetry.jsonl").stat().st_size < 400


# ---------- chats: ownership ----------

def test_owned_threads_are_hidden_without_the_owner(client):
    a = {"X-Elucera-User": "browserA"}
    t = client.post("/chats", json={"title": "mine"}, headers=a).json()
    assert client.get("/chats").json() == []  # no header no longer means "see everything"
    assert client.get(f"/chats/{t['id']}").status_code == 404
    assert client.delete(f"/chats/{t['id']}").status_code == 404
    assert client.post(f"/chats/{t['id']}/jobs", json={"job_id": "abc123"},
                       headers={"X-Elucera-User": "browserB"}).status_code == 404
    assert client.post(f"/chats/{t['id']}/jobs", json={"job_id": "abc123"}, headers=a).status_code == 201


def test_thread_job_ids_must_be_plain_ids(client):
    t = client.post("/chats", json={"title": "x"}).json()
    assert client.post(f"/chats/{t['id']}/jobs", json={"job_id": "../../etc"}).status_code == 422
    with pytest.raises(ValueError):
        chats.attach(t["id"], "../x")
    assert chats.job_summary("../x") is None


# ---------- sandbox gates ----------

SEEK = ('<html><body><svg width="1080" height="1920"></svg>{extra}<script>window.__seek = (t) => {{}};'
        '</script></body></html>')


@pytest.mark.parametrize("extra", [
    '<iframe src="../../.env"></iframe>', '<img src="secret.png">', '<img src="file:///etc/hosts">',
    "<script>navigator.sendBeacon('x')</script>", "<script>new Image().src='http://x'</script>",
    '<div style="background:url(http://x/y.png)"></div>', '<link rel="stylesheet" href="https://x/y.css">',
])
def test_seek_rejects_local_files_and_network(extra):
    assert not SeekRenderer().validate(SEEK.format(extra=extra)).ok


def test_seek_allows_fragments_and_data_uris():
    extra = '<svg><use href="#a"/></svg><img src="data:image/png;base64,AAAA">'
    assert SeekRenderer().validate(SEEK.format(extra=extra)).ok


@pytest.mark.parametrize("code", [
    "x = ().__class__.__base__.__subclasses__()",
    "x = getattr(Scene, 'construct')",
    "x = __builtins__",
    "import io",
])
def test_manim_rejects_introspection_escapes(code):
    scene = f"class Seg(Scene):\n    def construct(self):\n        {code}\n"
    assert not ManimRenderer().validate(scene).ok


def test_manim_allows_super_init():
    scene = ("class Box(VGroup):\n    def __init__(self, **kw):\n        super().__init__(**kw)\n\n"
             "class Seg(Scene):\n    def construct(self):\n        self.add(Box())\n")
    assert ManimRenderer().validate(scene).ok


# ---------- voice fallback ----------

def test_fallback_voice_speaks_only_the_narration(tmp_path, monkeypatch):
    def quota(*a, **k):
        raise tts.QuotaExhausted("out")

    said = []
    monkeypatch.setattr(tts, "synthesize_gemini", quota)
    monkeypatch.setattr(tts, "synthesize_say", lambda text, out: said.append(text) or 1.0)
    monkeypatch.setattr(get_settings(), "fallback_voice", "Samantha")
    info: dict = {}
    tts.synthesize("Calm host.\n\n#### TRANSCRIPT\nHello there", tmp_path / "v.wav", info=info, spoken="Hello there")
    assert said == ["Hello there"] and info["provider"] == "macos"


# ---------- scene loop ----------

class _Renderer:
    suffix = ".py"

    def validate(self, code):
        return Check(False, "NameError: foo")

    def render(self, code, duration, out):
        raise AssertionError("never valid")


class _LLM:
    def __init__(self, replies):
        self.replies, self.prompts = list(replies), []

    def complete(self, system, user):
        self.prompts.append(user)
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return f"```\n{r}\n```"


def test_llm_failure_is_not_fed_to_the_fixer(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "max_render_attempts", 3)
    monkeypatch.setattr("elucera.agents.coders.base.render_fallback",
                        lambda title, words, duration, out: Check(True))
    llm = _LLM(["v1", ConnectionError("blip"), "v2"])
    spec = SceneSpec(index=0, renderer=Renderer.manim, duration=2.0, description="d", beats=[])
    audio = SegmentAudio(index=0, wav=tmp_path / "a.wav", duration=2.0, words=[])
    res = build_scene(llm, Coder(system="s", renderer=_Renderer()), spec, audio, "T", tmp_path, use_cache=False)
    assert res.fallback
    third = llm.prompts[2]
    assert "NameError: foo" in third and "LLM call failed" not in third and "v1" in third


# ---------- cache + assembly ----------

def test_scene_cache_key_tracks_kit_and_prompt_changes(monkeypatch):
    spec = SceneSpec(index=0, renderer=Renderer.three, duration=2.0, description="d", beats=[])
    before = cache.scene_key(spec)
    monkeypatch.setattr(cache, "engine_fingerprint", lambda r: "changed")
    assert cache.scene_key(spec) != before


def test_assembly_refuses_mismatched_clips(tmp_path):
    audio = [SegmentAudio(index=i, wav=tmp_path / f"{i}.wav", duration=1.0, words=[]) for i in range(3)]
    results = [RenderResult(index=i, renderer=Renderer.manim, ok=True, video=tmp_path / f"{i}.mp4") for i in (0, 2)]
    with pytest.raises(ValueError, match="don't match"):
        graph.assemble_job(tmp_path, audio, results, "t")
