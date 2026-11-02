import pytest
from pydantic import ValidationError

from elucera.assemble.ffmpeg import pad_seconds
from elucera.llm import complete_json
from elucera.models import Script
from elucera.render.manim_renderer import ManimRenderer


def test_pad_seconds():
    assert pad_seconds(3.0, 4.5) == 1.5
    assert pad_seconds(5.0, 4.5) == 0.0


SEGS = [{"role": r, "narration": "n", "visual_directive": "v"} for r in ["hook", "setup", "mechanism", "payoff"]]


class FakeLLM:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.prompts = []

    def complete(self, system, user):
        self.prompts.append(user)
        return self.replies.pop(0)


def test_complete_json_parses_fenced_json():
    import json

    llm = FakeLLM("```json\n" + json.dumps({"title": "t", "idea": "i", "segments": SEGS}) + "\n```")
    assert complete_json(llm, "sys", "topic", Script).segments[2].role == "mechanism"


def test_complete_json_retries_with_error_then_raises():
    import json

    bad = json.dumps({"title": "t", "idea": "i", "segments": SEGS[:3]})
    llm = FakeLLM(bad, bad)
    with pytest.raises(ValidationError):
        complete_json(llm, "sys", "topic", Script)
    assert "previous answer was invalid" in llm.prompts[1]


def test_manim_validation_blocks_os_and_requires_seg():
    r = ManimRenderer()
    assert r.validate("class Seg(Scene):\n    def construct(self):\n        self.wait(1)\n").ok
    bad = r.validate("import subprocess\nclass Other(Scene): pass\n")
    assert not bad.ok and "subprocess" in bad.error and "Seg" in bad.error
