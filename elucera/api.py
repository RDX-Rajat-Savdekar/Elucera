import asyncio
import json
import logging
import re
import secrets
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError

from elucera import chats, telemetry, usage
from elucera.config import ROOT, get_settings
from elucera.fsutil import write_text_atomic
from elucera.models import JobState, JobStatus, Renderer, Script

# The pipeline (elucera.graph and everything it pulls in: LangGraph, Whisper, the renderers) and the library are
# imported inside the handlers that need them. That keeps the web server's import light, and lets tests swap
# `elucera.graph.run` & co. with monkeypatch.

log = logging.getLogger(__name__)

# Only jobs this process is actively running live here (and their event logs in EVENTS); finished jobs are evicted
# and served from disk, so memory doesn't grow with history.
JOBS: dict[str, JobState] = {}
EVENTS: dict[str, list[dict]] = {}
PREFETCH: dict[str, threading.Event] = {}  # pitch id → set when its speculative voice + plan finished
_lock = threading.Lock()  # EVENTS + event-log appends
_job_lock = threading.Lock()  # claiming a job for a run (so two requests can't start work on the same job)
_pitch_lock = threading.Lock()

AUTH_COOKIE = "elucera_token"
# Static bundles loaded by the sandboxed (opaque-origin) player iframe, which can't carry the auth cookie.
_AUTH_EXEMPT = re.compile(r"^/(jobs/[^/]+/scenes/\d+|library/scenes/[^/]+)/player\.js$")
# The player page runs model-written JS: give it an opaque origin so it can't touch the app's DOM, storage or API.
PLAYER_HEADERS = {"Content-Security-Policy": "sandbox allow-scripts", "Cache-Control": "no-store"}
PLAYER_JS_HEADERS = {"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"}
MAX_BEACON_BYTES = 16_384


class JobRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    renderer: Renderer | None = Field(default=None, description="Preferred engine for every scene; null = director picks")
    thread_id: str | None = Field(default=None, max_length=64, description="Chat thread to file this job under")


class RetryRequest(BaseModel):
    note: str = Field(default="", max_length=500)
    renderer: Renderer | None = None
    description: str | None = Field(default=None, max_length=4000, description="Replacement animator prompt for this scene")
    library_scene: str | None = Field(default=None, max_length=64, description="Reuse this library scene's clip instead")


def _owner(request: Request) -> str | None:
    """Anonymous per-browser id from the UI; scopes chat history without a login (not authentication)."""
    v = (request.headers.get("x-elucera-user") or "").strip()
    return v if v and len(v) <= 64 and v.replace("-", "").isalnum() else None


def _engine(r: Renderer | None) -> str | None:
    return r.value if r else None


# ---------- job + event persistence ----------

def _job_dir(job_id: str) -> Path:
    return get_settings().outputs_dir / job_id


def _persist(job: JobState) -> None:
    write_text_atomic(_job_dir(job.id) / "state.json", job.model_dump_json(indent=2))


def _load(job_id: str) -> JobState | None:
    if job_id in JOBS:
        return JOBS[job_id]
    if not job_id.isalnum():
        return None
    f = _job_dir(job_id) / "state.json"
    return JobState.model_validate_json(f.read_text()) if f.exists() else None


def _events(job_id: str) -> list[dict]:
    """The job's event log. Cached in memory only while this process is running the job."""
    with _lock:
        if job_id in EVENTS:
            return EVENTS[job_id]
        f = _job_dir(job_id) / "events.jsonl"
        events = [json.loads(ln) for ln in f.read_text().splitlines() if ln.strip()] if f.exists() else []
        if job_id in JOBS:
            EVENTS[job_id] = events
        return events


def _emitter(job: JobState):
    """emit(type, **data): append to the job's event log (memory + events.jsonl) and keep JobState in sync."""
    events = _events(job.id)
    path = _job_dir(job.id) / "events.jsonl"

    def emit(type: str, **data) -> None:
        with _lock:
            ev = {"seq": len(events), "t": round(time.time(), 2), "type": type, **data}
            events.append(ev)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "a") as f:
                f.write(json.dumps(ev, default=str) + "\n")
        if type == "stage":
            job.stage = data["label"]
            job.log.append(data["stage"])
            _persist(job)

    return emit


def _evict(job_id: str) -> None:
    with _job_lock, _lock:
        JOBS.pop(job_id, None)
        EVENTS.pop(job_id, None)


def _claim(job_id: str) -> tuple[JobState, JobStatus]:
    """Atomically mark an idle job as running in this process. Returns (job, status before the claim)."""
    with _job_lock:
        job = _load(job_id)
        if not job:
            raise HTTPException(404, "job not found")
        if job.status in (JobStatus.running, JobStatus.queued) and job.id in JOBS:
            raise HTTPException(409, "job is still running")
        prev = job.status
        job.status = JobStatus.running
        JOBS[job.id] = job
        return job, prev


def _release(job: JobState, prev: JobStatus) -> None:
    """Undo a claim whose work never started (or ran synchronously)."""
    job.status = prev
    _persist(job)
    _evict(job.id)


def _friendly(e: Exception) -> str:
    msg = str(e)
    if "RESOURCE_EXHAUSTED" in msg or " 429" in msg:
        return "The voice service hit its rate limit. Wait a minute and try again."
    if "MUSE" in msg or "api.meta.ai" in msg:
        return "The script model (Muse) is unavailable right now. Try again shortly."
    return msg.splitlines()[0][:300] if msg else e.__class__.__name__


TRANSIENT = re.compile(r"RESOURCE_EXHAUSTED|\b429\b|\b50[234]\b|timed? ?out|timeout|connection|unavailable|"
                       r"temporarily|overloaded|api\.meta\.ai|MUSE", re.I)


def _transient(e: Exception) -> bool:
    """Errors worth one automatic retry: network blips, rate limits, model outages (not bugs in our code)."""
    return isinstance(e, (TimeoutError, ConnectionError)) or bool(TRANSIENT.search(f"{e.__class__.__name__} {e}"))


def _resumable(job: JobState) -> bool:
    return (_job_dir(job.id) / "topic.txt").exists()


def _execute(job: JobState, work, retry=None) -> None:
    """Run `work(emit)` for a job, recording success/failure as events.

    On a transient failure, `retry(emit)` (normally a resume from the failed step) runs once automatically.
    """
    try:
        with usage.sink(_job_dir(job.id)):
            _execute_inner(job, work, retry)
    finally:
        _evict(job.id)


def _execute_inner(job: JobState, work, retry=None) -> None:
    emit = _emitter(job)
    job.status, job.error = JobStatus.running, ""
    _persist(job)
    try:
        try:
            out = work(emit)
        except Exception as e:
            if retry is None or not _transient(e) or not _resumable(job):
                raise
            log.warning("job %s hit a transient error, retrying once: %s", job.id, e)
            emit("auto_retry", stage=job.log[-1] if job.log else "", error=_friendly(e),
                 delay=get_settings().auto_retry_delay_s)
            time.sleep(get_settings().auto_retry_delay_s)
            out = retry(emit)
        job.video = out if out else job.video
        job.status = JobStatus.done
    except Exception as e:
        log.exception("job %s failed", job.id)
        job.status, job.error = JobStatus.failed, _friendly(e)
        emit("failed", stage=job.log[-1] if job.log else "", error=job.error, detail=str(e)[-2000:],
             resumable=_resumable(job))
    job.finished = time.time()
    _persist(job)
    try:
        from elucera import analytics
        analytics.record_job(job.id)
    except Exception:
        log.warning("analytics for job %s failed", job.id, exc_info=True)  # analytics must never break a job


def _mark_orphans() -> None:
    """Jobs left running by a previous server process will never finish; say so instead of spinning forever."""
    for f in get_settings().outputs_dir.glob("*/state.json"):
        try:
            job = JobState.model_validate_json(f.read_text())
        except (OSError, ValueError):
            log.warning("skipping unreadable job state %s", f)
            continue
        if job.status in (JobStatus.queued, JobStatus.running):
            job.status, job.error, job.finished = JobStatus.failed, "Interrupted by a server restart. Resume to continue where it stopped.", time.time()
            _persist(job)
            _emitter(job)("failed", stage=job.log[-1] if job.log else "", error=job.error, detail="",
                          resumable=_resumable(job))


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    _mark_orphans()
    yield


app = FastAPI(title="elucera", lifespan=_lifespan)


@app.middleware("http")
async def _auth(request: Request, call_next):
    """Optional shared-token auth (API_TOKEN in .env). Open the UI once as /?token=<token> to get a cookie."""
    token = get_settings().api_token
    if not token or _AUTH_EXEMPT.match(request.url.path):
        return await call_next(request)
    bearer = request.headers.get("authorization", "")
    given = (bearer[7:] if bearer.startswith("Bearer ") else "") or request.headers.get("x-elucera-token") \
        or request.cookies.get(AUTH_COOKIE) or request.query_params.get("token") or ""
    if not secrets.compare_digest(given.encode(), token.encode()):
        return JSONResponse({"detail": "unauthorized"}, status_code=401)
    response = await call_next(request)
    if request.query_params.get("token") and request.cookies.get(AUTH_COOKIE) != token:  # the ?token= login link
        response.set_cookie(AUTH_COOKIE, token, httponly=True, samesite="strict")
    return response


# ---------- jobs ----------

@app.post("/jobs", status_code=202)
def create_job(req: JobRequest, background: BackgroundTasks, request: Request) -> JobState:
    from elucera.graph import resume, run

    telemetry.record("job_create", {"topic_len": len(req.topic.strip()), "engine": _engine(req.renderer) or "auto"},
                     owner=_owner(request))
    job = JobState(id=uuid.uuid4().hex[:12], topic=req.topic.strip(), preferred_renderer=req.renderer,
                   thread_id=(req.thread_id or None), created=time.time())
    JOBS[job.id] = job
    _persist(job)
    if job.thread_id:
        try:
            chats.attach(job.thread_id, job.id, job.topic, owner=_owner(request), renderer=_engine(req.renderer))
        except (ValueError, PermissionError, OSError):
            job.thread_id = None
            _persist(job)
    _emitter(job)("queued", topic=job.topic, renderer=_engine(req.renderer))
    background.add_task(_execute, job, lambda emit: run(job.topic, _job_dir(job.id), emit,
                                                        preferred_renderer=_engine(req.renderer)),
                        lambda emit: resume(_job_dir(job.id), emit))
    return job


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> JobState:
    job = _load(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job


@app.get("/jobs/{job_id}/events")
async def stream_events(job_id: str, request: Request, after: int = -1):
    """Server-sent events: replays the job's event log after `after`, then streams new ones until it finishes."""
    if not _load(job_id):
        raise HTTPException(404, "job not found")
    last_id = request.headers.get("last-event-id")
    start = int(last_id) + 1 if last_id and last_id.isdigit() else after + 1

    async def gen():
        i, idle = start, 0.0
        yield "retry: 2000\n\n"
        while True:
            events = _events(job_id)
            while i < len(events):
                yield f"id: {i}\ndata: {json.dumps(events[i], default=str)}\n\n"
                i += 1
                idle = 0.0
            job = _load(job_id)
            if job and job.status in (JobStatus.done, JobStatus.failed) and i >= len(_events(job_id)):
                yield f"event: end\ndata: {json.dumps({'status': job.status.value})}\n\n"
                return
            if await request.is_disconnected():
                return
            await asyncio.sleep(0.3)
            idle += 0.3
            if idle >= 15:
                yield ": keep-alive\n\n"
                idle = 0.0

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _read_json(path: Path):
    return json.loads(path.read_text()) if path.exists() else None


@app.get("/jobs/{job_id}/details")
def get_job_details(job_id: str) -> dict:
    if not _load(job_id):
        raise HTTPException(404, "job not found")
    d = _job_dir(job_id)
    return {"script": _read_json(d / "script.json"), "plan": _read_json(d / "plan.json"),
            "results": _read_json(d / "results.json")}


@app.get("/jobs/{job_id}/video")
def get_video(job_id: str, request: Request) -> FileResponse:
    job = _load(job_id)
    if not job or not job.video or not Path(job.video).exists():
        raise HTTPException(404, "video not ready")
    telemetry.record("video_serve", {"job": job_id}, owner=_owner(request))
    return FileResponse(job.video, media_type="video/mp4", filename=f"reel-{job_id}.mp4",
                        headers={"Cache-Control": "no-store"})


@app.get("/jobs/{job_id}/scenes/{index}/clip")
def get_scene_clip(job_id: str, index: int, version: int | None = None) -> FileResponse:
    """The scene's current clip, or an earlier version kept by a redo (`?version=n`)."""
    if not _load(job_id):
        raise HTTPException(404, "scene not rendered")
    f = _job_dir(job_id) / (f"seg{index}.v{version}.mp4" if version else f"seg{index}.mp4")
    if not f.exists():
        raise HTTPException(404, "scene not rendered")
    return FileResponse(f, media_type="video/mp4", headers={"Cache-Control": "no-store"})


def _player_bundle(job_id: str, index: int) -> Path:
    if not _load(job_id):
        raise HTTPException(404, "no interactive preview for this scene")
    f = _job_dir(job_id) / f"seg{index}.player.js"
    if not f.exists():
        raise HTTPException(404, "no interactive preview for this scene")
    return f


@app.get("/jobs/{job_id}/scenes/{index}/player")
def get_scene_player(job_id: str, index: int) -> HTMLResponse:
    from elucera.render.player_bundle import player_page

    _player_bundle(job_id, index)
    job = _load(job_id)
    return HTMLResponse(player_page(job.topic if job else f"scene {index}"), headers=PLAYER_HEADERS)


@app.get("/jobs/{job_id}/scenes/{index}/player.js")
def get_scene_player_js(job_id: str, index: int) -> FileResponse:
    return FileResponse(_player_bundle(job_id, index), media_type="application/javascript", headers=PLAYER_JS_HEADERS)


def _scene_plan(job_id: str, index: int) -> list[dict]:
    """The job's plan, 404/409 unless scene `index` exists in it."""
    if not _load(job_id):
        raise HTTPException(404, "job not found")
    d = _job_dir(job_id)
    if not (d / "plan.json").exists() or not (d / "audio.json").exists():
        raise HTTPException(409, "this job never reached the scene stage; resume or start a new one")
    plan = json.loads((d / "plan.json").read_text())
    if not 0 <= index < len(plan):
        raise HTTPException(404, "no such scene")
    return plan


@app.post("/jobs/{job_id}/scenes/{index}/retry", status_code=202)
def retry_scene(job_id: str, index: int, req: RetryRequest, background: BackgroundTasks, request: Request) -> JobState:
    """Regenerate one scene (with a note, an edited prompt, another engine, or a library clip).

    Only that scene is rebuilt; the reel is NOT reassembled until POST /jobs/{id}/rebake, so several scenes can be
    redone and compared first.
    """
    from elucera.graph import retry_scene as do_retry

    plan = _scene_plan(job_id, index)
    job, _prev = _claim(job_id)
    d = _job_dir(job_id)
    renderer = _engine(req.renderer)
    telemetry.record("scene_retry", {"job": job_id, "scene": index, "engine": renderer or plan[index]["renderer"],
                                     "edited": bool(req.description), "note": bool(req.note),
                                     "library": bool(req.library_scene)},
                     owner=_owner(request))
    _emitter(job)("retry", index=index, note=req.note, renderer=renderer or plan[index]["renderer"],
                  edited=bool(req.description), library_scene=req.library_scene)
    background.add_task(_execute, job, lambda emit: do_retry(d, index, req.note, renderer, emit,
                                                             description=req.description, library_scene=req.library_scene))
    return job


@app.get("/jobs/{job_id}/scenes/{index}/history")
def scene_history(job_id: str, index: int) -> list[dict]:
    from elucera.graph import history

    if not _load(job_id):
        raise HTTPException(404, "job not found")
    return history(_job_dir(job_id), index)


@app.post("/jobs/{job_id}/scenes/{index}/revert")
def revert_scene(job_id: str, index: int) -> dict:
    from elucera.graph import revert_scene as do_revert

    job, prev = _claim(job_id)
    try:
        return do_revert(_job_dir(job_id), index, _emitter(job))
    except ValueError as e:
        raise HTTPException(409, str(e)) from e
    finally:
        _release(job, prev)


@app.get("/jobs/{job_id}/scenes/{index}/similar")
def similar_scenes(job_id: str, index: int, renderer: Renderer | None = None) -> list[dict]:
    """Library scenes that could stand in for this one (no generation needed)."""
    from elucera import library
    from elucera.models import SceneSpec

    f = _job_dir(job_id) / "plan.json"
    if not _load(job_id) or not f.exists():
        raise HTTPException(404, "job not found")
    plan = json.loads(f.read_text())
    if not 0 <= index < len(plan):
        raise HTTPException(404, "no such scene")
    spec = SceneSpec.model_validate(plan[index])
    if renderer:
        spec.renderer = renderer
    return [{"id": m.id, "renderer": m.renderer.value, "topic": m.topic, "role": m.role,
             "description": m.description[:220], "duration": m.duration}
            for m, _code in library.similar(spec, k=8, max_chars=10**9)
            # a job's own scenes are already in it; only offer genuinely different clips
            if m.source != job_id and (get_settings().library_dir / "scenes" / m.id / "clip.mp4").exists()][:3]


@app.post("/jobs/{job_id}/rebake", status_code=202)
def rebake_job(job_id: str, background: BackgroundTasks, request: Request) -> JobState:
    """Reassemble the reel from the current scene clips (after redos)."""
    from elucera.graph import load_job, rebake

    job, prev = _claim(job_id)
    d = _job_dir(job_id)
    try:
        _, _, specs, results = load_job(d)
    except FileNotFoundError as e:
        _release(job, prev)
        raise HTTPException(409, "this job has no scenes to bake yet; resume it first") from e
    if {s.index for s in specs} - {r.index for r in results}:
        _release(job, prev)
        raise HTTPException(409, "some scenes are not rendered yet; resume the job first")
    telemetry.record("rebake", {"job": job_id}, owner=_owner(request))
    _emitter(job)("rebake", scenes=len(specs))
    background.add_task(_execute, job, lambda emit: rebake(d, emit))
    return job


@app.post("/jobs/{job_id}/resume", status_code=202)
def resume_job(job_id: str, background: BackgroundTasks, request: Request) -> JobState:
    """Continue a failed or interrupted job from the first missing step, reusing what's already done."""
    from elucera.graph import resume

    job, prev = _claim(job_id)
    if prev == JobStatus.done:
        _release(job, prev)
        raise HTTPException(409, "job already finished")
    if not _resumable(job):
        _release(job, prev)
        raise HTTPException(409, "nothing saved to resume from; start over")
    telemetry.record("resume", {"job": job_id}, owner=_owner(request))
    background.add_task(_execute, job, lambda emit: resume(_job_dir(job_id), emit))
    return job


# ---------- pitches (storyboard review before anything is recorded) ----------

class ThreadCreate(BaseModel):
    title: str = Field(default="Untitled chat", max_length=120)


class ThreadAttach(BaseModel):
    job_id: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9]+$")


class PitchRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    renderer: Renderer | None = None
    target_length: Literal["short", "standard", "deep"] = "standard"
    thread_id: str | None = Field(default=None, max_length=64)
    note: str = Field(default="", max_length=2000, description="Director's note, e.g. use a timeline view")


class PitchApprove(BaseModel):
    script: Script | None = None
    renderer: Renderer | None = None
    thread_id: str | None = Field(default=None, max_length=64)
    note: str | None = Field(default=None, max_length=2000)


def _pitch_dir(pid: str) -> Path:
    return get_settings().outputs_dir / "pitches" / pid


def _pitch_file(pid: str) -> Path:
    f = _pitch_dir(pid) / "pitch.json"
    if not pid.isalnum() or not f.exists():
        raise HTTPException(404, "unknown pitch")
    return f


def _update_pitch(pid: str, **fields) -> dict:
    """Read-modify-write pitch.json under a lock (the prefetch and approval both touch it)."""
    f = _pitch_dir(pid) / "pitch.json"
    with _pitch_lock:
        pitch = json.loads(f.read_text())
        pitch.update(fields)
        write_text_atomic(f, json.dumps(pitch, default=str))
    return pitch


def _run_pitch(pid: str, req: PitchRequest) -> None:
    """Script-only pass: cheap first iteration for director review, then speculative voice + plan."""
    from elucera.agents.script import write_script
    from elucera.graph import LENGTH_HINTS
    from elucera.llm import MuseClient

    d = _pitch_dir(pid)
    with usage.sink(d):
        try:
            hint = LENGTH_HINTS.get(req.target_length, "")
            with usage.purpose("pitch"):
                script = write_script(MuseClient(), req.topic.strip() + hint)
        except Exception as e:
            log.exception("pitch %s failed", pid)
            _update_pitch(pid, status="failed", error=_friendly(e))
            return
        if not get_settings().prefetch_on_pitch:
            _update_pitch(pid, status="ready", script=script.model_dump())
            return
        PREFETCH[pid] = threading.Event()
        _update_pitch(pid, status="ready", script=script.model_dump(), prefetch="running")
        _prefetch(pid, script, req.note or "", _engine(req.renderer))


def _prefetch(pid: str, script: Script, note: str, preferred: str | None) -> None:
    from elucera.graph import prefetch

    started = time.time()
    try:
        with usage.purpose("prefetch"):
            prefetch(_pitch_dir(pid) / "prefetch", script, note, preferred)
        _update_pitch(pid, prefetch="ready", prefetch_s=round(time.time() - started, 1))
    except Exception as e:  # speculative work: failures only mean the real run does it instead
        log.warning("prefetch for pitch %s failed: %s", pid, e)
        _update_pitch(pid, prefetch="failed", prefetch_error=_friendly(e))
    finally:
        PREFETCH.pop(pid, threading.Event()).set()


@app.post("/pitches", status_code=202)
def create_pitch(req: PitchRequest, background: BackgroundTasks, request: Request) -> dict:
    telemetry.record("pitch_submit", {"topic_len": len(req.topic.strip()), "engine": _engine(req.renderer) or "auto",
                                      "target_length": req.target_length},
                     owner=_owner(request))
    pid = uuid.uuid4().hex[:12]
    pitch = {"id": pid, "topic": req.topic.strip(), "status": "writing", "renderer": _engine(req.renderer),
             "target_length": req.target_length, "note": req.note or "",
             "created": time.time(), "script": None, "error": "", "thread_id": req.thread_id or None}
    # Written before returning so the UI's first poll never 404s.
    write_text_atomic(_pitch_dir(pid) / "pitch.json", json.dumps(pitch))
    if req.thread_id:
        try:
            chats.attach_pitch(req.thread_id, pid, pitch["topic"], owner=_owner(request), renderer=pitch["renderer"])
        except (ValueError, PermissionError, OSError):
            log.info("pitch %s not filed under thread %s", pid, req.thread_id)
    background.add_task(_run_pitch, pid, req)
    return pitch


@app.get("/pitches/{pid}")
def get_pitch(pid: str) -> dict:
    return json.loads(_pitch_file(pid).read_text())


@app.post("/pitches/{pid}/approve", status_code=202)
def approve_pitch(pid: str, req: PitchApprove, background: BackgroundTasks, request: Request) -> JobState:
    """Start the real run from a reviewed pitch. Idempotent: approving twice returns the job already started."""
    from elucera.graph import resume, run_approved

    f = _pitch_file(pid)
    with _pitch_lock:
        pitch = json.loads(f.read_text())
        if pitch.get("job_id") and (existing := _load(pitch["job_id"])):
            return existing
        if pitch.get("status") != "ready" or not pitch.get("script"):
            raise HTTPException(409, "pitch is not ready for review yet")
        try:
            script = Script.model_validate(req.script if req.script else pitch["script"])
        except ValidationError as e:
            raise HTTPException(422, "invalid script") from e
        job_id = uuid.uuid4().hex[:12]
        pitch.update(job_id=job_id, approved_script=script.model_dump())
        write_text_atomic(f, json.dumps(pitch, default=str))

    renderer = req.renderer or (Renderer(pitch["renderer"]) if pitch.get("renderer") else None)
    telemetry.record("pitch_approve", {"pitch": pid, "engine": _engine(req.renderer) or "auto"}, owner=_owner(request))
    thread_id = req.thread_id or None
    note = req.note if req.note is not None else pitch.get("note", "")
    job = JobState(id=job_id, topic=pitch["topic"], preferred_renderer=renderer, thread_id=thread_id, created=time.time())
    JOBS[job.id] = job
    _persist(job)
    if thread_id:
        try:
            chats.attach(thread_id, job.id, job.topic, owner=_owner(request), renderer=_engine(renderer), pitch_id=pid)
        except (ValueError, PermissionError, OSError):
            job.thread_id = None
            _persist(job)
    unchanged = (script.model_dump() == pitch["script"] and (note or "") == (pitch.get("note") or "")
                 and _engine(renderer) == pitch.get("renderer"))
    emit = _emitter(job)
    emit("queued", topic=job.topic, renderer=_engine(renderer), pitch=pid)
    (_job_dir(job.id) / "pitch_id.txt").write_text(pid)

    def wait_for_prefetch() -> None:
        ev = PREFETCH.get(pid)
        if ev and not ev.is_set() and unchanged:
            emit("prefetch_wait")
            ev.wait(timeout=300)

    background.add_task(_execute, job, lambda emit: run_approved(
        job.topic, _job_dir(job.id), script, emit,
        preferred_renderer=_engine(renderer), note=note or "", wait_for=wait_for_prefetch),
        lambda emit: resume(_job_dir(job.id), emit))
    return job


# ---------- chat threads ----------

@app.post("/chats", status_code=201)
def create_thread(req: ThreadCreate, request: Request) -> dict:
    return chats.create(req.title, owner=_owner(request))


@app.get("/chats")
def list_threads(request: Request) -> list[dict]:
    return chats.list_threads(_owner(request))


def _thread(thread_id: str, request: Request) -> dict:
    try:
        t = chats.get(thread_id)
    except ValueError as e:
        raise HTTPException(404, "unknown chat") from e
    if t is None or not chats.visible(t, _owner(request)):
        raise HTTPException(404, "unknown chat")
    return t


@app.get("/chats/{thread_id}")
def get_thread(thread_id: str, request: Request) -> dict:
    t = _thread(thread_id, request)
    items = chats.item_summaries(t)
    return {**t, "items": items, "summaries": [i for i in items if i["kind"] == "job"]}


@app.delete("/chats/{thread_id}", status_code=204)
def delete_thread(thread_id: str, request: Request) -> None:
    _thread(thread_id, request)
    chats.delete(thread_id, _owner(request))


@app.post("/chats/{thread_id}/jobs", status_code=201)
def attach_job(thread_id: str, req: ThreadAttach, request: Request) -> dict:
    try:
        return chats.attach(thread_id, req.job_id, owner=_owner(request))
    except PermissionError as e:
        raise HTTPException(404, "unknown chat") from e
    except ValueError as e:
        raise HTTPException(400, "bad thread or job id") from e


# ---------- analytics + product telemetry ----------

@app.get("/analytics/dashboard")
def analytics_dashboard() -> dict:
    """Per-reel time + cost (measured or estimated), stage medians, and competitor price comparison."""
    from elucera import costs
    return costs.dashboard()


@app.get("/analytics/summary")
def analytics_summary() -> dict:
    from elucera import analytics
    return analytics.summary()


@app.post("/telemetry/event", status_code=204)
async def telemetry_event(request: Request):
    """Frontend product beacon. Best-effort: always 204, never leaks prompts."""
    if int(request.headers.get("content-length") or 0) > MAX_BEACON_BYTES:
        return None
    try:
        raw = await request.body()
        body = json.loads(raw[:MAX_BEACON_BYTES]) if len(raw) <= MAX_BEACON_BYTES else None
    except ValueError:
        return None
    if not isinstance(body, dict):
        return None
    props = body.get("props") if isinstance(body.get("props"), dict) else {}
    # Beacon path can't set headers, so allow the UID in the query string or the payload too.
    owner = _owner(request) or request.query_params.get("uid") or body.get("uid") or props.get("uid") or ""
    telemetry.record(str(body.get("event", "")), props, owner=str(owner)[:64])
    return None


@app.get("/analytics/telemetry")
def analytics_telemetry(days: int = 14) -> dict:
    """Product-funnel aggregates: page views, demo, gallery, submits, approvals, redos."""
    return telemetry.summary(max(1, min(days, 90)))


# ---------- library (samples for the home page) ----------

def _library_file(section: str, item: str, name: str, missing: str = "not found") -> Path:
    """library/<section>/<item>/<name>, refusing anything that resolves outside library/<section>/."""
    root = (get_settings().library_dir / section).resolve()
    f = (root / item / name).resolve()
    if f.parent.parent != root or not f.exists():
        raise HTTPException(404, missing)
    return f


def _reel_summary(d: Path) -> dict:
    script = _read_json(d / "script.json") or {}
    plan = _read_json(d / "plan.json") or []
    audio = _read_json(d / "audio.json") or []
    topic = (d / "topic.txt").read_text().strip() if (d / "topic.txt").exists() else script.get("title", d.name)
    return {
        "name": d.name,
        "topic": topic,
        "title": script.get("title", topic),
        "hook": (script.get("segments") or [{}])[0].get("narration", ""),
        "renderers": sorted({p["renderer"] for p in plan}),
        "duration": round(sum(a.get("duration", 0) for a in audio), 1),
        "has_video": (d / "final.mp4").exists(),
        "mtime": d.stat().st_mtime,
    }


@app.get("/library/reels")
def list_reels() -> list[dict]:
    reels = [_reel_summary(d) for d in (get_settings().library_dir / "reels").glob("*/")]
    return sorted(reels, key=lambda r: -r["mtime"])


@app.get("/library/reels/{name}/video")
def reel_video(name: str) -> FileResponse:
    return FileResponse(_library_file("reels", name, "final.mp4", "video not stored locally"), media_type="video/mp4")


@app.get("/library/reels/{name}/strip")
def reel_strip(name: str) -> FileResponse:
    return FileResponse(_library_file("reels", name, "strip.png", "no strip"), media_type="image/png")


def _clip_listing(section: str) -> list[dict]:
    """library/<section>/<id>/{meta.json, poster.jpg, clip.mp4} → cards sorted by meta `order`."""
    out = []
    for d in sorted((get_settings().library_dir / section).glob("*/")):
        f = d / "meta.json"
        if f.exists():
            out.append({"id": d.name, **json.loads(f.read_text()), "has_video": (d / "clip.mp4").exists()})
    return sorted(out, key=lambda m: m.get("order", 99))


@app.get("/library/showcase")
def list_showcase() -> list[dict]:
    """Component-kit showreels for the home page."""
    return _clip_listing("showcase")


@app.get("/library/showcase/{sid}/video")
def showcase_video(sid: str) -> FileResponse:
    return FileResponse(_library_file("showcase", sid, "clip.mp4"))


@app.get("/library/showcase/{sid}/poster")
def showcase_poster(sid: str) -> FileResponse:
    return FileResponse(_library_file("showcase", sid, "poster.jpg"))


@app.get("/library/engines")
def list_engines() -> list[dict]:
    """One signature clip per renderer for the home page."""
    return _clip_listing("engines")


@app.get("/library/engines/{eid}/video")
def engine_video(eid: str) -> FileResponse:
    return FileResponse(_library_file("engines", eid, "clip.mp4"))


@app.get("/library/engines/{eid}/poster")
def engine_poster(eid: str) -> FileResponse:
    return FileResponse(_library_file("engines", eid, "poster.jpg"))


@app.get("/library/scenes")
def list_scenes() -> list[dict]:
    from elucera import library

    return [
        {"id": m.id, "renderer": m.renderer.value, "role": m.role, "topic": m.topic, "description": m.description[:220],
         "duration": m.duration, "starred": m.starred, "has_clip": (p / "clip.mp4").exists(),
         "has_player": (p / "player.js").exists()}
        for m, p in library.scenes()
    ]


@app.get("/library/scenes/{scene_id}/clip")
def scene_clip(scene_id: str) -> FileResponse:
    return FileResponse(_library_file("scenes", scene_id, "clip.mp4"))


@app.get("/library/scenes/{scene_id}/thumb")
def scene_thumb(scene_id: str) -> FileResponse:
    return FileResponse(_library_file("scenes", scene_id, "thumb.png"))


@app.get("/library/scenes/{scene_id}/player")
def library_scene_player(scene_id: str) -> HTMLResponse:
    from elucera.render.player_bundle import player_page

    _library_file("scenes", scene_id, "player.js")  # 404s unless the bundle exists
    return HTMLResponse(player_page(scene_id.replace("-", " ")), headers=PLAYER_HEADERS)


@app.get("/library/scenes/{scene_id}/player.js")
def library_scene_player_js(scene_id: str) -> FileResponse:
    return FileResponse(_library_file("scenes", scene_id, "player.js"), media_type="application/javascript",
                        headers=PLAYER_JS_HEADERS)


# Three.js is already installed for Remotion; serve that copy so the UI works offline. Skipped (with a warning)
# before `npm install`, so the API itself still starts and its tests run on a fresh checkout.
_THREE = ROOT / "remotion/node_modules/three/build"
if _THREE.is_dir():
    app.mount("/vendor/three", StaticFiles(directory=_THREE), name="three")
else:
    log.warning("%s missing (run `npm install` in remotion/); the 3D homepage background is disabled", _THREE)
app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
