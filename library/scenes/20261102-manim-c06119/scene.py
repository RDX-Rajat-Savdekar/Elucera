class Seg(Scene):
    def construct(self):
        self.camera.background_color = BG
        cx = -0.6

        title1 = Text("Five intruders", font_size=56, color=FG).move_to([cx, 5.9, 0])
        if title1.width > 6.8:
            title1.scale(6.8 / title1.width)
        title2 = Text("Black carbon sponge", font_size=44, color=FG).move_to([cx, 5.9, 0])
        if title2.width > 6.8:
            title2.scale(6.8 / title2.width)
        title3 = Text("Resin beads trade", font_size=48, color=FG).move_to([cx, 5.9, 0])
        if title3.width > 6.8:
            title3.scale(6.8 / title3.width)

        housing = RoundedRectangle(width=3.2, height=7.6, corner_radius=0.3, stroke_color=ACCENT, stroke_width=4, fill_color="#102542", fill_opacity=0.9).move_to([cx, 0.7, 0])
        carbon = Rectangle(width=2.6, height=2.8, stroke_color=FG, stroke_width=3, fill_color="#0B0B0B", fill_opacity=1).move_to([cx, 2.5, 0])
        resin_bg = Rectangle(width=2.6, height=2.8, stroke_color=FG, stroke_width=2, fill_color="#3A2200", fill_opacity=0.9).move_to([cx, -1.5, 0])
        divider = Line([cx - 1.3, 0.15, 0], [cx + 1.3, 0.15, 0], color=MUTED, stroke_width=3)

        pores = VGroup()
        for r in range(3):
            for c in range(4):
                px = cx - 0.9 + c * 0.6
                py = 1.7 + r * 0.8
                pores.add(Circle(radius=0.12, fill_color="#3A3A3A", fill_opacity=1, stroke_color="#666666", stroke_width=1).move_to([px, py, 0]))

        beads = VGroup()
        for r in range(3):
            for c in range(3):
                px = cx - 0.7 + c * 0.7
                py = -2.3 + r * 0.75
                beads.add(Circle(radius=0.27, fill_color="#F5A623", fill_opacity=0.95, stroke_color="#FFE5A0", stroke_width=2).move_to([px, py, 0]))

        carbon_lab = Text("carbon", font_size=28, color=FG).move_to([cx, 3.55, 0])
        resin_lab = Text("resin", font_size=28, color="#FFD580").move_to([cx, -2.55, 0])

        def mk_dot(col, x):
            glow = Dot(point=[x, 5.1, 0], radius=0.30, color=col, fill_opacity=0.25)
            core = Dot(point=[x, 5.1, 0], radius=0.18, color=col, fill_opacity=1)
            return VGroup(glow, core)

        xs = [cx - 0.9, cx - 0.45, cx, cx + 0.45, cx + 0.9]
        cols = [GOOD, GOOD, "#FF8C00", ACCENT2, "#FFFFFF"]
        dots = VGroup(*[mk_dot(co, x) for co, x in zip(cols, xs)])

        wave = Text("~~", font_size=72, color=GOOD).move_to([cx, 4.35, 0])
        taste_lab = Text("taste", font_size=30, color=GOOD).next_to(wave, UP, buff=0.05)
        taste_group = VGroup(wave, taste_lab)

        lock_rings = VGroup(
            Circle(radius=0.26, color=GOOD, stroke_width=4, fill_opacity=0).move_to(pores[5].get_center()),
            Circle(radius=0.26, color=GOOD, stroke_width=4, fill_opacity=0).move_to(pores[6].get_center())
        )

        hydro_dots = VGroup(*[
            Dot(point=beads[i].get_center(), radius=0.12, color="#FFFFFF", fill_opacity=1)
            for i in [3, 4, 5]
        ])
        clean_lab = Text("clean out", font_size=30, color=FG).move_to([cx, -3.4, 0])

        intro_grp = VGroup(housing, carbon, resin_bg, divider, pores, beads, carbon_lab, resin_lab)

        t = 0.0
        self.play(FadeIn(intro_grp, shift=UP * 0.2), FadeIn(title1, shift=DOWN * 0.2), run_time=0.61, rate_func=smooth)
        t += 0.61
        self.wait(0.71 - t)
        t = 0.71
        self.play(LaggedStart(*[FadeIn(d, shift=DOWN * 0.8) for d in dots], lag_ratio=0.12), run_time=2.64, rate_func=smooth)
        t += 2.64
        self.wait(3.45 - t)
        t = 3.45
        self.play(
            AnimationGroup(
                dots[0].animate.scale(1.5).shift(DOWN * 1.2),
                dots[1].animate.scale(1.5).shift(DOWN * 1.2),
                dots[2].animate.shift(DOWN * 1.2),
                dots[3].animate.shift(DOWN * 1.2),
                dots[4].animate.shift(DOWN * 1.2),
                lag_ratio=0.08
            ),
            run_time=4.94, rate_func=smooth
        )
        t += 4.94
        self.wait(8.49 - t)
        t = 8.49
        self.play(
            FadeOut(title1, shift=UP * 0.2),
            FadeIn(title2, shift=DOWN * 0.2),
            carbon.animate.set_stroke(color=ACCENT, width=10),
            pores.animate.scale(1.35),
            resin_bg.animate.set_opacity(0.35),
            beads.animate.set_opacity(0.35),
            dots.animate.shift(DOWN * 0.6),
            run_time=6.28, rate_func=smooth
        )
        t += 6.28
        self.wait(14.87 - t)
        t = 14.87
        self.play(
            dots[0].animate.move_to(pores[5].get_center()).scale(0.9),
            dots[1].animate.move_to(pores[6].get_center()).scale(0.9),
            FadeIn(taste_group, shift=DOWN * 0.2),
            FadeIn(lock_rings, scale=1.2),
            run_time=2.42, rate_func=smooth
        )
        t += 2.42
        self.wait(17.39 - t)
        t = 17.39
        self.play(
            FadeOut(taste_group, shift=UP * 0.3, scale=0.7),
            FadeOut(lock_rings, scale=0.7),
            carbon.animate.set_stroke(width=6),
            run_time=2.36, rate_func=smooth
        )
        t += 2.36
        self.wait(19.85 - t)
        t = 19.85
        self.play(
            FadeOut(title2, shift=UP * 0.2),
            FadeIn(title3, shift=DOWN * 0.2),
            carbon.animate.set_opacity(0.35),
            pores.animate.set_opacity(0.35),
            resin_bg.animate.set_stroke(color=ACCENT3, width=6).set_opacity(0.95),
            beads.animate.scale(1.25).set_opacity(1.0),
            dots[2].animate.shift(DOWN * 1.0),
            dots[3].animate.shift(DOWN * 1.0),
            dots[4].animate.shift(DOWN * 1.0),
            run_time=6.02, rate_func=smooth
        )
        t += 6.02
        self.wait(25.97 - t)
        t = 25.97
        btarget = [beads[3].get_center(), beads[4].get_center(), beads[5].get_center()]
        self.play(
            AnimationGroup(
                dots[2].animate.move_to(btarget[0]),
                dots[3].animate.move_to(btarget[1]),
                dots[4].animate.move_to(btarget[2]),
                Flash(btarget[1], color="#FFFFFF", line_length=0.22, num_lines=14),
                lag_ratio=0.15
            ),
            run_time=3.54, rate_func=smooth
        )
        t += 3.54
        self.wait(29.61 - t)
        t = 29.61
        self.play(
            FadeIn(hydro_dots, shift=DOWN * 1.8),
            FadeIn(clean_lab, shift=UP * 0.2),
            dots[2].animate.set_opacity(0.5),
            dots[3].animate.set_opacity(0.5),
            dots[4].animate.set_opacity(0.5),
            run_time=1.67, rate_func=smooth
        )
        t += 1.67