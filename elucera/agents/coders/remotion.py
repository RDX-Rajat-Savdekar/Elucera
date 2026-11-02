from elucera.agents.coders.base import Coder
from elucera.prompts import load
from elucera.render.remotion_renderer import RemotionRenderer


def remotion_coder() -> Coder:
    system = load("remotion_code").replace("{{THREE_IMPORTS}}", "").replace("{{KIT}}", load("kit"))
    return Coder(system=system, renderer=RemotionRenderer())
