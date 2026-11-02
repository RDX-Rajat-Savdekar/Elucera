import subprocess
from pathlib import Path

from elucera.config import get_settings


def _run(args: list[str]) -> None:
    proc = subprocess.run([get_settings().ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.strip()[-2000:]}")


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        [get_settings().ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def pad_seconds(clip: float, target: float) -> float:
    """How long to freeze the last frame so a clip of length `clip` covers `target` (0 if already long enough)."""
    return max(0.0, round(target - clip, 3))


def fit_clip(src: Path, duration: float, out: Path) -> Path:
    """Normalize a clip to 1080x1920@30fps, exactly `duration` seconds (freeze last frame if short, trim if long)."""
    s = get_settings()
    pad = pad_seconds(probe_duration(src), duration)
    vf = (
        f"scale={s.width}:{s.height}:force_original_aspect_ratio=decrease,"
        f"pad={s.width}:{s.height}:(ow-iw)/2:(oh-ih)/2:color=0x0B0F19,fps={s.fps},setsar=1"
    )
    if pad:
        vf += f",tpad=stop_mode=clone:stop_duration={pad}"
    _run(["-i", str(src), "-vf", vf, "-t", f"{duration:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", str(out)])
    return out


def concat(clips: list[Path], out: Path) -> Path:
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips))
    _run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)])
    return out


def finalize(video: Path, audio: Path, captions: Path, out: Path, music: Path | None = None) -> Path:
    """Mux narration (+ optional ducked music bed) and burn captions."""
    s = get_settings()
    ass = str(captions.resolve()).replace(":", r"\:").replace("'", r"\'")
    vf = f"subtitles='{ass}':fontsdir='{s.caption_fonts_dir}'"
    args = ["-i", str(video), "-i", str(audio)]
    if music:
        args += ["-stream_loop", "-1", "-i", str(music)]
        fc = (
            f"[0:v]{vf}[v];"
            "[2:a]volume=0.25[m];[1:a]asplit[n][key];"
            "[m][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];"
            "[n][duck]amix=inputs=2:duration=first:normalize=0[a]"
        )
        args += ["-filter_complex", fc, "-map", "[v]", "-map", "[a]"]
    else:
        args += ["-vf", vf, "-map", "0:v", "-map", "1:a"]
    args += ["-c:v", "libx264", "-preset", s.final_preset, "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(s.fps),
             "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)]
    _run(args)
    return out
