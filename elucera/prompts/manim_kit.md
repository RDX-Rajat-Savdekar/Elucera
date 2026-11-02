## House kit (already imported — `from elucera_kit import *` is in the header)
COMPOSE, DON'T DRAW: if a kit component exists for the thing, use it. Kit structures are VGroups: build, `.place("main" | "below")`, `self.play(Create(x))` or `FadeIn(x)`, then call methods that RETURN animations and pass them to `self.play(...)` (several per play is fine — state changes and swaps are designed to run together). Create a structure in its own `self.play` BEFORE adding pointers/windows to it.

States (same names as the 2D kit): "default" "active" "compare" "swap" "done" "found" "visited" "frontier" "path" "dim" "error".

Layout: `place(mob, "title"|"main"|"below")` (also `.place(...)` on kit objects) scales + positions inside the safe area (x ≤ 2.8, y between the caption band and the top chrome). `KTitle("≤6 words", kicker=None)` returns a placed headline.

General:
- `Icon(name, color=ACCENT, height=1.4, label=None, ring=True)` — Lucide line icons (Lock, Server, Laptop, Database, Cpu, Key, Shield, Globe, Cloud, Brain, Atom, Dna, Rocket, Search, Users, …; same names as the 2D kit).
- `Pill(text, color, solid=False)` · `Callout(text, color=ACCENT3)` (place with `.next_to(target, UP, buff=0.3)`) · `LabeledArrow(start, end, label, color, side=UP)` (GrowArrow on `[0]`, FadeIn `[1]`)
- `Counter(value, decimals=0, unit="", label=None)` → `self.play(c.count_to(95))` · `StepList(items)` → `steps.activate(i)` · `HBarChart([(label, value)], unit="")` → `chart.grow()`, `chart.highlight(i)`
- `Split(left_title, left_body, right_title, right_body, winner="right")` · `Timeline([labels])`

DSA:
- `MArray(values, label=None, show_index=True)` / `MString("abc")` → `.pointer(name, i)` (creates or moves; stacks when shared), `.remove_pointer(name)`, `.mark({i: state})`, `.reset_marks()`, `.window(l, r)` (creates or moves the bracket), `.swap(i, j)` (arc swap), `.set_value(i, v)`, `.note("sum = 9")`
- `MGrid(data, row_labels=None, col_labels=None)` (None = empty cell) → `.set(r, c, v)`, `.fill([(r, c, v), …])` (lagged), `.mark({(r, c): state})`, `.active(r, c)`, `.deps(r, c, [(r2, c2), …])` (recurrence arrows)
- `MLinkedList(values)` → `.relink(i, j_or_None)` (back-links curve above), `.pointer(name, i_or_None)`, `.mark({i: state})`
- `MStack(items, kind="stack"|"callstack", capacity=6)` → `.push(v, state="default")`, `.pop()`, `.mark(k, state)` · `MQueue(items, capacity=7)` → `.enqueue(v)`, `.dequeue()`, `.mark(k, state)` · `MHashMap(entries, label="map")` → `.put(k, v)` (insert or update), `.get(k)` (highlight)
- `MBinaryTree([3, 9, 20, None, None, 15, 7])` — node id = index in that list as a string ("0", "1", "2", "5", "6"). `MTrie(words)` — ids are prefixes ("", "c", "ca"). `MRecursionTree(("f(4)", [("f(3)", [...]), ("f(2)", [])]))` — ids are paths "0", "0.1". All three → `.mark({id: state})`, `.mark_edge(child_id, state="path")`, `.active(id)`, `.badge(id, text)`, `.visit(id)` (numbers traversal order), `.hide([ids])` at build time + `.reveal([ids])`
- `MHeap(values)` (tree + array in sync) → `.swap(i, j)`, `.mark({i: state})`
- `MGraph({id: (x, y)} or [ids], [(a, b) or (a, b, w)], directed=False)` (coords in a ~6.4 × 5 box) → `.mark({id: state})`, `.mark_edge(a, b, state)`, `.badge(id, text)`
- `MIntervals([(s, e), …])` → `.mark({i: state})`, `.merged([(s, e), …])`, `.sweep(x)`
- `MCode(code_string, language="python")` → `.highlight(line)` or `.highlight(start, end)` · `MVarWatch({"i": 0})` → `.set(name, value)`
- `ProblemCard(title, difficulty, num=None, tags=(), example_in=None, example_out=None)` (place in "main") · `Complexity(time, space=None, was=None)`

Example (shape only):
```python
class Seg(Scene):
    def construct(self):
        title = KTitle("Squeeze from both ends", kicker="LeetCode 167")
        arr = MArray([1, 2, 4, 5, 7, 11], label="numbers").place()
        self.play(Write(title), Create(arr), run_time=1.0)                      # t = 1.0
        self.play(arr.pointer("l", 0), arr.pointer("r", 5), run_time=0.6)       # t = 1.6
        self.play(arr.mark({0: "compare", 5: "compare"}), arr.note("1 + 11 = 12 > 9"), run_time=0.6)
        self.wait(0.6)
        self.play(arr.pointer("r", 4), arr.mark({5: "dim", 4: "compare"}), arr.note("too big → move r"), run_time=0.7)
        self.play(arr.pointer("l", 1), arr.window(1, 4), arr.mark({0: "dim", 1: "found", 4: "found"}), arr.note("2 + 7 = 9"), run_time=0.8)
        self.wait(1.0)
```
