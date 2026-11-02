"""Per-reel cost + time reports for the analytics dashboard.

Measured where we can (usage.jsonl rows written by every Muse/Gemini call since 2026-11-02), estimated from saved
artifacts otherwise (older jobs): code files give output tokens, prompt sizes give input tokens. Every number says
which it is. Prices are public list prices (config.py) and can be overridden in .env.

Only a job's FIRST run counts toward time-to-reel (until its first `done` event); later redos/rebakes are tracked
as separate "iteration" cost so idle time between them never inflates the pipeline's speed numbers.
"""

import json
import statistics
from pathlib import Path

from elucera import usage
from elucera.config import get_settings

ORDER = ["script", "voice", "align", "plan", "render", "assemble"]
CHARS_PER_TOKEN = 3.2  # TSX/Python source
# Measured on real calls (2026-11-02): coder prompt ≈ 2.5k input tokens; reasoning ≈ 0.55× visible output at default effort.
EST = {"coder_input": 2500, "reasoning_ratio": 0.55, "plan": (930, 2360), "script": (900, 1500)}

# Muse contributor tier: one source (unconfirmed) lists $0.10 / $0.20 per M for data-sharing accounts.
CONTRIBUTOR = {"input": 0.10, "output": 0.20}

COMPETITORS = [
    # name, kind, $ per finished minute (low, high), basis, source
    ("elucera (this pipeline)", "code-rendered animation", None, None, "median reel: Muse contributor rate → Muse list price", ""),
    ("Freelance 2D animator", "human", 1000, 3000, "per finished minute", "https://maverickframe.com/blog/explainer-video-cost/"),
    ("Animation studio / agency", "human", 3000, 10000, "per finished minute", "https://www.contentbeta.com/blog/explainer-video-cost/"),
    ("Google Veo 3.1 (API)", "generative video", 6, 24, "$0.10–0.40 per generated second, 1080p", "https://wavespeed.ai/blog/cost-and-billing/google-veo-3-pricing/"),
    ("OpenAI Sora 2 (API)", "generative video", 6, 42, "$0.10/s 720p – $0.70/s Pro 1080p", "https://magichour.ai/blog/sora-2-pricing"),
    ("Synthesia Starter", "avatar video SaaS", 1.8, 2.9, "$18–29/mo for ~10 min/mo", "https://fluxnote.io/guides/ai-video-tool-pricing-answered"),
    ("Pictory Starter", "stock-footage SaaS", 0.12, 0.15, "$23–29/mo, ~200 min/mo cap", "https://frameloop.ai/blog/ai-video-generator-pricing-compared"),
]


def _rows(f: Path) -> list[dict]:
    if not f.exists():
        return []
    out = []
    for line in f.read_text().splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            continue
    return out


def _price(row: dict) -> float:
    s = get_settings()
    p = row.get("provider")
    if p == "muse":
        contributor = "contributor" in (row.get("model") or "")
        pin, pout = (CONTRIBUTOR["input"], CONTRIBUTOR["output"]) if contributor else (s.price_muse_input_per_m, s.price_muse_output_per_m)
        cached = row.get("cached_tokens", 0)
        return ((row.get("input_tokens", 0) - cached) * pin + cached * min(pin, s.price_muse_cached_input_per_m)
                + row.get("output_tokens", 0) * pout) / 1e6
    if p == "gemini-tts":
        return (row.get("input_tokens", 0) * s.price_tts_input_per_m + row.get("audio_tokens", 0) * s.price_tts_audio_output_per_m) / 1e6
    return 0.0


def _list_price(row: dict) -> float:
    """Same call at Muse's standard (non-contributor) list price, for a conservative comparison."""
    if row.get("provider") != "muse":
        return _price(row)
    s = get_settings()
    return (row.get("input_tokens", 0) * s.price_muse_input_per_m + row.get("output_tokens", 0) * s.price_muse_output_per_m) / 1e6


def _estimate_usage(d: Path, events: list[dict], voice_s: float) -> list[dict]:
    """Reconstruct model calls for jobs that predate the usage ledger."""
    rows = []
    model = get_settings().muse_model
    if any(e.get("type") == "stage" and e.get("stage") == "script" and "approved" not in e.get("label", "").lower() for e in events):
        rows.append({"provider": "muse", "model": model, "purpose": "script", "input_tokens": EST["script"][0], "output_tokens": EST["script"][1]})
    rows.append({"provider": "muse", "model": model, "purpose": "plan", "input_tokens": EST["plan"][0], "output_tokens": EST["plan"][1]})
    for f in sorted(d.glob("seg*_try*.*")):
        if f.suffix not in (".tsx", ".py"):
            continue
        out = len(f.read_text()) / CHARS_PER_TOKEN
        fix = not f.stem.endswith("try1")
        rows.append({"provider": "muse", "model": model, "purpose": f"{f.stem}:{'fix' if fix else 'code'}",
                     "input_tokens": round(EST["coder_input"] + (out if fix else 0)),
                     "output_tokens": round(out * (1 + EST["reasoning_ratio"]))})
    rows.append({"provider": "gemini-tts", "model": "gemini", "purpose": "voice", "input_tokens": 200, "audio_tokens": round(voice_s * 25)})
    return rows


def job_report(d: Path) -> dict | None:
    try:
        state = json.loads((d / "state.json").read_text())
    except (OSError, ValueError):
        return None
    events = _rows(d / "events.jsonl")
    if not events:
        return None
    first_done = next((i for i, e in enumerate(events) if e.get("type") == "done"), None)
    first = events[: first_done + 1] if first_done is not None else events
    marks = [(e["t"], e["stage"]) for e in first if e.get("type") == "stage" and e.get("stage") in ORDER]
    stages: dict[str, float] = {}
    for (t, s), (t2, _) in zip(marks, marks[1:] + [(first[-1]["t"], None)]):
        stages.setdefault(s, round(max(0.0, t2 - t), 1))
    voice = next((e for e in first if e.get("type") == "voice"), {})
    voice_s = float(voice.get("duration") or 0)
    renders = sum(1 for e in events if e.get("type") == "scene" and e.get("status") == "rendering")
    scenes = {e["index"] for e in first if e.get("type") == "scene" and "index" in e}
    attempts = [e.get("attempt", 1) for e in first if e.get("type") == "scene" and e.get("status") in ("done", "fallback")]

    rows = usage.read(d)
    pid = (d / "pitch_id.txt").read_text().strip() if (d / "pitch_id.txt").exists() else None
    if pid:
        rows = usage.read(get_settings().outputs_dir / "pitches" / pid) + rows
    measured = bool(rows)
    if not measured:
        rows = _estimate_usage(d, first, voice_s)
    # split first-run spend from later iteration (redos/rebakes)
    t_end = first[-1]["t"] if first_done is not None else float("inf")
    run_rows = [r for r in rows if r.get("t", 0) <= t_end]
    iter_rows = [r for r in rows if r.get("t", 0) > t_end]

    s = get_settings()
    total_s = round(first[-1]["t"] - first[0]["t"], 1) if first_done is not None else None
    compute = (total_s or 0) / 3600 * s.price_compute_per_hour
    remotion = renders * s.price_remotion_per_render
    muse = sum(_price(r) for r in run_rows if r.get("provider") == "muse")
    tts = sum(_price(r) for r in run_rows if r.get("provider") == "gemini-tts")
    tokens = {k: sum(r.get(k, 0) for r in run_rows if r.get("provider") == "muse")
              for k in ("input_tokens", "output_tokens", "reasoning_tokens")}
    by_purpose: dict[str, float] = {}
    for r in run_rows:
        key = r.get("purpose") or "other"
        key = {"code": "scene code", "fix": "scene fixes"}.get(key.split(":")[-1], key) if ":" in key else key
        by_purpose[key] = by_purpose.get(key, 0) + _price(r)
    total = muse + tts + compute + remotion
    return {
        "id": d.name, "topic": state.get("topic", ""), "status": state.get("status"),
        "created": state.get("created"), "measured": measured, "finished_first_run": first_done is not None,
        "reel_seconds": round(voice_s, 1), "time_to_reel_s": total_s, "stages": stages,
        "scenes": len(scenes), "attempts_mean": round(statistics.mean(attempts), 2) if attempts else None,
        "renders": renders, "voice_provider": voice.get("provider"), "voice_cached": bool(voice.get("cached")),
        "tokens": tokens, "model_seconds": round(sum(r.get("seconds", 0) for r in run_rows), 1) if measured else None,
        "cost": {"muse": round(muse, 4), "tts": round(tts, 4), "compute": round(compute, 4), "remotion": round(remotion, 4),
                 "total": round(total, 4), "muse_list_price": round(sum(_list_price(r) for r in run_rows if r.get("provider") == "muse"), 4),
                 "iteration": round(sum(_price(r) for r in iter_rows), 4), "by_purpose": {k: round(v, 4) for k, v in by_purpose.items()}},
        "cost_per_minute": round(total / (voice_s / 60), 3) if voice_s else None,
    }


def dashboard() -> dict:
    out = get_settings().outputs_dir
    reports = [r for d in sorted(out.glob("*/")) if d.name != "pitches" for r in [job_report(d)] if r]
    done = [r for r in reports if r["finished_first_run"]]
    med = lambda xs: round(statistics.median(xs), 3) if xs else None  # noqa: E731
    stage_med = {s: med([r["stages"][s] for r in done if s in r["stages"]]) for s in ORDER}
    pitch_rows = [row for p in (out / "pitches").glob("*/") for row in usage.read(p)] if (out / "pitches").exists() else []
    s = get_settings()
    return {
        "reels": sorted(reports, key=lambda r: -(r["created"] or 0)),
        "summary": {
            "reels": len(reports), "finished": len(done),
            "median_time_s": med([r["time_to_reel_s"] for r in done]),
            "median_cost": med([r["cost"]["total"] for r in done]),
            "median_cost_list_price": med([r["cost"]["total"] - r["cost"]["muse"] + r["cost"]["muse_list_price"] for r in done]),
            "median_cost_per_minute": med([r["cost_per_minute"] for r in done if r["cost_per_minute"]]),
            "median_reel_seconds": med([r["reel_seconds"] for r in done]),
            "stage_median_s": stage_med,
            "measured_reels": sum(1 for r in done if r["measured"]),
            "pitch_spend": round(sum(_price(r) for r in pitch_rows), 4),
        },
        "prices": {k: v for k, v in s.model_dump().items() if k.startswith("price_")} | {"muse_model": s.muse_model,
                   "muse_contributor_note": "contributor-tier Muse priced at $0.10/$0.20 per M (single unconfirmed source); list price shown alongside"},
        "competitors": [{"name": n, "kind": k, "low": lo, "high": hi, "basis": b, "source": src} for n, k, lo, hi, b, src in COMPETITORS],
    }
