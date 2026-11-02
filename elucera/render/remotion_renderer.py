import json
import os
import subprocess
import tempfile
import threading
from pathlib import Path

from elucera.config import get_settings
from elucera.render.base import Check
from elucera.render.sandbox import tail

_slots = threading.BoundedSemaphore(get_settings().remotion_concurrency)


def _node(script: str, *args: str, timeout: int) -> Check:
    s = get_settings()
    # Child tools (tsc, Remotion's compositor) resolve `node` via PATH, so put ours first.
    env = {**os.environ, "PATH": f"{Path(s.node).parent}{os.pathsep}{os.environ.get('PATH', '')}"}
    try:
        proc = subprocess.run([s.node, script, *args], cwd=s.remotion_dir, env=env, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return Check(False, f"{script} timed out after {timeout}s")
    for line in reversed(proc.stdout.strip().splitlines()):
        if line.startswith("{"):
            res = json.loads(line)
            return Check(res["ok"], res.get("error", ""))
    return Check(False, tail(proc.stderr or proc.stdout) or f"{script} produced no result")


class RemotionRenderer:
    """Renders a TSX scene (2D, or 3D via @kit Scene3D) with Remotion on the host.

    Scene code runs inside headless Chromium's sandbox; validate.mjs enforces an import allowlist first.
    """

    suffix = ".tsx"

    def validate(self, code: str) -> Check:
        with tempfile.NamedTemporaryFile("w", suffix=".tsx", delete=False) as f:
            f.write(code)
        try:
            return _node("validate.mjs", f.name, timeout=60)
        finally:
            Path(f.name).unlink(missing_ok=True)

    def render(self, code: str, duration: float, out: Path, props: dict | None = None) -> Check:
        scene = out.with_suffix(".tsx")
        scene.write_text(code)
        return self.render_file(scene, duration, out, props)

    def render_file(self, scene: Path, duration: float, out: Path, props: dict | None = None) -> Check:
        s = get_settings()
        job = out.with_suffix(".job.json")
        job.write_text(json.dumps({
            "scene": str(scene.resolve()),
            "out": str(out.resolve()),
            "durationInFrames": max(1, round(duration * s.fps)),
            "props": props or {},
        }))
        with _slots:
            return _node("render.mjs", str(job.resolve()), timeout=s.render_timeout_s * 3)
