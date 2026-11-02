from pathlib import Path

from elucera.config import get_settings
from elucera.models import WordTiming

# ASS colours are &HAABBGGRR.
WHITE = "&H00FFFFFF"
ACTIVE = "&H0066D1FF"  # theme.accent3 #FFD166
OUTLINE = "&H00000000"


def chunk(words: list[WordTiming], size: int = 3, max_gap: float = 0.6) -> list[list[WordTiming]]:
    """Group words into caption chunks of <= size words, breaking on sentence ends and pauses."""
    chunks: list[list[WordTiming]] = []
    cur: list[WordTiming] = []
    for w in words:
        if cur and (len(cur) >= size or w.start - cur[-1].end > max_gap or cur[-1].word[-1] in ".?!"):
            chunks.append(cur)
            cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


def _ts(t: float) -> str:
    cs = max(0, round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


def to_ass(words: list[WordTiming]) -> str:
    """One dialogue event per word: the whole chunk is shown, with the spoken word highlighted."""
    s = get_settings()
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {s.width}
PlayResY: {s.height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{s.caption_font},86,{WHITE},{WHITE},{OUTLINE},&H80000000,1,0,0,0,100,100,0,0,1,7,3,2,80,80,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for group in chunk(words):
        for i, w in enumerate(group):
            start = w.start
            end = group[i + 1].start if i + 1 < len(group) else max(w.end, w.start + 0.25)
            text = " ".join(
                f"{{\\c{ACTIVE}\\fscx110\\fscy110}}{_esc(g.word.upper())}{{\\r}}" if j == i else _esc(g.word.upper())
                for j, g in enumerate(group)
            )
            lines.append(f"Dialogue: 0,{_ts(start)},{_ts(end)},Cap,,0,0,0,,{text}")
    return head + "\n".join(lines) + "\n"


def write_ass(words: list[WordTiming], out: Path) -> Path:
    out.write_text(to_ass(words))
    return out
