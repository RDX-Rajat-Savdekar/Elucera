"""Render the Manim kit gallery (tests/fixtures/manim_kit_gallery.py) and save one still per section.

    uv run python tests/render_manim_gallery.py      → outputs/_kit_gallery/stills/<section>.png

Runs the real renderer path (Docker, no network, no models). Not part of pytest: it needs Docker and ~30s.
"""

import shutil
import subprocess
import sys

from elucera.config import ROOT, get_settings
from elucera.render.manim_renderer import ASSETS, HEADER, KIT
from elucera.render.sandbox import docker_run

out = ROOT / "outputs" / "_kit_gallery"  # must live under $HOME so Colima can mount it
shutil.rmtree(out, ignore_errors=True)
work = out / "work"
work.mkdir(parents=True)
(work / "scene.py").write_text(HEADER + (ROOT / "tests/fixtures/manim_kit_gallery.py").read_text())
shutil.copy(KIT, work / "elucera_kit.py")
shutil.copytree(ASSETS / "icons", work / "icons")
p = docker_run(get_settings().manim_image, work, ["manim", "render", "-q", "h", "--fps", "30", "-r", "1080,1920", "--disable_caching",
                                                  "--media_dir", "/work/media", "-o", "seg.mp4", "scene.py", "Seg"], timeout=900)
if p.returncode:
    sys.exit(p.stderr[-4000:])
video = out / "gallery.mp4"
shutil.move(str(next(work.glob("media/videos/**/seg.mp4"))), video)
stills = out / "stills"
stills.mkdir()
for line in p.stdout.splitlines():
    if line.startswith("SECTION"):
        _, name, t = line.split()
        subprocess.run([get_settings().ffmpeg, "-v", "error", "-y", "-ss", f"{float(t) + 0.6:.2f}", "-i", str(video), "-frames:v", "1", str(stills / f"{name}.png")], check=True)
        print(stills / f"{name}.png")
