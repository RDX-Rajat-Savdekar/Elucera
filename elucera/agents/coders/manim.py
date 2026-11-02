from elucera.agents.coders.base import Coder
from elucera.prompts import load
from elucera.render.manim_renderer import ManimRenderer


def manim_coder() -> Coder:
    return Coder(system=load("manim_code") + "\n\n" + load("manim_kit"), renderer=ManimRenderer())
