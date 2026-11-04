import subprocess
from pathlib import Path

from elucera.config import get_settings


def tail(text: str, lines: int = 40) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])


def docker_run(image: str, workdir: Path, cmd: list[str], timeout: int | None = None) -> subprocess.CompletedProcess:
    """Run `cmd` in a throwaway container: no network, no capabilities, read-only image, capped resources.

    This container is the real security boundary for model-written code; the AST checks in the renderers only
    catch honest mistakes early. Writable places are `workdir` (mounted at /work) and small tmpfs scratch dirs.
    """
    s = get_settings()
    args = [
        s.docker, "run", "--rm",
        "--network", "none",
        "--memory", "2g", "--cpus", "2", "--pids-limit", "256",
        "--security-opt", "no-new-privileges", "--cap-drop", "ALL",
        "--read-only", "--tmpfs", "/tmp:rw,size=512m", "--tmpfs", "/home:rw,size=256m",
        "-v", f"{workdir.resolve()}:/work", "-w", "/work",
        image, *cmd,
    ]
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout or s.render_timeout_s)
    except subprocess.TimeoutExpired as e:
        return subprocess.CompletedProcess(args, 124, e.stdout or "", f"Render timed out after {e.timeout}s")
