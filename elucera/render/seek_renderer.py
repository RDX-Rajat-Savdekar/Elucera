"""Seek (doodle / kinetic) renderer.

A seek scene is ONE self-contained HTML file exposing ``window.__seek(t)``,
a pure function of time ``t`` (seconds) that paints the 1080x1920 frame.
Rendering frame-steps ``__seek`` in headless Chromium at ``settings.fps``
and encodes the PNG sequence with ffmpeg — mirroring
``remotion_renderer.py``'s validate/render shape.
"""

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from elucera.config import get_settings
from elucera.render.base import Check
from elucera.render.sandbox import tail

WIDTH = 1080
HEIGHT = 1920

# Pinned CDN scripts the LLM contract (elucera/prompts/seek_code.md) allows.
# Keep in sync with the prompt: every <script src> in scene code must be one of these.
PINNED_SCRIPTS = (
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js",
    "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js",
    "https://cdn.jsdelivr.net/npm/p5.brush@1.1/dist/p5.brush.js",
)

# Nondeterministic / live-data APIs: __seek(t) must be a pure function of t.
BANNED_PATTERNS = (
    r"Math\s*\.\s*random",
    r"crypto\s*\.\s*getRandomValues",
    r"crypto\s*\.\s*randomUUID",
    r"Date\s*\.\s*now",
    r"new\s+Date\s*\(",
    r"performance\s*\.\s*now",
    r"\bfetch\s*\(",
    r"XMLHttpRequest",
    r"WebSocket",
    r"EventSource",
    # Other ways to reach the network or local files. These regexes are a first gate for honest mistakes, not a
    # sandbox: the browser itself is locked down too (see _capture_playwright / _chromium_args).
    r"sendBeacon",
    r"\bimport\s*\(",
    r"importScripts",
    r"\b(?:Shared)?Worker\s*\(",
    r"new\s+Image\b",
    r"\.\s*src\s*=",
    r"window\s*\.\s*open\s*\(",
    r"\blocation\s*(?:\.\s*href\s*)?=",
    r"file:",
    r"<\s*(?:iframe|frame|object|embed|portal|base|link)\b",
)

_SEEK_DEF = re.compile(
    r"window\s*\.\s*__seek\s*="
    r"|function\s+__seek\s*\(\s*\w+"
    r"|__seek\s*:\s*function\s*\(\s*\w+"
    r"|__seek\s*\(\s*\w+\s*\)\s*\{"
)
_URLS = re.compile(r"""(?:src|href)\s*=\s*["']([^"']*)["']|url\(\s*["']?([^"')]*)""", re.IGNORECASE)
SCENE_URL = "https://scene.invalid/scene.html"  # served by request interception; never resolved
_BANNED = [re.compile(p) for p in BANNED_PATTERNS]


def _check_size(code: str) -> str:
    if "1080" not in code or "1920" not in code:
        return "canvas must be 1080x1920 (both 1080 and 1920 must appear: viewport meta / canvas size / CSS)"
    return ""


def _check_external_urls(code: str) -> str:
    """Every src/href/url() must be a pinned CDN script, an in-document #fragment, or an inline data: URI."""
    urls = {(a or b).strip() for a, b in _URLS.findall(code)}
    bad = sorted(u for u in urls if u and u not in PINNED_SCRIPTS and not u.startswith(("#", "data:")))
    if bad:
        return ("only pinned CDN scripts, #fragments and data: URIs allowed (no other files or URLs):\n"
                + "\n".join(f"  blocked: {u}" for u in bad))
    return ""


class SeekRenderer:
    """Frame-steps a ``window.__seek(t)`` HTML scene in headless Chromium."""

    suffix = ".html"

    def validate(self, code: str) -> Check:
        if not code or not code.strip():
            return Check(False, "empty scene")
        if "<html" not in code.lower() and "<script" not in code.lower():
            return Check(False, "not an HTML scene (no <html> or <script>)")
        if not _SEEK_DEF.search(code):
            return Check(False, "must define window.__seek(t): assign a function of t, e.g. `window.__seek = (t) => {...}`")
        err = _check_size(code)
        if err:
            return Check(False, err)
        err = _check_external_urls(code)
        if err:
            return Check(False, err)
        hits = sorted({p.pattern for p in _BANNED if p.search(code)})
        if hits:
            return Check(False, "__seek(t) must be a deterministic, offline pure function of t; banned:\n"
                         + "\n".join(f"  {h}" for h in hits))
        return Check(True)

    def render(self, code: str, duration: float, out: Path) -> Check:
        check = self.validate(code)
        if not check.ok:
            return check
        s = get_settings()
        frames = max(1, round(duration * s.fps))
        work = Path(tempfile.mkdtemp(prefix="seek_"))
        try:
            (work / "scene.html").write_text(code)
            frames_dir = work / "frames"
            frames_dir.mkdir()
            check = self._capture(work / "scene.html", frames, frames_dir)
            if not check.ok:
                return check
            return self._encode(frames_dir, frames, out)
        finally:
            shutil.rmtree(work, ignore_errors=True)

    def _capture(self, html: Path, frames: int, frames_dir: Path) -> Check:
        """Screenshot __seek(i/fps) for each frame, via Playwright or plain Chromium CLI."""
        try:
            from playwright.sync_api import sync_playwright  # type: ignore[import-not-found]
        except ImportError:
            return self._capture_chromium_cli(html, frames, frames_dir)
        return self._capture_playwright(sync_playwright, html, frames, frames_dir)

    def _capture_playwright(self, sync_playwright, html: Path, frames: int, frames_dir: Path) -> Check:
        """Preferred driver: one browser for all frames, and every request except the pinned CDN scripts blocked.

        The scene is served from a fake https origin (not file://), so it can't load local files either.
        """
        s = get_settings()
        code = html.read_text()

        def route(r) -> None:
            url = r.request.url
            if url == SCENE_URL:
                r.fulfill(status=200, content_type="text/html; charset=utf-8", body=code)
            elif url in PINNED_SCRIPTS:
                r.continue_()
            else:
                r.abort()

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(args=["--enable-unsafe-swiftshader"])
                try:
                    page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
                    page.route("**/*", route)
                    page.goto(SCENE_URL)
                    page.wait_for_function("typeof window.__seek === 'function'")
                    for i in range(frames):
                        page.evaluate(f"window.__seek({i / s.fps:.4f})")
                        page.screenshot(path=str(frames_dir / f"f{i:04d}.png"))
                finally:
                    browser.close()
        except Exception as e:  # noqa: BLE001 - any driver failure is a render failure for the fix loop
            return Check(False, tail(f"playwright capture failed: {e}"))
        return Check(True)

    def _capture_chromium_cli(self, html: Path, frames: int, frames_dir: Path) -> Check:
        s = get_settings()
        chrome = _find_chromium()
        if chrome is None:
            return Check(False, "no headless-Chromium driver: install playwright (`pip install playwright`) or a chromium binary")
        code = html.read_text()
        for i in range(frames):
            # Per-frame wrapper: drive __seek(t) on load, then screenshot after settle.
            wrapper = code + (
                f"<script>window.addEventListener('load',function(){{"
                f"window.__seek({i / s.fps:.4f})}});</script>"
            )
            frame_html = html.parent / "frame.html"
            frame_html.write_text(wrapper)
            shot = frames_dir / f"f{i:04d}.png"
            try:
                # NOTE: no --disable-gpu. Software WebGL (needed by p5.brush and any
                # WebGL canvas) requires SwiftShader: --enable-unsafe-swiftshader.
                proc = subprocess.run(
                    [chrome, *_chromium_args(), f"--screenshot={shot}", str(frame_html.resolve())],
                    capture_output=True, text=True, timeout=s.render_timeout_s,
                )
            except subprocess.TimeoutExpired:
                return Check(False, f"chromium frame {i} timed out after {s.render_timeout_s}s")
            if proc.returncode != 0 or not shot.exists():
                return Check(False, tail(proc.stderr or proc.stdout) or f"chromium frame {i} produced no screenshot")
        return Check(True)

    def _encode(self, frames_dir: Path, frames: int, out: Path) -> Check:
        s = get_settings()
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            proc = subprocess.run(
                [s.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                 "-framerate", str(s.fps), "-i", str(frames_dir / "f%04d.png"),
                 "-frames:v", str(frames),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                 "-pix_fmt", "yuv420p", "-r", str(s.fps), str(out)],
                capture_output=True, text=True, timeout=s.render_timeout_s * 3,
            )
        except subprocess.TimeoutExpired:
            return Check(False, f"ffmpeg encode timed out after {s.render_timeout_s * 3}s")
        if proc.returncode != 0 or not out.exists():
            return Check(False, tail(proc.stderr) or "ffmpeg produced no output")
        return Check(True)


def _chromium_args() -> list[str]:
    """Headless Chrome flags for the CLI fallback driver: Chrome's own sandbox stays on (it refuses to start as root
    with it, hence the exception), and DNS resolves only the pinned CDN host, so scene code can't reach anything else.
    """
    args = ["--headless=new", "--enable-unsafe-swiftshader", f"--window-size={WIDTH},{HEIGHT}",
            "--virtual-time-budget=3000", "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE cdn.jsdelivr.net"]
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        args.append("--no-sandbox")
    return args


def _find_chromium() -> str | None:
    if os.environ.get("CHROME_PATH"):
        return os.environ["CHROME_PATH"]
    # Full browser builds first: bare chrome-headless-shell hangs where no
    # display link exists (seen on macOS sandboxes); Google Chrome works.
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        "/usr/bin/google-chrome",
        "chromium",
        "chromium-browser",
        "google-chrome",
        "google-chrome-stable",
    ]
    for c in candidates:
        if os.path.sep in c:
            if os.path.exists(c):
                return c
        elif shutil.which(c):
            return c
    return None
