from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    muse_api_key: str = ""
    muse_base_url: str = ""
    muse_model: str = "muse-spark-1.3"
    muse_reasoning_effort: str = ""  # script + plan calls: "" = provider default
    # Scene code calls. Benchmarked 2026-11-02 on two real scenes: default 50–102s, medium 62s (cleanest layout),
    # low 22–34s (one text overlap). All valid + rendered. "" restores the provider default.
    muse_code_effort: str = "medium"

    # Unit prices for the per-reel cost ledger (USD). Public list prices as of 2026-11; override in .env.
    price_muse_input_per_m: float = 1.25
    price_muse_cached_input_per_m: float = 0.15
    price_muse_output_per_m: float = 4.25
    price_tts_input_per_m: float = 0.50
    price_tts_audio_output_per_m: float = 10.0  # 25 audio tokens per second of speech
    price_compute_per_hour: float = 0.34  # cloud box that renders (≈ 8 vCPU on-demand)
    price_remotion_per_render: float = 0.01  # Remotion Company License "Automators" tier; 0 for teams of ≤ 3
    prefetch_on_pitch: bool = True  # record the voice + plan the scenes while the user reviews the storyboard

    gemini_api_key: str = ""
    gemini_api_keys: str = ""  # optional comma-separated pool, rotated as keys hit their quota
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    gemini_tts_voice: str = "Puck"
    fallback_voice: str = "Samantha"  # macOS `say` voice used when Gemini's quota is exhausted; "" disables

    fps: int = 30
    width: int = 1080
    height: int = 1920
    max_render_attempts: int = 3
    render_timeout_s: int = 120
    outputs_dir: Path = ROOT / "outputs"
    remotion_dir: Path = ROOT / "remotion"
    library_dir: Path = ROOT / "library"
    chats_dir: Path = ROOT / "chats"
    analytics_dir: Path = ROOT / "analytics"
    cache_dir: Path = ROOT / "cache"  # TTS + rendered-scene cache (gitignored)
    use_cache: bool = True  # reuse identical voiceovers and scenes instead of regenerating them
    auto_retry_delay_s: float = 4.0  # pause before the single automatic resume after a transient failure
    use_library: bool = True  # feed past scenes + lessons into coder prompts, save new successes

    ffmpeg: str = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"  # needs libass for captions
    ffprobe: str = "/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
    node: str = "/opt/homebrew/bin/node"
    docker: str = "/opt/homebrew/bin/docker"
    manim_image: str = "manimcommunity/manim:stable"
    whisper_model: str = "base.en"
    caption_font: str = "Arial Black"
    caption_fonts_dir: str = "/System/Library/Fonts/Supplemental"
    music_path: Path | None = None  # optional background bed, ducked under the narration
    final_preset: str = "veryfast"  # x264 preset for the final encode ("medium" is ~2x slower, slightly smaller file)
    remotion_concurrency: int = 2  # parallel Remotion renders (each uses several Chrome tabs)


    @property
    def gemini_keys(self) -> list[str]:
        pool = [k.strip() for k in self.gemini_api_keys.split(",")]
        return list(dict.fromkeys(k for k in [*pool, self.gemini_api_key] if k))


@lru_cache
def get_settings() -> Settings:
    return Settings()
