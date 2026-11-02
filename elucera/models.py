from enum import Enum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator

SegmentRole = Literal["hook", "setup", "mechanism", "payoff"]
ROLE_ORDER: list[SegmentRole] = ["hook", "setup", "mechanism", "payoff"]


class Segment(BaseModel):
    role: SegmentRole
    narration: str
    visual_directive: str


class Script(BaseModel):
    title: str
    idea: str = Field(description="The one sharp idea the reel explains")
    segments: list[Segment]

    @field_validator("segments")
    @classmethod
    def four_parts_in_order(cls, v: list[Segment]) -> list[Segment]:
        if [s.role for s in v] != ROLE_ORDER:
            raise ValueError(f"segments must be exactly {ROLE_ORDER} in order")
        return v


class WordTiming(BaseModel):
    word: str
    start: float
    end: float


class Renderer(str, Enum):
    manim = "manim"
    remotion = "remotion"
    three = "three"


class Beat(BaseModel):
    t: float = Field(description="Seconds from segment start")
    word: str
    action: str


class PlannedScene(BaseModel):
    renderer: Renderer
    description: str
    beats: list[Beat]


class ScenePlan(BaseModel):
    scenes: list[PlannedScene]


class SceneSpec(BaseModel):
    index: int
    renderer: Renderer
    duration: float
    description: str
    beats: list[Beat]


class RenderResult(BaseModel):
    index: int
    renderer: Renderer
    ok: bool
    video: Path | None = None
    code: str = ""
    attempts: int = 0
    error: str = ""
    fallback: bool = False


class SegmentAudio(BaseModel):
    index: int
    wav: Path
    duration: float
    words: list[WordTiming]


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class JobState(BaseModel):
    id: str
    topic: str
    preferred_renderer: Renderer | None = None
    thread_id: str | None = None
    status: JobStatus = JobStatus.queued
    stage: str = ""
    log: list[str] = []  # every stage message, in order (the UI rebuilds per-segment progress from it)
    error: str = ""
    video: Path | None = None
    created: float = 0.0
    finished: float = 0.0
