from elucera.agents.coders.base import Coder, build_scene
from elucera.agents.coders.manim import manim_coder
from elucera.agents.coders.remotion import remotion_coder
from elucera.agents.coders.three import three_coder
from elucera.models import Renderer

from elucera.agents.coders.seek import seek_coder

CODERS = {Renderer.manim: manim_coder, Renderer.remotion: remotion_coder, Renderer.three: three_coder,
          Renderer.seek: seek_coder}


def coder_for(renderer: Renderer) -> Coder:
    return CODERS[renderer]()


__all__ = ["Coder", "build_scene", "coder_for"]
