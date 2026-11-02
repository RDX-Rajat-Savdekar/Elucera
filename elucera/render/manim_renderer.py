import ast
import shutil
from pathlib import Path

from elucera.config import get_settings
from elucera.render.base import Check
from elucera.render.sandbox import docker_run, tail

# Mirrors remotion/src/theme.ts.
THEME = {"BG": "#0B0F19", "FG": "#F5F7FA", "MUTED": "#8A93A6", "ACCENT": "#4CC9F0", "ACCENT2": "#F72585", "ACCENT3": "#FFD166", "GOOD": "#06D6A0"}

HEADER = f'''from manim import *

config.pixel_width = 1080
config.pixel_height = 1920
config.frame_width = 9
config.frame_height = 16
config.frame_rate = 30
config.background_color = "{THEME["BG"]}"
{chr(10).join(f'{k} = "{v}"' for k, v in THEME.items())}
Text.set_default(font="Noto Sans", weight=BOLD)
# Safe area: keep content between y=-4 (captions below) and y=6.4 (IG UI above).
SAFE_TOP = 6.4
SAFE_BOTTOM = -4
from elucera_kit import *  # house components: MArray, MGrid, MLinkedList, MBinaryTree, MGraph, Icon, ...

'''
KIT = Path(__file__).with_name("manim_kit.py")
ASSETS = Path(__file__).with_name("manim_assets")

BLOCKED_MODULES = {"os", "sys", "subprocess", "socket", "shutil", "pathlib", "requests", "urllib", "http", "importlib", "ctypes", "multiprocessing", "builtins"}
BLOCKED_CALLS = {"open", "exec", "eval", "compile", "__import__", "input"}


class ManimRenderer:
    suffix = ".py"
    scene_name = "Seg"

    def validate(self, code: str) -> Check:
        try:
            tree = ast.parse(HEADER + code)
        except SyntaxError as e:
            return Check(False, f"SyntaxError: {e.msg} (line {e.lineno - HEADER.count(chr(10))}): {e.text}")
        errors = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module or ""]
                for n in names:
                    if n.split(".")[0] in BLOCKED_MODULES:
                        errors.append(f"Import not allowed: {n}")
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
                errors.append(f"Call not allowed: {node.func.id}()")
        if not any(isinstance(n, ast.ClassDef) and n.name == self.scene_name for n in tree.body):
            errors.append(f"Define exactly one Scene subclass named `{self.scene_name}`.")
        return Check(not errors, "\n".join(errors))

    def render(self, code: str, duration: float, out: Path) -> Check:
        work = out.parent / f"{out.stem}_manim"
        shutil.rmtree(work, ignore_errors=True)
        work.mkdir(parents=True)
        (work / "scene.py").write_text(HEADER + code)
        shutil.copy(KIT, work / "elucera_kit.py")
        shutil.copytree(ASSETS / "icons", work / "icons")
        proc = docker_run(
            get_settings().manim_image,
            work,
            ["manim", "render", "-q", "h", "--fps", "30", "-r", "1080,1920", "--disable_caching",
             "--media_dir", "/work/media", "-o", "seg.mp4", "scene.py", self.scene_name],
        )
        found = list(work.glob("media/videos/**/seg.mp4"))
        if proc.returncode != 0 or not found:
            return Check(False, tail(proc.stderr or proc.stdout))
        shutil.move(str(found[0]), out)
        shutil.rmtree(work, ignore_errors=True)
        return Check(True)
