import logging
import re
import time
import uuid
from pathlib import Path

import typer

from elucera.config import get_settings

app = typer.Typer(add_completion=False, help="Generate short-form science explainer reels.")
lib = typer.Typer(add_completion=False, help="Asset library: saved scenes, reels and lessons.")
app.add_typer(lib, name="library")


def _slug(topic: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")[:40] + "-" + uuid.uuid4().hex[:6]


@app.command()
def make(topic: str, out: Path = typer.Option(None, help="Job directory (default outputs/<slug>)"),
         renderer: str = typer.Option(None, help="Force one engine for every scene: manim, remotion or three")):
    """Topic → finished 1080x1920 reel."""
    from elucera.graph import run

    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    job = out or get_settings().outputs_dir / _slug(topic)
    t0 = time.time()
    def emit(type: str, **d) -> None:
        if type == "stage":
            msg = d["label"]
        elif type == "scene":
            msg = f"scene {d['index']} ({d['renderer']}): {d['status']}" + (f" — {d['error']}" if d.get("error") else "")
        elif type == "voice":
            msg = f"voice: {d['duration']}s via {d['provider']}"
        else:
            return
        typer.echo(f"[{time.time() - t0:6.1f}s] {msg}")

    final = run(topic, job, emit=emit, preferred_renderer=renderer)
    typer.echo(f"\n✓ {final}")


@app.command("render-scene")
def render_scene(file: Path, duration: float = 4.0, out: Path = typer.Option(None)):
    """Validate and render a hand-written scene (.py = Manim, .tsx = Remotion/Three)."""
    from elucera.render.manim_renderer import ManimRenderer
    from elucera.render.remotion_renderer import RemotionRenderer

    renderer = ManimRenderer() if file.suffix == ".py" else RemotionRenderer()
    code = file.read_text()
    out = out or get_settings().outputs_dir / "scenes" / f"{file.stem}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    check = renderer.validate(code)
    if check.ok:
        check = renderer.render(code, duration, out)
    if not check.ok:
        typer.echo(check.error, err=True)
        raise typer.Exit(1)
    typer.echo(f"✓ {out}")


@app.command()
def voice(text: str, out: Path = Path("outputs/voice.wav")):
    """Synthesize text and print word timings."""
    from elucera.audio.align import align
    from elucera.audio.tts import synthesize

    out.parent.mkdir(parents=True, exist_ok=True)
    dur = synthesize(text, out)
    for w in align(out, text, dur):
        typer.echo(f"{w.start:6.2f} {w.end:6.2f}  {w.word}")
    typer.echo(f"✓ {out} ({dur:.2f}s)")


@app.command()
def keys():
    """Show the Gemini key pool (no API calls are made)."""
    from datetime import datetime

    from elucera.audio.keys import get_pool

    for k in get_pool().status():
        if k["available"]:
            state = "ready"
        elif k["until"] == float("inf"):
            state = f"disabled ({k['reason']})"
        else:
            state = f"{k['reason']} until {datetime.fromtimestamp(k['until']):%b %d %H:%M}"
        mark = "→" if k["current"] else " "
        typer.echo(f"{mark} key {k['n']} {k['hint']}  {state:40} used {k['uses']}x")


@lib.command("list")
def lib_list(renderer: str = typer.Option(None, help="manim | remotion | three")):
    """List saved scenes."""
    from elucera import library
    from elucera.models import Renderer

    rows = library.scenes(Renderer(renderer) if renderer else None)
    for meta, _ in rows:
        star = "★" if meta.starred else " "
        typer.echo(f"{star} {meta.id:32} {meta.role:9} {meta.duration:5.1f}s  {meta.topic[:30]:30}  {meta.description[:60]}")
    lib_dir = get_settings().library_dir
    reels = sorted((lib_dir / "reels").glob("*/topic.txt"))
    typer.echo(f"\n{len(rows)} scenes, {len(reels)} reels, {len(library.lessons())} lessons in {lib_dir}")


@lib.command("import")
def lib_import(job_dirs: list[Path]):
    """Backfill the library from finished outputs/<job> directories."""
    from elucera import library

    for d in job_dirs:
        saved = library.import_job(d)
        typer.echo(f"✓ {d.name}: {len(saved)} scenes")


@lib.command("star")
def lib_star(scene_id: str, off: bool = typer.Option(False, "--off", help="Unstar instead")):
    """Star a scene so it is preferred as an example in future prompts."""
    from elucera import library

    library.set_star(scene_id, not off)
    typer.echo(f"{'unstarred' if off else '★ starred'} {scene_id}")


@lib.command("rm")
def lib_rm(scene_id: str):
    """Remove a scene (e.g. one that looks bad) so it is never used as an example."""
    from elucera import library

    library.remove(scene_id)
    typer.echo(f"removed {scene_id}")


@lib.command("lessons")
def lib_lessons():
    """Show recorded pitfalls fed to the coders."""
    from elucera import library

    for lesson in library.lessons():
        note = f"  → {lesson['note']}" if lesson.get("note") else ""
        typer.echo(f"[{lesson['renderer']}] {lesson['error']}{note}")


@lib.command("add-lesson")
def lib_add_lesson(renderer: str, error: str, note: str = typer.Option("", help="How to avoid it")):
    """Record a pitfall by hand."""
    from elucera import library
    from elucera.models import Renderer

    library.add_lesson(Renderer(renderer), error, note)
    typer.echo("✓ lesson added")


if __name__ == "__main__":
    app()
