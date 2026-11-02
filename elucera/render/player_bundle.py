"""Interactive 3D/2D preview bundles: wrap a rendered scene in @remotion/player.

Best-effort companion to the MP4 render — a failure here never fails the scene.
"""

import json
import logging
from pathlib import Path

from elucera.config import get_settings
from elucera.render.base import Check
from elucera.render.remotion_renderer import _node

log = logging.getLogger(__name__)

PLAYER_PAGE = """<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — interactive preview</title>
<style>
html,body{{margin:0;height:100%;background:#07090e;display:grid;place-items:center;font:14px/1.4 system-ui,sans-serif;color:#c9d0dc}}
#wrap{{width:min(100vw,56.25vh);aspect-ratio:9/16;max-height:100vh;background:#000;border-radius:12px;overflow:hidden}}
#root{{width:100%;height:100%}}
#err{{position:fixed;left:12px;bottom:12px;right:12px;display:none;background:#3a0d16;border:1px solid #ff5d7a;border-radius:10px;padding:10px 14px}}
</style></head>
<body><div id="wrap"><div id="root"></div></div><div id="err"></div>
<script type="module">
try {{ await import("./player.js"); }}
catch (e) {{ const b = document.getElementById("err"); b.style.display = "block"; b.textContent = "Interactive preview failed to load: " + (e && e.message || e); }}
</script></body></html>
"""


def player_page(title: str) -> str:
    safe = str(title).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return PLAYER_PAGE.format(title=safe)


def build_player_bundle(scene: Path, duration: float, out_js: Path, timeout: int = 240) -> Check:
    """Bundle scene.tsx + Player into out_js. Returns Check (never raises)."""
    s = get_settings()
    try:
        job = out_js.with_suffix(".job.json")
        job.write_text(json.dumps({
            "scene": str(scene.resolve()),
            "out": str(out_js.resolve()),
            "durationInFrames": max(1, round(duration * s.fps)),
        }))
        check = _node("player.mjs", str(job.resolve()), timeout=timeout)
        return check
    except Exception as e:  # subprocess/timeout failures are non-fatal
        log.warning("player bundle failed for %s: %s", scene, e)
        return Check(False, str(e)[:500])
