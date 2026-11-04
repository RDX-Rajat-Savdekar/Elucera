from elucera.agents.coders.base import Coder
from elucera.prompts import load
from elucera.render.seek_renderer import SeekRenderer


def seek_coder() -> Coder:
    system = load("seek_code")
    return Coder(system=system, renderer=SeekRenderer())
