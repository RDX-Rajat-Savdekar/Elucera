import subprocess
from pathlib import Path

from elucera.config import get_settings


def tail(text: str, lines: int = 40) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])


def docker_run(image: str, workdir: Path, cmd: list[str], timeout: int | None = None) -> subprocess.CompletedProcess:
    """Run `cmd` in a throwaway container with no network, capped resources, and `workdir` mounted at /work."""
    s = get_settings()
    args = [
        s.docker, "run", "--rm",
        "--network", "none",
        "--memory", "2g", "--cpus", "2", "--pids-limit", "256",
        "--security-opt", "no-new-privileges",
        "-v", f"{workdir.resolve()}:/work", "-w", "/work",
        image, *cmd,
    ]
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout or s.render_timeout_s)
    except subprocess.TimeoutExpired as e:
        return subprocess.CompletedProcess(args, 124, e.stdout or "", f"Render timed out after {e.timeout}s")
