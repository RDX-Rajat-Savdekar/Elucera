from pathlib import Path
from typing import NamedTuple, Protocol


class Check(NamedTuple):
    ok: bool
    error: str = ""


class Renderer(Protocol):
    suffix: str

    def validate(self, code: str) -> Check: ...

    def render(self, code: str, duration: float, out: Path) -> Check: ...
