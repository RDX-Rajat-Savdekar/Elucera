import json
import re
from typing import Protocol, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from elucera.config import get_settings

T = TypeVar("T", bound=BaseModel)

_FENCE = re.compile(r"```(?:\w+)?\s*\n(.*?)```", re.S)


class LLMClient(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class MuseClient:
    """Muse Spark via its OpenAI-compatible API."""

    def __init__(self, model: str | None = None, effort: str | None = None):
        s = get_settings()
        if not s.muse_base_url or not s.muse_api_key:
            raise RuntimeError("MUSE_BASE_URL and MUSE_API_KEY must be set in .env")
        self.client = OpenAI(base_url=s.muse_base_url, api_key=s.muse_api_key)
        self.model = model or s.muse_model
        self.effort = (effort if effort is not None else s.muse_reasoning_effort) or None

    def complete(self, system: str, user: str) -> str:
        import time

        from elucera import usage

        t = time.perf_counter()
        kw = {"reasoning_effort": self.effort} if self.effort else {}
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            **kw,
        )
        u = getattr(resp, "usage", None)
        if u is not None:
            details = getattr(u, "completion_tokens_details", None)
            cached = getattr(getattr(u, "prompt_tokens_details", None), "cached_tokens", None)
            usage.record("muse", self.model, input_tokens=u.prompt_tokens or 0, output_tokens=u.completion_tokens or 0,
                         reasoning_tokens=(getattr(details, "reasoning_tokens", None) or 0) if details else 0,
                         cached_tokens=cached or 0, seconds=round(time.perf_counter() - t, 2), effort=self.effort or "default")
        return resp.choices[0].message.content or ""


def extract_block(text: str) -> str:
    """Return the first fenced code block, or the text itself if there is none."""
    m = _FENCE.search(text)
    return (m.group(1) if m else text).strip()


def complete_json(llm: LLMClient, system: str, user: str, schema: type[T], retries: int = 1) -> T:
    system = (
        f"{system}\n\nRespond with only a JSON object matching this JSON schema:\n"
        f"{json.dumps(schema.model_json_schema())}"
    )
    prompt = user
    for attempt in range(retries + 1):
        raw = llm.complete(system, prompt)
        try:
            return schema.model_validate_json(extract_block(raw))
        except ValidationError as e:
            if attempt == retries:
                raise
            prompt = f"{user}\n\nYour previous answer was invalid:\n{e}\nReturn corrected JSON only."
    raise AssertionError("unreachable")
