"""Offline unit tests for the seek (doodle/kinetic) harness. No network, no browser."""

from pathlib import Path

from elucera.prompts import load
from elucera.render.seek_renderer import PINNED_SCRIPTS, SeekRenderer

GOOD = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<style>html,body{margin:0;width:1080px;height:1920px;background:#0B0F19}</style>
</head><body>
<svg width="1080" height="1920" viewBox="0 0 1080 1920">
<text id="h" x="540" y="300" font-size="96" fill="#F5F7FA">Hi</text>
</svg>
<script>
window.__seek = (t) => {
  const k = Math.min(1, Math.max(0, (t - 0.4) / 0.5));
  document.getElementById("h").setAttribute("opacity", k.toFixed(3));
};
window.__seek(0);
</script></body></html>
"""


def _v(code: str = GOOD):
    return SeekRenderer().validate(code)


def test_suffix():
    assert SeekRenderer().suffix == ".html"


def test_validate_accepts_good_scene():
    assert _v().ok


def test_validate_rejects_empty():
    assert not _v("").ok
    assert not _v("   ").ok


def test_validate_rejects_missing_seek():
    code = GOOD.replace("window.__seek = (t) => {", "window.__draw = (t) => {").replace("window.__seek(0);", "")
    assert "seek" in _v(code).error.lower()


def test_validate_rejects_wrong_size():
    assert "1080" in _v(GOOD.replace("1080", "720")).error


def test_validate_rejects_unpinned_cdn():
    code = GOOD.replace("</head>", '<script src="https://evil.example/x.js"></script></head>')
    check = _v(code)
    assert not check.ok and "evil.example" in check.error


def test_validate_allows_pinned_cdn():
    for url in PINNED_SCRIPTS:
        code = GOOD.replace("</head>", f'<script src="{url}"></script></head>')
        assert _v(code).ok, url


def test_validate_rejects_nondeterminism():
    for snippet in ("Math.random()", "Date.now()", "new Date()", "performance.now()", "fetch('/api')"):
        code = GOOD.replace("const k = Math.min", f"const r = {snippet}; const k = Math.min")
        assert not _v(code).ok, snippet


def test_prompt_contract_pins_same_cdn_and_seek():
    prompt = load("seek_code")
    assert "window.__seek" in prompt
    assert "1080x1920" in prompt or ("1080" in prompt and "1920" in prompt)
    for url in PINNED_SCRIPTS:
        assert url in prompt, url


def test_kit_doc_exists_and_names_gates():
    doc = Path(__file__).resolve().parent.parent / "docs" / "SEEK_HARNESS.md"
    text = doc.read_text()
    for token in ("__seek", "1080x1920", "PINNED_SCRIPTS", "fallback", "deterministic"):
        assert token.lower() in text.lower(), token


def test_render_without_driver_fails_gracefully(tmp_path, monkeypatch):
    import elucera.render.seek_renderer as m

    monkeypatch.setitem(__import__("sys").modules, "playwright", None)
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *a, **k):
        if name == "playwright.sync_api" or name.startswith("playwright"):
            raise ImportError("blocked")
        return real_import(name, *a, **k)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    monkeypatch.setattr(m.shutil, "which", lambda *a, **k: None)
    monkeypatch.delenv("CHROME_PATH", raising=False)
    out = tmp_path / "seg.mp4"
    check = SeekRenderer().render(GOOD, 1.0, out)
    assert not check.ok
    assert "playwright" in check.error.lower() or "chromium" in check.error.lower()
    assert not out.exists()


def test_render_rejects_invalid_code_without_browser(tmp_path):
    out = tmp_path / "seg.mp4"
    check = SeekRenderer().render("not html at all", 1.0, out)
    assert not check.ok
    assert not out.exists()
