import re
from pathlib import Path

from elucera.config import get_settings
from elucera.models import WordTiming
from elucera.render.base import Check
from elucera.render.remotion_renderer import RemotionRenderer

STOP = set("a an the and or but of to in on at for is are was were be it its this that with as by from you your we our they".split())


def keywords(words: list[WordTiming], n: int = 4) -> list[dict]:
    """Pick up to n salient words (longest non-stopwords), in spoken order, with their frame times."""
    clean = [(w, re.sub(r"[^\w'-]", "", w.word)) for w in words]
    cands = [(w, c) for w, c in clean if c and c.lower() not in STOP]
    top = sorted(cands, key=lambda wc: -len(wc[1]))[:n]
    top.sort(key=lambda wc: wc[0].start)
    return [{"text": c.upper(), "at": round(w.start * get_settings().fps)} for w, c in top]


def render_fallback(title: str, words: list[WordTiming], duration: float, out: Path) -> Check:
    scene = get_settings().remotion_dir / "src/fallback/Fallback.tsx"
    props = {"title": title, "keywords": keywords(words)}
    return RemotionRenderer().render_file(scene, duration, out, props)
