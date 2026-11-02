class Seg(Scene):
    def construct(self):
        title = KTitle("Find 13 by Halving", kicker="Binary Search")
        arr = MArray([1, 3, 5, 7, 9, 11, 13, 15], label="nums").place()

        t = 0.0
        self.wait(0.2 - t)
        t = 0.2

        # beat 1 @0.2 - show array, middle seven
        self.play(Write(title), Create(arr), run_time=1.0)
        t = 1.2
        self.play(arr.pointer("lo", 0), arr.pointer("mid", 3), arr.pointer("hi", 7), arr.mark({3: "compare"}), arr.note("mid = 7"), run_time=0.9)
        t = 2.1
        self.wait(2.12 - t)
        t = 2.12

        # beat 2 @2.12 - 13 bigger, throw away left half
        self.play(arr.note("13 > 7"), run_time=0.8)
        t = 2.92
        self.play(arr.mark({0: "dim", 1: "dim", 2: "dim", 3: "dim"}), arr.pointer("lo", 4), run_time=0.8)
        t = 3.72
        self.play(arr.window(4, 7), run_time=0.7)
        t = 4.42
        self.wait(0.9)
        t = 5.32
        self.play(arr.note("drop left half"), run_time=0.5)
        t = 5.82
        self.wait(6.35 - t)
        t = 6.35

        # beat 3 @6.35 - new middle eleven
        self.play(arr.pointer("mid", 5), arr.mark({5: "compare"}), arr.note("mid = 11"), run_time=0.8)
        t = 7.15
        self.play(arr.pointer("lo", 6), arr.mark({4: "dim", 5: "dim"}), arr.window(6, 7), arr.note("11 < 13"), run_time=0.7)
        t = 7.85
        self.wait(8.66 - t)
        t = 8.66

        # beat 4 @8.66 - next middle thirteen
        self.play(arr.pointer("mid", 6), arr.mark({6: "compare"}), arr.note("mid = 13"), run_time=0.7)
        t = 9.36
        self.wait(9.82 - t)
        t = 9.82

        # beat 5 @9.82 - found
        self.play(arr.mark({6: "found"}), arr.note("found in 3 steps"), run_time=0.8)
        t = 10.62
        self.play(arr.mark({6: "found", 7: "dim"}), run_time=0.5)
        t = 11.12
        self.wait(11.89 - t)
        t = 11.89