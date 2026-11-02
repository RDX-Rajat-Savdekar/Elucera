import pytest

from elucera import library
from elucera.config import get_settings
from elucera.models import Beat, Renderer, SceneSpec


@pytest.fixture(autouse=True)
def tmp_library(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "library_dir", tmp_path)


def spec(renderer=Renderer.remotion, desc="packets travel between client and server nodes"):
    return SceneSpec(index=0, renderer=renderer, duration=3.0, description=desc, beats=[Beat(t=0.5, word="SYN", action="packet moves")])


def test_save_and_rank_similar_scenes():
    library.save_scene(spec(desc="bars swap during quicksort partition"), "// bars", None, topic="quicksort")
    library.save_scene(spec(desc="client server handshake packets"), "// packets", None, topic="tcp")
    library.save_scene(spec(Renderer.manim, "client server packets"), "# manim", None, topic="tcp")
    got = library.similar(spec(), k=1)
    assert [code for _, code in got] == ["// packets"]  # same renderer only, best overlap first


def test_starred_scene_is_preferred():
    a = library.save_scene(spec(desc="client server packets"), "// a", None, topic="t")
    b = library.save_scene(spec(desc="unrelated molecule"), "// b", None, topic="t")
    library.set_star(b.id, True)
    assert library.similar(spec(), k=1)[0][0].id == b.id


def test_lessons_dedupe_skip_infra_and_share_tsx_group():
    library.add_lesson(Renderer.three, "Scene.tsx(3,4): error TS2322: bad prop")
    library.add_lesson(Renderer.three, "Scene.tsx(9,1): error TS2322: bad prop")
    library.add_lesson(Renderer.remotion, "env: node: No such file or directory")
    assert [l["error"] for l in library.lessons(Renderer.remotion)] == ["Scene.tsx: error TS2322: bad prop"]
    assert library.lessons(Renderer.manim) == []


def test_prompt_context_includes_examples_and_pitfalls():
    library.save_scene(spec(), "// kit scene <Stage title='x'><Slot area='main'/></Stage>", None, topic="tcp")
    library.add_lesson(Renderer.remotion, "Banned: Math.random", note="use random(seed)")
    ctx = library.prompt_context(spec())
    assert "// kit scene" in ctx and "Math.random → use random(seed)" in ctx


def test_pre_kit_scenes_are_not_shown_as_examples():
    """Old hand-drawn scenes would teach the verbose style the kit replaces."""
    library.save_scene(spec(), "// 400 lines of hand-drawn svg", None, topic="tcp")
    assert "hand-drawn" not in library.prompt_context(spec())
