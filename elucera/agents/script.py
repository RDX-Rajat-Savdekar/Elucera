from elucera.llm import LLMClient, complete_json
from elucera.models import Script
from elucera.prompts import load


def write_script(llm: LLMClient, topic: str) -> Script:
    return complete_json(llm, load("script"), f"Topic: {topic}", Script)
