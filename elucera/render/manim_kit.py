"""elucera Manim kit: general explainer components + an exhaustive DSA / LeetCode set.

Copied into every Manim render as `elucera_kit.py` and star-imported by the scene header, so scenes can write
`arr = MArray([2, 7, 11, 15]).place()` and `self.play(arr.pointer("i", 1))` without drawing anything by hand.

Conventions (mirrors the Remotion @kit):
- Every structure is a VGroup. `.place(region)` puts it in a layout region that respects the caption band
  (y < -4) and the IG chrome (x > 2.8): regions "title", "main", "below".
- Methods that change something RETURN AN ANIMATION (or AnimationGroup) for `self.play(...)`. They never play.
- Semantic states (same names + colours as Remotion): default active compare swap done found visited frontier
  path dim error.
"""

from __future__ import annotations

import os

from manim import *  # noqa: F403

# ── theme (mirrors remotion/src/theme.ts) ──
BG, FG, MUTED = "#0B0F19", "#F5F7FA", "#8A93A6"
ACCENT, ACCENT2, ACCENT3, GOOD, BAD = "#4CC9F0", "#F72585", "#FFD166", "#06D6A0", "#FF5D7A"
PANEL, LINE = "#161D2E", "#34405C"
MONO = "Noto Sans Mono"  # installed in the manimcommunity/manim image

STATES = {
    "default": (PANEL, LINE, FG),
    "active": ("#4A3B12", ACCENT3, ACCENT3),
    "compare": ("#10394A", ACCENT, FG),
    "swap": ("#4A1033", ACCENT2, FG),
    "done": ("#0D3B30", GOOD, FG),
    "found": (GOOD, GOOD, BG),
    "visited": ("#252F47", "#5A6B91", "#C9D0DC"),
    "frontier": (PANEL, ACCENT, ACCENT),
    "path": (ACCENT3, ACCENT3, BG),
    "dim": ("#0E1320", "#222A3D", "#5D6678"),
    "error": ("#4A1520", BAD, BAD),
}
POINTER_COLORS = [ACCENT3, ACCENT2, ACCENT, GOOD, "#B392F0", "#FF9F6B"]

# Layout: frame is 9 x 16 (x ∈ [-4.5, 4.5], y ∈ [-8, 8]). Usable: y ∈ [-4, 6.4], x ∈ [-4.1, 2.8].
CENTER_X = -0.65
MAX_W = 6.7
REGIONS = {"title": (CENTER_X, 5.25, 1.9), "main": (CENTER_X, 1.15, 5.6), "below": (CENTER_X, -3.0, 1.7)}


def _text(s, size=40, color=FG, mono=False, weight=BOLD):
    return Text(str(s), font_size=size, color=color, weight=weight, **({"font": MONO} if mono else {}))


def place(mob: Mobject, region: str = "main", max_w: float = MAX_W) -> Mobject:
    """Scale `mob` down to fit the region and move it there."""
    x, y, h = REGIONS[region]
    if mob.width > max_w:
        mob.scale_to_fit_width(max_w)
    if mob.height > h:
        mob.scale_to_fit_height(h)
    mob.move_to([x, y, 0])
    return mob


class KitGroup(VGroup):
    def place(self, region: str = "main", max_w: float = MAX_W):
        place(self, region, max_w)
        return self


class Recolor(Animation):
    """Colour-only animation: never touches points, so it can run alongside moves/swaps on the same object.

    (Manim's `.animate` copies the whole mobject family and would overwrite a concurrent move, and vice versa.)
    """

    def __init__(self, mob: VMobject, fill=None, stroke=None, color=None, **kw):
        self.targets = (fill, stroke, color)
        super().__init__(mob, **kw)

    def begin(self):
        m = self.mobject
        self.start = (m.get_fill_color(), m.get_stroke_color(), m.get_color())
        super().begin()

    def interpolate_mobject(self, alpha: float):
        a = self.rate_func(alpha)
        fill, stroke, color = self.targets
        m = self.mobject
        if color is not None:
            m.set_color(interpolate_color(self.start[2], ManimColor(color), a))
        if fill is not None:
            m.set_fill(interpolate_color(self.start[0], ManimColor(fill), a), opacity=1)
        if stroke is not None:
            m.set_stroke(interpolate_color(self.start[1], ManimColor(stroke), a))


def _paint(box: VMobject, label: Mobject | None, state: str):
    """State change for a cell/node: box first, then label, so the label is drawn on top afterwards."""
    fill, stroke, text = STATES.get(state, STATES["default"])
    anims = [Recolor(box, fill=fill, stroke=stroke)]
    if label is not None:
        anims.append(Recolor(label, color=text))
    return anims


def _cell(value, w=0.8, h=None, state="default", corner=0.14, mono=False):
    fill, stroke, text = STATES[state]
    box = RoundedRectangle(corner_radius=corner, width=w, height=h or w, stroke_color=stroke, stroke_width=4, fill_color=fill, fill_opacity=1)
    t = _text(value, size=min(40, int(110 * w / max(1, len(str(value))) )), color=text, mono=mono)
    if t.width > w * 0.82:
        t.scale_to_fit_width(w * 0.82)
    t.move_to(box)
    return VGroup(box, t)


# ═════════════════════════════════ GENERAL ═════════════════════════════════


def KTitle(text: str, color=FG, kicker: str | None = None) -> VGroup:
    """Headline in the title band (≤ 6 words). Animate with Write/FadeIn."""
    t = _text(text, 54, color)
    if t.width > MAX_W:
        t.scale_to_fit_width(MAX_W)
    g = VGroup(t)
    if kicker:
        k = _text(kicker.upper(), 24, ACCENT)
        g = VGroup(k, t).arrange(DOWN, buff=0.2)
    return place(g, "title")


def Icon(name: str, color=ACCENT, height=1.4, label: str | None = None, ring=True) -> VGroup:
    """Lucide line icon (same names as Remotion's <Icon>), optional ring and label below."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons", f"{name}.svg")
    if not os.path.exists(path):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons", "Box.svg")
    icon = SVGMobject(path, height=height, stroke_color=color, stroke_width=5, fill_opacity=0)
    icon.set_fill(opacity=0).set_stroke(color, width=5)
    parts = [icon]
    if ring:
        parts.insert(0, Circle(radius=height * 0.78, stroke_color=color, stroke_width=5, fill_color=color, fill_opacity=0.12).move_to(icon))
    g = VGroup(*parts)
    if label:
        g = VGroup(g, _text(label, 30)).arrange(DOWN, buff=0.25)
    return g


def Pill(text: str, color=ACCENT, solid=False, size=28) -> VGroup:
    t = _text(text, size, BG if solid else color)
    box = RoundedRectangle(corner_radius=(t.height + 0.3) / 2, width=t.width + 0.6, height=t.height + 0.3, stroke_color=color, stroke_width=4, fill_color=color, fill_opacity=1 if solid else 0.15)
    return VGroup(box, t.move_to(box))


def Callout(text: str, color=ACCENT3, size=30) -> VGroup:
    """Rounded label bubble. Position with .next_to(target, UP/DOWN, buff=0.3) — never on top of text."""
    t = _text(text, size, BG)
    box = RoundedRectangle(corner_radius=0.2, width=t.width + 0.5, height=t.height + 0.35, fill_color=color, fill_opacity=1, stroke_width=0)
    return VGroup(box, t.move_to(box))


def LabeledArrow(start, end, label: str | None = None, color=ACCENT, side=UP) -> VGroup:
    """Arrow with its label OUTSIDE the shaft (offset to `side`). Animate with GrowArrow on [0], FadeIn on [1]."""
    a = Arrow(start, end, color=color, buff=0.15, stroke_width=6, max_tip_length_to_length_ratio=0.15)
    if not label:
        return VGroup(a)
    return VGroup(a, _text(label, 26, FG).next_to(a, side, buff=0.15))


class Counter(KitGroup):
    """Number that counts: self.play(c.count_to(95), run_time=1.2)."""

    def __init__(self, value: float = 0, decimals: int = 0, unit: str = "", color=ACCENT3, size=96, label: str | None = None):
        self.tracker = ValueTracker(value)
        self.anchor = Dot(radius=0.01, fill_opacity=0, stroke_opacity=0)  # moves with .place(); the number redraws here
        num = always_redraw(lambda: VGroup(
            DecimalNumber(self.tracker.get_value(), num_decimal_places=decimals, font_size=size, color=color),
            *([_text(unit, int(size * 0.6), color)] if unit else []),
        ).arrange(RIGHT, buff=0.1).move_to(self.anchor))
        parts = [self.anchor, num]
        if label:
            parts.append(_text(label, 30).next_to(self.anchor, DOWN, buff=size / 90))
        super().__init__(*parts)

    def count_to(self, v: float):
        return self.tracker.animate.set_value(v)


class StepList(KitGroup):
    """Numbered steps; self.play(steps.activate(1)) highlights step 2 and dims the rest."""

    def __init__(self, items: list[str], size=32, width=6.3):
        rows = []
        for i, s in enumerate(items):
            dot = VGroup(Circle(radius=0.28, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4), _text(i + 1, 26))
            dot[1].move_to(dot[0])
            label = Paragraph(s, font_size=size, color=FG, weight=BOLD, alignment="left", line_spacing=0.8)
            if label.width > width - 0.9:
                label.scale_to_fit_width(width - 0.9)
            rows.append(VGroup(dot, label).arrange(RIGHT, buff=0.3, aligned_edge=UP))
        super().__init__(*rows)
        self.arrange(DOWN, buff=0.38, aligned_edge=LEFT)

    def activate(self, i: int):
        anims = []
        for k, row in enumerate(self):
            on = k == i
            anims += [row[0][0].animate.set_fill(ACCENT3 if on else PANEL).set_stroke(ACCENT3 if on else LINE),
                      row[0][1].animate.set_color(BG if on else FG), row[1].animate.set_opacity(1 if on else 0.5)]
        return AnimationGroup(*anims)


class HBarChart(KitGroup):
    """Horizontal labelled bars; self.play(chart.grow()) animates them in, chart.highlight(i) recolours one."""

    def __init__(self, data: list[tuple[str, float]], unit: str = "", width=4.2, color=ACCENT):
        m = max(v for _, v in data) or 1
        rows = []
        for label, v in data:
            l = _text(label, 26)
            if l.width > 1.8:
                l.scale_to_fit_width(1.8)
            bar = RoundedRectangle(corner_radius=0.08, width=max(0.05, width * v / m), height=0.45, fill_color=color, fill_opacity=1, stroke_width=0)
            val = _text(f"{v:g}{unit}", 24, FG, mono=True)
            rows.append(VGroup(l, bar, val))
        super().__init__(*rows)
        for k, r in enumerate(rows):
            y = -k * 0.8
            r[0].move_to([0, y, 0], aligned_edge=RIGHT)
            r[1].move_to([0.3, y, 0], aligned_edge=LEFT)
            r[2].next_to(r[1], RIGHT, buff=0.15)

    def grow(self, lag=0.2):
        return LaggedStart(*[AnimationGroup(FadeIn(r[0]), GrowFromEdge(r[1], LEFT), FadeIn(r[2])) for r in self], lag_ratio=lag)

    def highlight(self, i: int, color=ACCENT3):
        return Recolor(self[i][1], fill=color)


def Split(left_title: str, left_body: str, right_title: str, right_body: str, winner: str | None = "right") -> VGroup:
    """Two comparison panels side by side (brute force vs optimal)."""
    def panel(title, body, win):
        c = GOOD if win else ACCENT
        t = _text(title, 32, c)
        b = Paragraph(body, font_size=26, color=FG, weight=BOLD, alignment="center", line_spacing=0.8)
        content = VGroup(t, b).arrange(DOWN, buff=0.3)
        if content.width > 2.9:
            content.scale_to_fit_width(2.9)
        box = RoundedRectangle(corner_radius=0.2, width=3.2, height=max(2.0, content.height + 0.6), stroke_color=c, stroke_width=5, fill_color=PANEL, fill_opacity=1)
        return VGroup(box, content.move_to(box))
    return VGroup(panel(left_title, left_body, winner == "left"), panel(right_title, right_body, winner == "right")).arrange(RIGHT, buff=0.3)


def Timeline(items: list[str], color=ACCENT) -> VGroup:
    """Vertical timeline; reveal with LaggedStart(*[FadeIn(r) for r in tl[1:]])."""
    rows = VGroup(*[VGroup(Dot(radius=0.14, color=color), _text(s, 30)).arrange(RIGHT, buff=0.35) for s in items]).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
    line = Line(rows[0][0].get_center(), rows[-1][0].get_center(), color=LINE, stroke_width=6)
    return VGroup(line, *rows)


# ═════════════════════════════════ DSA ═════════════════════════════════


class MArray(KitGroup):
    """Array / string of cells with indices.

    arr = MArray([1, 2, 4, 5, 7, 11], label="nums").place()
    self.play(Create(arr))
    self.play(arr.pointer("l", 0), arr.pointer("r", 5))
    self.play(arr.mark({0: "compare", 5: "compare"}), arr.note("1 + 11 = 12 > 9"))
    self.play(arr.pointer("r", 4))           # pointers MOVE when re-used
    self.play(arr.window(1, 4))              # sliding-window bracket (moves/resizes when re-used)
    self.play(arr.swap(0, 1))                # arc swap; values travel
    self.play(arr.set_value(3, 10))
    """

    def __init__(self, values, cell=0.8, show_index=True, label: str | None = None, gap=0.1):
        self.n = len(values)
        cell = min(cell, (MAX_W - gap * (self.n - 1)) / max(1, self.n))
        self.c, self.gap = cell, gap
        self.cells = VGroup(*[_cell(v, cell) for v in values]).arrange(RIGHT, buff=gap)
        parts = [self.cells]
        self.indices = VGroup(*[_text(i, 20, MUTED, mono=True).next_to(c, DOWN, buff=0.12) for i, c in enumerate(self.cells)])
        if show_index:
            parts.append(self.indices)
        if label:
            parts.append(_text(label, 24, MUTED, mono=True).next_to(self.cells, UP, buff=0.25).align_to(self.cells, LEFT))
        super().__init__(*parts)
        self.slots = [c.get_center() for c in self.cells]
        self.values = list(values)
        self._pointers: dict[str, VGroup] = {}
        self._window: Mobject | None = None
        self._note: Mobject | None = None

    def _slot(self, i):
        return self.cells[i].get_center() if i < len(self.cells) else self.slots[i]

    def mark(self, states: dict[int, str]):
        """Recolour cells: {index: state}. Unlisted cells keep their colour (use "default" to reset)."""
        anims = []
        for i, st in states.items():
            anims += _paint(self.cells[i][0], self.cells[i][1], st)
        return AnimationGroup(*anims)

    def reset_marks(self):
        return self.mark({i: "default" for i in range(self.n)})

    def pointer(self, name: str, i: int):
        """Create or move a named pointer under cell i. Pointers whose labels would touch drop to a lower row."""
        if name not in self._pointers:
            color = POINTER_COLORS[len(self._pointers) % len(POINTER_COLORS)]
            p = VGroup(Triangle(fill_color=color, fill_opacity=1, stroke_width=0).scale(0.13), _text(name, 24, color, mono=True)).arrange(DOWN, buff=0.06)
            p.scale(min(1.0, self.cells[0].width / 0.8))
            self._pointers[name] = p
            p.index, p.row = i, self._free_row(name, i, p.width)
            p.move_to(self._pointer_pos(i, p.row))
            self.add(p)
            return FadeIn(p, shift=UP * 0.2)
        p = self._pointers[name]
        p.index, p.row = i, self._free_row(name, i, p.width)
        return p.animate.move_to(self._pointer_pos(i, p.row))

    def _free_row(self, name, i, width):
        """Lowest row where this pointer's label doesn't overlap any other pointer's label."""
        x = self.cells[i].get_center()[0]
        taken = set()
        for k, o in self._pointers.items():
            if k == name or getattr(o, "index", None) is None:
                continue
            ox = self.cells[o.index].get_center()[0]
            if abs(ox - x) < (o.width + width) / 2 + 0.06:
                taken.add(o.row)
        row = 0
        while row in taken:
            row += 1
        return row

    def _pointer_pos(self, i, row=0):
        base = self.cells[i].get_bottom() + DOWN * (0.62 if self.indices in self.submobjects else 0.4)
        return base + DOWN * 0.62 * row

    def remove_pointer(self, name: str):
        p = self._pointers.pop(name)
        self.remove(p)
        return FadeOut(p)

    def window(self, l: int, r: int, color=ACCENT):
        """Bracket around cells l..r (inclusive). Re-calling moves/resizes it."""
        target = SurroundingRectangle(VGroup(*self.cells[l:r + 1]), color=color, buff=0.1, corner_radius=0.18, stroke_width=6)
        if self._window is None:
            self._window = target
            self.add(target)
            return Create(target)
        return Transform(self._window, target)

    def swap(self, i: int, j: int):
        """Swap two cells along arcs; afterwards index i holds the old j."""
        a, b = self.cells[i], self.cells[j]
        pa, pb = a.get_center(), b.get_center()
        anim = AnimationGroup(MoveAlongPath(a, ArcBetweenPoints(pa, pb, angle=-PI / 1.6)), MoveAlongPath(b, ArcBetweenPoints(pb, pa, angle=-PI / 1.6)))
        self.cells.submobjects[i], self.cells.submobjects[j] = b, a
        self.values[i], self.values[j] = self.values[j], self.values[i]
        return anim

    def set_value(self, i: int, v):
        self.values[i] = v
        old = self.cells[i][1]
        new = _text(v, old.font_size if hasattr(old, "font_size") else 40, old.get_color()).move_to(self.cells[i][0])
        if new.width > self.c * 0.82:
            new.scale_to_fit_width(self.c * 0.82)
        return Transform(old, new)

    def note(self, text: str, color=FG):
        """Caption under the array (replaces the previous one)."""
        bottom = min([self.cells.get_bottom()[1] - 0.7] + [p.get_bottom()[1] - 0.25 for p in self._pointers.values()])
        new = _text(text, 30, color).move_to([self.cells.get_center()[0], bottom - 0.3, 0])
        if self._note is None:
            self._note = new
            self.add(new)
            return FadeIn(new)
        return Transform(self._note, new)


def MString(s: str, **kw) -> MArray:
    """A string as an MArray of characters (same API)."""
    return MArray(list(s), **kw)


class MGrid(KitGroup):
    """2-D grid / DP table / matrix.

    dp = MGrid([[None] * 4 for _ in range(4)], row_labels=["", "c", "a", "t"], col_labels=["", "c", "u", "t"]).place()
    self.play(dp.set(1, 1, 0), dp.active(1, 1), dp.deps(1, 1, [(0, 0)]))
    self.play(dp.mark({(3, 3): "found"}))
    """

    def __init__(self, data, row_labels=None, col_labels=None, cell=0.75, label: str | None = None):
        rows, cols = len(data), max(len(r) for r in data)
        extra = 1 if (row_labels or col_labels) else 0
        cell = min(cell, (MAX_W - 0.08 * cols) / (cols + extra), 5.0 / (rows + extra))
        self.c = cell
        self.grid = VGroup(*[VGroup(*[_cell("" if v is None else v, cell) for v in r]).arrange(RIGHT, buff=0.08) for r in data]).arrange(DOWN, buff=0.08)
        parts = [self.grid]
        if col_labels:
            parts.append(VGroup(*[_text(l, 26, ACCENT, mono=True).next_to(self.grid[0][j], UP, buff=0.18) for j, l in enumerate(col_labels)]))
        if row_labels:
            parts.append(VGroup(*[_text(l, 26, ACCENT, mono=True).next_to(self.grid[i][0], LEFT, buff=0.18) for i, l in enumerate(row_labels)]))
        if label:
            parts.append(_text(label, 24, MUTED, mono=True).next_to(self.grid, UP, buff=0.6).align_to(self.grid, LEFT))
        super().__init__(*parts)
        self._active = None
        self._deps = VGroup()
        self.add(self._deps)

    def set(self, r: int, c: int, v):
        old = self.grid[r][c][1]
        new = _text(v, 34, old.get_color()).move_to(self.grid[r][c][0])
        if new.width > self.c * 0.8:
            new.scale_to_fit_width(self.c * 0.8)
        return Transform(old, new)

    def fill(self, cells: list[tuple[int, int, object]], lag=0.08):
        """Fill many cells with a lagged ripple: [(r, c, value), ...]."""
        return LaggedStart(*[self.set(r, c, v) for r, c, v in cells], lag_ratio=lag)

    def mark(self, states: dict[tuple[int, int], str]):
        anims = []
        for (r, c), st in states.items():
            anims += _paint(self.grid[r][c][0], self.grid[r][c][1], st)
        return AnimationGroup(*anims)

    def active(self, r: int, c: int):
        target = SurroundingRectangle(self.grid[r][c], color=ACCENT3, buff=0.04, stroke_width=7, corner_radius=0.12)
        if self._active is None:
            self._active = target
            self.add(target)
            return Create(target)
        return Transform(self._active, target)

    def deps(self, r: int, c: int, sources: list[tuple[int, int]]):
        """Arrows from the cells that (r, c) is computed from."""
        new = VGroup(*[Arrow(self.grid[a][b].get_center(), self.grid[r][c].get_center(), buff=self.c * 0.38, color=ACCENT2, stroke_width=5, max_tip_length_to_length_ratio=0.25) for a, b in sources])
        old = self._deps
        self._deps = new
        self.add(new)
        return AnimationGroup(FadeOut(old), *[GrowArrow(a) for a in new])


class MLinkedList(KitGroup):
    """Singly linked list (≤ 7 nodes).

    ll = MLinkedList([1, 2, 3, 4]).place()
    self.play(ll.pointer("curr", 0), ll.pointer("prev", None))   # None = points at the null slot
    self.play(ll.relink(0, None))        # 1.next → null
    self.play(ll.relink(1, 0))           # 2.next → 1 (curves back above the row)
    """

    def __init__(self, values, node=0.8, gap=0.8):
        n = len(values)
        node = min(node, (MAX_W - 1.2 - gap * (n - 1)) / n)
        self.nodes = VGroup(*[_cell(v, node, corner=0.22) for v in values]).arrange(RIGHT, buff=gap)
        self.null = _text("null", 24, MUTED, mono=True).next_to(self.nodes, RIGHT, buff=0.35)
        self.null_left = _text("null", 24, MUTED, mono=True).next_to(self.nodes, LEFT, buff=0.35)
        self.null_left.set_opacity(0)
        self.links: dict[int, Mobject] = {}
        super().__init__(self.nodes, self.null, self.null_left)
        for i in range(n):
            self.links[i] = self._arrow(i, i + 1 if i + 1 < n else None)
            self.add(self.links[i])
        self._pointers: dict[str, VGroup] = {}

    def _arrow(self, i, j):
        a = self.nodes[i]
        if j is None:
            target = self.null if i == len(self.nodes) - 1 else self.null_left
            if target is self.null_left:
                return Arrow(a.get_left(), target.get_right(), buff=0.08, color=ACCENT2, stroke_width=5)
            return Arrow(a.get_right(), target.get_left(), buff=0.08, color=ACCENT, stroke_width=5)
        b = self.nodes[j]
        if j == i + 1:
            return Arrow(a.get_right(), b.get_left(), buff=0.06, color=ACCENT, stroke_width=6, max_tip_length_to_length_ratio=0.3)
        back = j < i
        start = a.get_top() + (LEFT if back else RIGHT) * a.width * 0.2 + UP * 0.05
        end = b.get_top() + (RIGHT if back else LEFT) * b.width * 0.2 + UP * 0.05
        return CurvedArrow(start, end, angle=(1 if back else -1) * 2.8, color=ACCENT2 if back else ACCENT, stroke_width=6, tip_length=0.2)

    def relink(self, i: int, j: int | None):
        new = self._arrow(i, j)
        anims = [ReplacementTransform(self.links[i], new)]
        if j is None and i != len(self.nodes) - 1 and self.null_left.get_fill_opacity() < 0.5:
            anims.append(self.null_left.animate.set_opacity(1))
        self.links[i] = new
        return AnimationGroup(*anims)

    def mark(self, states: dict[int, str]):
        anims = []
        for i, st in states.items():
            anims += _paint(self.nodes[i][0], self.nodes[i][1], st)
        return AnimationGroup(*anims)

    def pointer(self, name: str, i: int | None):
        anchor = (self.null_left if i is None else self.nodes[i]).get_bottom()
        stack = sum(1 for k, p in self._pointers.items() if k != name and getattr(p, "index", -2) == i)
        pos = anchor + DOWN * (0.5 + 0.6 * stack)
        if name not in self._pointers:
            color = POINTER_COLORS[len(self._pointers) % len(POINTER_COLORS)]
            p = VGroup(Triangle(fill_color=color, fill_opacity=1, stroke_width=0).scale(0.12), _text(name, 24, color, mono=True)).arrange(DOWN, buff=0.05).move_to(pos)
            p.index = i
            self._pointers[name] = p
            self.add(p)
            return FadeIn(p, shift=UP * 0.2)
        p = self._pointers[name]
        p.index = i
        return p.animate.move_to(pos)


class MStack(KitGroup):
    """Vertical stack: self.play(st.push("(")), self.play(st.pop()). `kind="callstack"` for wide frames."""

    def __init__(self, items=(), kind="stack", width=None, label: str | None = None, capacity=6):
        self.w = width or (3.6 if kind == "callstack" else 1.6)
        self.h = 0.62
        self.mono = kind == "callstack"
        self.base = Line(LEFT * (self.w / 2 + 0.15), RIGHT * (self.w / 2 + 0.15), color=LINE, stroke_width=6)
        self.items = VGroup()
        title = _text(label or kind, 24, MUTED, mono=True).next_to(self.base, DOWN, buff=0.2).align_to(self.base, LEFT)
        super().__init__(self.base, self.items, title)
        self._w0 = self.base.width
        for v in items:
            self.items.add(self._box(v).move_to(self._pos(len(self.items))))

    def _box(self, v):
        return _cell(v, self.w, self.h, corner=0.12, mono=self.mono)

    def _k(self):
        return self.base.width / self._w0

    def _pos(self, k):
        return self.base.get_center() + UP * self._k() * (0.12 + self.h / 2 + k * (self.h + 0.08))

    def push(self, v, state="default"):
        box = _cell(v, self.w, self.h, state=state, corner=0.12, mono=self.mono).scale(self._k()).move_to(self._pos(len(self.items)))
        self.items.add(box)
        return FadeIn(box, shift=DOWN * 0.8)

    def pop(self):
        box = self.items[-1]
        self.items.remove(box)
        return box.animate.shift(UP * 1.2).set_opacity(0)

    def mark(self, k: int, state: str):
        return AnimationGroup(*_paint(self.items[k][0], self.items[k][1], state))


class MQueue(KitGroup):
    """Horizontal queue (front on the left): q.enqueue(v), q.dequeue()."""

    def __init__(self, items=(), cell=0.8, label: str = "queue", capacity=7):
        self.c = min(cell, (MAX_W - 0.1 * capacity) / capacity)
        self.items = VGroup()
        origin = LEFT * (capacity * (self.c + 0.1)) / 2 + RIGHT * self.c / 2
        self.anchor = Dot(origin, radius=0.01, fill_opacity=0, stroke_opacity=0)
        slots = VGroup(*[RoundedRectangle(corner_radius=0.12, width=self.c, height=self.c, stroke_color=LINE, stroke_width=2, stroke_opacity=0.5, fill_opacity=0).move_to(origin + RIGHT * k * (self.c + 0.1)) for k in range(capacity)])
        title = _text(label, 24, MUTED, mono=True).next_to(slots, UP, buff=0.2).align_to(slots, LEFT)
        super().__init__(self.anchor, slots, title, self.items)
        self.slots, self._w0 = slots, slots.width
        for v in items:
            self.items.add(_cell(v, self.c).move_to(self._pos(len(self.items))))

    def _k(self):
        return self.slots.width / self._w0

    def _pos(self, k):
        return self.anchor.get_center() + RIGHT * k * (self.c + 0.1) * self._k()

    def enqueue(self, v, state="default"):
        box = _cell(v, self.c, state=state).scale(self._k()).move_to(self._pos(len(self.items)))
        self.items.add(box)
        return FadeIn(box, shift=LEFT * 0.8)

    def dequeue(self):
        first = self.items[0]
        self.items.remove(first)
        return AnimationGroup(FadeOut(first, shift=LEFT * 0.8), *[b.animate.move_to(self._pos(k)) for k, b in enumerate(self.items)])

    def mark(self, k: int, state: str):
        return AnimationGroup(*_paint(self.items[k][0], self.items[k][1], state))


class MHashMap(KitGroup):
    """Key → value table: m.put("a", 1) inserts or updates (value flashes), m.get("a") highlights a row."""

    def __init__(self, entries=(), label: str = "map", width=4.4, row_h=0.6):
        self.w, self.rh = width, row_h
        head = VGroup(_text("key", 22, MUTED, mono=True), _text("value", 22, MUTED, mono=True)).arrange(RIGHT, buff=width / 2 - 0.6)
        self.title = _text(label, 24, MUTED, mono=True)
        self.rows = VGroup()
        self.keys: list = []
        header = VGroup(self.title, head).arrange(DOWN, buff=0.15, aligned_edge=LEFT)
        self.anchor = Dot(header.get_corner(DL) + DOWN * 0.2 + RIGHT * width / 2, radius=0.01, fill_opacity=0, stroke_opacity=0)
        super().__init__(header, self.anchor, self.rows)
        self._w0 = header.width
        for k, v in entries:
            self.rows.add(self._row(k, v).move_to(self._pos(len(self.keys))))
            self.keys.append(k)

    def _pos(self, k):
        s = self._scale()
        return self.anchor.get_center() + DOWN * s * (self.rh / 2 + k * (self.rh + 0.08))

    def _scale(self):
        return self[0].width / self._w0 if getattr(self, "_w0", None) else 1.0

    def _row(self, k, v):
        kb = _cell(k, self.w / 2, self.rh, corner=0.1, mono=True)
        vb = _cell(v, self.w / 2, self.rh, corner=0.1, mono=True)
        vb[0].set_fill("#11172A")
        return VGroup(kb, vb).arrange(RIGHT, buff=0)

    def put(self, k, v):
        if k in self.keys:
            row = self.rows[self.keys.index(k)]
            new = _text(v, 30, FG, mono=True).scale_to_fit_height(row[1][1].height).move_to(row[1][0])
            return AnimationGroup(Recolor(row[1][0], fill="#4A1033", stroke=ACCENT2, rate_func=there_and_back), Transform(row[1][1], new))
        row = self._row(k, v).scale(self._scale()).move_to(self._pos(len(self.keys)))
        self.keys.append(k)
        self.rows.add(row)
        return FadeIn(row, shift=RIGHT * 0.3)

    def get(self, k, state="active"):
        row = self.rows[self.keys.index(k)]
        return AnimationGroup(*_paint(row[0][0], row[0][1], state))


def _tree_layout(labels: dict, children: dict, root, width=6.4, height=5.2, binary=True):
    """Binary trees: x = in-order rank (BST-correct). Other trees: tidy (leaves evenly spaced, parent over children)."""
    depth, xs = {}, {}

    def deep(n, d):
        depth[n] = d
        for k in children.get(n, []):
            if k is not None:
                deep(k, d + 1)

    deep(root, 0)
    if binary:
        order = []

        def inorder(n):
            if n is None:
                return
            kids = (children.get(n, []) + [None, None])[:2]
            inorder(kids[0])
            order.append(n)
            inorder(kids[1])

        inorder(root)
        xs = {n: i for i, n in enumerate(order)}
        slots = len(order)
    else:
        leaf = [0]

        def tidy(n):
            kids = [k for k in children.get(n, []) if k is not None]
            if not kids:
                xs[n] = leaf[0]
                leaf[0] += 1
            else:
                for k in kids:
                    tidy(k)
                xs[n] = (xs[kids[0]] + xs[kids[-1]]) / 2
        tidy(root)
        slots = leaf[0]
    maxd = max(depth.values()) if depth else 0
    r = min(0.42, width / (slots * 2.5 + 1), height / (maxd * 2.6 + 2.4))
    dx = (width - 2 * r) / max(1, slots)
    dy = (height - 2 * r) / max(1, maxd)
    return {n: np.array([-width / 2 + r + (xs[n] + 0.5) * dx, height / 2 - r - depth[n] * dy, 0]) for n in depth}, r


class MTree(KitGroup):
    """Shared tree renderer (binary tree, recursion tree, trie). Node ids are strings."""

    def __init__(self, labels: dict, children: dict, root, width=6.4, height=5.2, binary=True):
        pos, r = _tree_layout(labels, children, root, width, height, binary)
        self.r = r
        self.node: dict[str, VGroup] = {}
        self.edge: dict[str, Line] = {}
        edges, circles = VGroup(), VGroup()
        for n, p in pos.items():
            c = Circle(radius=r, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4).move_to(p)
            t = _text(labels[n], int(min(36, 90 * r / max(1, len(str(labels[n])) ** 0.7))), FG).move_to(p)
            if t.width > r * 1.6:
                t.scale_to_fit_width(r * 1.6)
            self.node[n] = VGroup(c, t)
            circles.add(self.node[n])
        for parent, kids in children.items():
            for k in kids:
                if k is None or k not in pos:
                    continue
                ln = Line(pos[parent], pos[k], color=LINE, stroke_width=5, buff=r)
                self.edge[k] = ln
                edges.add(ln)
        super().__init__(edges, circles)
        self._badges: dict[str, Mobject] = {}
        self._visits: list[str] = []
        self._active = None

    def mark(self, states: dict[str, str]):
        anims = []
        for n, st in states.items():
            anims += _paint(self.node[n][0], self.node[n][1], st)
        return AnimationGroup(*anims)

    def mark_edge(self, child: str, state="path"):
        _, stroke, _ = STATES[state]
        self.edge[child].set_stroke(width=8)
        return Recolor(self.edge[child], stroke=stroke)

    def active(self, n: str):
        target = Circle(radius=self.r + 0.08, color=ACCENT3, stroke_width=7).move_to(self.node[n])
        if self._active is None:
            self._active = target
            self.add(target)
            return Create(target)
        return self._active.animate.move_to(self.node[n])

    def badge(self, n: str, text: str, color=ACCENT2):
        """Small value tag up-right of a node (height, sum, return value). Replaces that node's previous badge."""
        t = _text(text, 22, FG, mono=True)
        b = VGroup(RoundedRectangle(corner_radius=0.08, width=t.width + 0.22, height=t.height + 0.14, fill_color=color, fill_opacity=1, stroke_width=0), t)
        t.move_to(b[0])
        b.next_to(self.node[n], UR, buff=-0.08)
        if n in self._badges:
            old = self._badges[n]
            self._badges[n] = b
            self.add(b)
            return ReplacementTransform(old, b)
        self._badges[n] = b
        self.add(b)
        return FadeIn(b, scale=0.6)

    def visit(self, n: str):
        """Number the next node in traversal order (1, 2, 3…) and mark it done."""
        self._visits.append(n)
        num = VGroup(Circle(radius=0.17, fill_color=ACCENT3, fill_opacity=1, stroke_width=0), _text(len(self._visits), 18, BG, mono=True))
        num[1].move_to(num[0])
        num.next_to(self.node[n], UL, buff=-0.05)
        self.add(num)
        return AnimationGroup(FadeIn(num, scale=0.5), *_paint(self.node[n][0], self.node[n][1], "done"))

    def reveal(self, ids: list[str]):
        """For trees built hidden (see hide()): fade nodes + their edges in."""
        mobs = [self.node[n] for n in ids] + [self.edge[n] for n in ids if n in self.edge]
        return AnimationGroup(*[m.animate.set_opacity(1) for m in mobs])

    def hide(self, ids: list[str]):
        for n in ids:
            self.node[n].set_opacity(0)
            if n in self.edge:
                self.edge[n].set_opacity(0)
        return self


def MBinaryTree(level_order: list, **kw) -> MTree:
    """Binary tree from LeetCode level order ([3,9,20,None,None,15,7]). Node ids = array index as string ("0","1","2","5","6")."""
    labels, children = {}, {}
    if not level_order or level_order[0] is None:
        return MTree({"0": "∅"}, {}, "0")
    labels["0"] = level_order[0]
    q, i = ["0"], 1
    while q and i < len(level_order):
        p = q.pop(0)
        kids = []
        for _ in range(2):
            if i < len(level_order) and level_order[i] is not None:
                labels[str(i)] = level_order[i]
                kids.append(str(i))
                q.append(str(i))
            else:
                kids.append(None)
            i += 1
        children[p] = kids
    return MTree(labels, children, "0", **kw)


def MRecursionTree(nested: tuple, **kw) -> MTree:
    """Recursion tree from nested tuples: ("f(4)", [("f(3)", [...]), ("f(2)", [])]). Ids are paths "0", "0.1", "0.1.0"."""
    labels, children = {}, {}

    def walk(t, nid):
        label, kids = (t, []) if not isinstance(t, tuple) else (t[0], t[1] if len(t) > 1 else [])
        labels[nid] = label
        children[nid] = [f"{nid}.{k}" for k in range(len(kids))]
        for k, c in enumerate(kids):
            walk(c, f"{nid}.{k}")

    walk(nested, "0")
    return MTree(labels, children, "0", binary=False, **kw)


def MTrie(words: list[str], **kw) -> MTree:
    """Trie; node ids are the prefixes ("" root, "c", "ca", "cat"). Use .mark({"ca": "path"})."""
    labels, children = {"": "•"}, {"": []}
    for w in words:
        for k in range(1, len(w) + 1):
            p = w[:k]
            if p not in labels:
                labels[p] = w[k - 1]
                children[p] = []
                children[w[:k - 1]].append(p)
    return MTree(labels, children, "", binary=False, **kw)


class MHeap(KitGroup):
    """Binary heap drawn as tree + backing array, kept in sync: self.play(h.swap(i, j)), h.mark({i: "active"})."""

    def __init__(self, values, width=6.4, tree_h=3.6):
        self.values = list(values)
        n = len(values)
        depth = int(np.floor(np.log2(max(1, n))))
        r = min(0.38, width / (2 ** depth * 2.5 + 1))
        self.pos = []
        for i in range(n):
            d = int(np.floor(np.log2(i + 1)))
            k = i - (2 ** d - 1)
            self.pos.append(np.array([-width / 2 + (k + 0.5) / 2 ** d * width, tree_h / 2 - r - d * (tree_h - 2 * r) / max(1, depth), 0]))
        self.r = r
        edges = VGroup(*[Line(self.pos[(i - 1) // 2], self.pos[i], buff=r, color=LINE, stroke_width=5) for i in range(1, n)])
        self.tnodes = VGroup(*[VGroup(Circle(radius=r, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4).move_to(p), _text(v, 30).move_to(p)) for v, p in zip(values, self.pos)])
        cell = min(0.7, width / n - 0.08)
        self.arr = VGroup(*[_cell(v, cell) for v in values]).arrange(RIGHT, buff=0.08).next_to(self.tnodes, DOWN, buff=0.6)
        idx = VGroup(*[_text(i, 18, MUTED, mono=True).next_to(c, DOWN, buff=0.08) for i, c in enumerate(self.arr)])
        super().__init__(edges, self.tnodes, self.arr, idx)

    def swap(self, i: int, j: int):
        ti, tj = self.tnodes[i][1], self.tnodes[j][1]
        ai, aj = self.arr[i], self.arr[j]
        ci, cj = self.tnodes[i][0].get_center(), self.tnodes[j][0].get_center()
        pi, pj = ai.get_center(), aj.get_center()
        anim = AnimationGroup(MoveAlongPath(ti, Line(ci, cj)), MoveAlongPath(tj, Line(cj, ci)),
                              MoveAlongPath(ai, ArcBetweenPoints(pi, pj, angle=-PI / 1.6)), MoveAlongPath(aj, ArcBetweenPoints(pj, pi, angle=-PI / 1.6)))
        self.tnodes[i].submobjects[1], self.tnodes[j].submobjects[1] = tj, ti
        self.arr.submobjects[i], self.arr.submobjects[j] = aj, ai
        self.values[i], self.values[j] = self.values[j], self.values[i]
        return anim

    def mark(self, states: dict[int, str]):
        anims = []
        for i, st in states.items():
            anims += _paint(self.tnodes[i][0], self.tnodes[i][1], st) + _paint(self.arr[i][0], self.arr[i][1], st)
        return AnimationGroup(*anims)


class MGraph(KitGroup):
    """Graph. nodes: {id: (x, y)} in a ~6.4 x 5 box (or a list of ids for a circle layout); edges: [(a, b) or (a, b, w)].

    g = MGraph({"A": (0, 2), "B": (-2, 0), "C": (2, 0)}, [("A", "B", 4), ("A", "C", 1)]).place()
    self.play(g.mark({"A": "active"}), g.badge("A", "0"))
    self.play(g.mark_edge("A", "B"), g.mark({"B": "frontier"}))
    """

    def __init__(self, nodes, edges, directed=False, r=0.36):
        if isinstance(nodes, (list, tuple)):
            n = len(nodes)
            nodes = {nid: (2.8 * np.cos(PI / 2 - 2 * PI * k / n), 2.4 * np.sin(PI / 2 - 2 * PI * k / n)) for k, nid in enumerate(nodes)}
        self.r = r
        self.directed = directed
        self.node: dict[str, VGroup] = {}
        self.edge: dict[tuple, VGroup] = {}
        ev, nv = VGroup(), VGroup()
        for nid, (x, y) in nodes.items():
            p = np.array([x, y, 0])
            g = VGroup(Circle(radius=r, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4).move_to(p), _text(nid, 30).move_to(p))
            self.node[nid] = g
            nv.add(g)
        for e in edges:
            a, b = e[0], e[1]
            pa, pb = self.node[a].get_center(), self.node[b].get_center()
            line = (Arrow(pa, pb, buff=r, color=LINE, stroke_width=5, max_tip_length_to_length_ratio=0.12) if directed else Line(pa, pb, buff=r, color=LINE, stroke_width=5))
            parts = [line]
            if len(e) > 2:
                d = pb - pa
                normal = np.array([-d[1], d[0], 0]) / (np.linalg.norm(d) or 1)
                parts.append(_text(e[2], 24, MUTED, mono=True).move_to((pa + pb) / 2 + normal * 0.28))
            g = VGroup(*parts)
            self.edge[(a, b)] = g
            ev.add(g)
        super().__init__(ev, nv)
        self._badges: dict[str, Mobject] = {}

    def _e(self, a, b):
        return self.edge.get((a, b)) or (None if self.directed else self.edge.get((b, a)))

    def mark(self, states: dict[str, str]):
        anims = []
        for n, st in states.items():
            anims += _paint(self.node[n][0], self.node[n][1], st)
        return AnimationGroup(*anims)

    def mark_edge(self, a, b, state="path"):
        _, stroke, _ = STATES[state]
        e = self._e(a, b)
        e[0].set_stroke(width=8)
        return AnimationGroup(Recolor(e[0], stroke=stroke), *([Recolor(e[1], color=stroke)] if len(e) > 1 else []))

    def badge(self, n: str, text: str, color=ACCENT2):
        t = _text(text, 22, FG, mono=True)
        b = VGroup(RoundedRectangle(corner_radius=0.08, width=t.width + 0.22, height=t.height + 0.14, fill_color=color, fill_opacity=1, stroke_width=0), t)
        t.move_to(b[0])
        b.next_to(self.node[n], UR, buff=-0.08)
        old = self._badges.get(n)
        self._badges[n] = b
        self.add(b)
        return ReplacementTransform(old, b) if old else FadeIn(b, scale=0.6)


class MIntervals(KitGroup):
    """Intervals on a number line: iv.mark({0: "compare"}), iv.merged([(1, 6), (8, 10)]), iv.sweep(4)."""

    def __init__(self, intervals: list[tuple[float, float]], width=6.4, row_h=0.5):
        lo, hi = min(a for a, _ in intervals), max(b for _, b in intervals)
        step = next(s for s in (1, 2, 5, 10, 20, 25, 50, 100) if (hi - lo) / s <= 8)
        self.axis = NumberLine(x_range=[lo, hi, step], length=width, color=LINE, include_numbers=True, font_size=22).move_to([0, -len(intervals) * row_h - 0.1, 0])
        self.X = lambda v: self.axis.n2p(v)[0]
        self.bars = VGroup()
        for k, (a, b) in enumerate(intervals):
            box = RoundedRectangle(corner_radius=0.1, width=max(0.12, self.X(b) - self.X(a)), height=row_h - 0.1, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4)
            box.move_to([(self.X(a) + self.X(b)) / 2, -k * row_h, 0])
            label = _text(f"[{a},{b}]", 20, FG, mono=True)
            label.move_to(box) if label.width < box.width - 0.1 else label.next_to(box, RIGHT, buff=0.1)
            self.bars.add(VGroup(box, label))
        super().__init__(self.bars, self.axis)
        self._w0 = self.axis.get_width()
        self.row_h = row_h
        self._merged = VGroup()
        self._sweep = None

    def mark(self, states: dict[int, str]):
        anims = []
        for i, st in states.items():
            anims += _paint(self.bars[i][0], self.bars[i][1], st)
        return AnimationGroup(*anims)

    def _k(self):
        return self.axis.get_width() / self._w0

    def merged(self, result: list[tuple[float, float]]):
        new = VGroup()
        for a, b in result:
            box = RoundedRectangle(corner_radius=0.1, width=max(0.12, self.X(b) - self.X(a)), height=self.row_h - 0.1, fill_color=GOOD, fill_opacity=0.25, stroke_color=GOOD, stroke_width=4)
            box.move_to([(self.X(a) + self.X(b)) / 2, self.axis.get_center()[1] - 0.8 * self._k(), 0]).scale(self._k())
            new.add(box)
        old, self._merged = self._merged, new
        self.add(new)
        return AnimationGroup(FadeOut(old), FadeIn(new))

    def sweep(self, v: float):
        line = Line([self.X(v), self.bars.get_top()[1] + 0.15, 0], [self.X(v), self.axis.get_center()[1], 0], color=ACCENT3, stroke_width=6)
        if self._sweep is None:
            self._sweep = line
            self.add(line)
            return Create(line)
        return self._sweep.animate.move_to(line)


class MCode(KitGroup):
    """Syntax-highlighted code (pygments) with an active-line bar: self.play(code.highlight(3)) or highlight(4, 5)."""

    def __init__(self, code: str, language="python", width=6.6):
        self.code = Code(code_string=code, language=language, formatter_style="monokai", background="window", add_line_numbers=True,
                         paragraph_config={"font": MONO, "font_size": 22, "line_spacing": 0.6})
        if self.code.width > width:
            self.code.scale_to_fit_width(width)
        super().__init__(self.code)
        self._bar = None

    def highlight(self, start: int, end: int | None = None):
        end = end or start
        group = VGroup(*self.code.code_lines[start - 1:end])
        bar = Rectangle(width=self.code.width - 0.15, height=group.height + 0.12, fill_color=ACCENT3, fill_opacity=0.18, stroke_width=0).move_to([self.code.get_center()[0], group.get_center()[1], 0])
        if self._bar is None:
            self._bar = bar
            self.add_to_back(bar)
            self.code.set_z_index(1)
            return FadeIn(bar)
        return Transform(self._bar, bar)


class MVarWatch(KitGroup):
    """Variable chips (i = 2, best = 5): self.play(vw.set("best", 5)); new names fade in."""

    def __init__(self, vars: dict, width=6.4):
        self.vars = dict(vars)
        self.width_ = width
        super().__init__(*[self._chip(k, v) for k, v in vars.items()])
        self._layout()

    def _chip(self, k, v):
        t = _text(f"{k} = {v}", 26, FG, mono=True)
        box = RoundedRectangle(corner_radius=0.12, width=t.width + 0.4, height=t.height + 0.28, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4)
        g = VGroup(box, t.move_to(box))
        g.key = k
        return g

    def _layout(self):
        self.arrange(RIGHT, buff=0.25)
        if self.width > self.width_:
            self.arrange_in_grid(cols=max(1, len(self) // 2 + len(self) % 2), buff=0.25)

    def set(self, k, v):
        self.vars[k] = v
        for chip in self:
            if getattr(chip, "key", None) == k:
                new = self._chip(k, v).move_to(chip)
                new[0].set_stroke(ACCENT3)
                new[1].set_color(ACCENT3)
                return Transform(chip, new)
        chip = self._chip(k, v).next_to(self, RIGHT, buff=0.25)
        self.add(chip)
        return FadeIn(chip, shift=LEFT * 0.2)


def ProblemCard(title: str, difficulty="Medium", num: int | None = None, tags=(), example_in: str | None = None, example_out: str | None = None, width=6.6) -> VGroup:
    """LeetCode-style header card. Put it in "main" (it's taller than the title band)."""
    dc = {"Easy": GOOD, "Medium": ACCENT3, "Hard": BAD}.get(difficulty, ACCENT3)
    top = VGroup(*([_text(f"#{num}", 26, MUTED, mono=True)] if num is not None else []), Pill(difficulty, dc, size=22), *[Pill(t, MUTED, size=20) for t in tags]).arrange(RIGHT, buff=0.15)
    head = _text(title, 46)
    lines = [top, head]
    if example_in:
        lines.append(_text(f"Input: {example_in}", 22, FG, mono=True))
    if example_out:
        lines.append(_text(f"Output: {example_out}", 22, GOOD, mono=True))
    content = VGroup(*lines).arrange(DOWN, buff=0.25, aligned_edge=LEFT)
    if content.width > width - 0.6:
        content.scale_to_fit_width(width - 0.6)
    box = RoundedRectangle(corner_radius=0.25, width=width, height=content.height + 0.7, fill_color=PANEL, fill_opacity=1, stroke_color=LINE, stroke_width=4)
    return VGroup(box, content.move_to(box))


def Complexity(time: str, space: str | None = None, was: str | None = None) -> VGroup:
    """Big-O badges. `was` shows the brute-force time struck through above the new one."""
    def badge(k, v, old=None):
        parts = [_text(k.upper(), 22, MUTED)]
        if old:
            o = _text(old, 30, MUTED, mono=True)
            parts.append(VGroup(o, Line(o.get_left(), o.get_right(), color=BAD, stroke_width=5)))
        t = _text(v, 44, GOOD, mono=True)
        box = RoundedRectangle(corner_radius=0.18, width=t.width + 0.6, height=t.height + 0.4, fill_color=GOOD, fill_opacity=0.15, stroke_color=GOOD, stroke_width=5)
        parts.append(VGroup(box, t.move_to(box)))
        return VGroup(*parts).arrange(DOWN, buff=0.2)
    items = [badge("time", time, was)] + ([badge("space", space)] if space else [])
    return VGroup(*items).arrange(RIGHT, buff=0.8, aligned_edge=DOWN)
