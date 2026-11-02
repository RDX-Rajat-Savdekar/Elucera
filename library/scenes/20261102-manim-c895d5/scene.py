class Seg(Scene):
    def construct(self):
        self.camera.background_color = BG
        t = 0.0

        title1 = Text("Breadth First", font_size=46, color=FG)
        title2 = Text("Top View", font_size=46, color=FG)
        title = VGroup(title1, title2).arrange(DOWN, buff=0.08).move_to(UP * 5.9)
        if title.width > 6.5:
            title.scale(6.5 / title.width)

        root_p = UP * 4.0
        left_p = LEFT * 2.0 + UP * 2.5
        right_p = RIGHT * 2.0 + UP * 2.5
        seven_p = LEFT * 0.8 + UP * 1.0

        def make_node(p, s, r=0.42):
            c = Circle(radius=r, fill_color=FG, fill_opacity=1, stroke_color=FG, stroke_width=3).move_to(p)
            lab = Text(s, font_size=40, color="#111111").move_to(p)
            g = VGroup(c, lab)
            g.circle = c
            g.lab = lab
            return g

        root = make_node(root_p, "10", 0.46)
        leftN = make_node(left_p, "5")
        rightN = make_node(right_p, "15")
        sevenN = make_node(seven_p, "7", 0.38)

        eL = Line(root_p, left_p, color=MUTED, stroke_width=5, stroke_opacity=0.9)
        eR = Line(root_p, right_p, color=MUTED, stroke_width=5, stroke_opacity=0.9)
        e7 = Line(left_p, seven_p, color=MUTED, stroke_width=5, stroke_opacity=0.9)

        hd0_tag = Text("HD 0", font_size=32, color=ACCENT3).next_to(root, DOWN, buff=0.18)
        hdM_tag = Text("HD -1", font_size=32, color=ACCENT3).next_to(leftN, DOWN, buff=0.18)
        hdP_tag = Text("HD +1", font_size=32, color=ACCENT3).next_to(rightN, DOWN, buff=0.18)

        # HD number line
        y_hd = -0.2
        hd_line = Line(LEFT * 2.8 + UP * y_hd, RIGHT * 2.8 + UP * y_hd, color=MUTED, stroke_width=4)
        tick_x = [-2.0, 0.0, 2.0]
        ticks = VGroup(*[Line([x, y_hd, 0], [x, y_hd + 0.22, 0], color=MUTED, stroke_width=4) for x in tick_x])
        hdL_lab = Text("-1", font_size=36, color=MUTED).move_to([tick_x[0], y_hd - 0.45, 0])
        hd0_lab = Text("0", font_size=36, color=MUTED).move_to([tick_x[1], y_hd - 0.45, 0])
        hdR_lab = Text("+1", font_size=36, color=MUTED).move_to([tick_x[2], y_hd - 0.45, 0])
        hd_group = VGroup(hd_line, ticks, hdL_lab, hd0_lab, hdR_lab)

        # map slots
        y_slot = -1.65
        def make_slot(x, hd_s, val_s):
            box = RoundedRectangle(width=1.4, height=0.85, corner_radius=0.18, stroke_color=MUTED, stroke_width=3, fill_color="#1a1f2b", fill_opacity=1).move_to([x, y_slot, 0])
            lab = Text(f"{hd_s}:{val_s}", font_size=32, color=FG).move_to(box.get_center())
            g = VGroup(box, lab)
            g.box = box
            g.lab = lab
            return g
        slotM = make_slot(-2.0, "-1", "5")
        slot0 = make_slot(0.0, "0", "10")
        slotP = make_slot(2.0, "+1", "15")
        slots = VGroup(slotM, slot0, slotP)

        # queue bar
        y_q = -3.2
        q_lab_title = Text("queue", font_size=28, color=MUTED).move_to([-2.6, y_q + 0.75, 0])
        def make_qbox(x, s):
            b = RoundedRectangle(width=0.95, height=0.7, corner_radius=0.16, stroke_color=FG, stroke_width=2, fill_color="#1a1f2b", fill_opacity=1).move_to([x, y_q, 0])
            ll = Text(s, font_size=32, color=FG).move_to(b.get_center())
            g = VGroup(b, ll)
            g.box = b
            g.lab = ll
            return g
        q10 = make_qbox(-1.1, "10")
        q5 = make_qbox(0.0, "5")
        q15 = make_qbox(1.1, "15")
        q7 = make_qbox(2.1, "7")
        queue_trio = VGroup(q10, q5, q15)

        # banner
        banner_box = RoundedRectangle(width=4.6, height=1.15, corner_radius=0.25, stroke_color=ACCENT, stroke_width=3, fill_color="#0e1a24", fill_opacity=0.95).move_to([0, -2.45, 0])
        b1 = Text("first seen", font_size=34, color=FG).move_to(banner_box.get_center() + UP * 0.26)
        b2 = Text("you keep it", font_size=34, color=ACCENT).move_to(banner_box.get_center() + DOWN * 0.28)
        banner = VGroup(banner_box, b1, b2)

        # 0.42 root builds
        self.wait(0.42 - t)
        t = 0.42
        self.play(FadeIn(title, shift=DOWN * 0.2), GrowFromCenter(root), FadeIn(hd0_tag, shift=UP * 0.15), FadeIn(hd_group, shift=UP * 0.15), run_time=1.4, rate_func=smooth)
        t += 1.4
        root.circle.set_fill(ACCENT, opacity=1)
        hd0_lab.set_color(ACCENT3)
        self.wait(3.02 - t)
        t = 3.02
        self.play(Create(eL), GrowFromCenter(leftN), FadeIn(hdM_tag, shift=UP * 0.15), run_time=0.9, rate_func=smooth)
        t += 0.9
        hdL_lab.set_color(ACCENT3)
        leftN.circle.set_fill(ACCENT, opacity=1)
        self.wait(4.48 - t)
        t = 4.48
        self.play(Create(eR), GrowFromCenter(rightN), FadeIn(hdP_tag, shift=UP * 0.15), run_time=0.9, rate_func=smooth)
        t += 0.9
        self.wait(5.88 - t)
        t = 5.88
        self.play(FadeIn(q_lab_title, shift=UP * 0.1), FadeIn(queue_trio, shift=UP * 0.25), run_time=0.9, rate_func=smooth)
        t += 0.9
        self.play(q10.box.animate.set_stroke(ACCENT, width=5).set_fill(ACCENT, opacity=0.35), q10.lab.animate.set_color(ACCENT), run_time=0.8, rate_func=smooth)
        t += 0.8
        self.wait(8.32 - t)
        t = 8.32
        self.play(leftN.animate.scale(1.12), rightN.animate.scale(1.12), run_time=0.6, rate_func=smooth)
        t += 0.6
        leftN.circle.set_fill(ACCENT, opacity=1)
        rightN.circle.set_fill(ACCENT, opacity=1)
        hdR_lab.set_color(ACCENT3)
        self.play(Indicate(leftN, color=ACCENT, scale_factor=1.1), Indicate(rightN, color=ACCENT, scale_factor=1.1), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.wait(10.22 - t)
        t = 10.22
        self.play(FadeIn(slots, shift=UP * 0.25), run_time=0.7, rate_func=smooth)
        t += 0.7
        self.play(slotM.box.animate.set_stroke(GOOD, width=5).set_fill(GOOD, opacity=0.28), slot0.box.animate.set_stroke(GOOD, width=5).set_fill(GOOD, opacity=0.28), slotP.box.animate.set_stroke(GOOD, width=5).set_fill(GOOD, opacity=0.28), run_time=0.7, rate_func=smooth)
        t += 0.7
        self.play(slotM.lab.animate.set_color(GOOD), slot0.lab.animate.set_color(GOOD), slotP.lab.animate.set_color(GOOD), run_time=0.5, rate_func=smooth)
        t += 0.5
        self.play(Indicate(slot0.box, color=GOOD, scale_factor=1.08), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.wait(13.74 - t)
        t = 13.74
        self.play(Create(e7), GrowFromCenter(sevenN), FadeIn(q7, shift=UP * 0.2), run_time=0.7, rate_func=smooth)
        t += 0.7
        sevenN.circle.set_fill(ACCENT, opacity=1)
        self.play(q7.box.animate.set_stroke(ACCENT, width=5).set_fill(ACCENT, opacity=0.35), sevenN.animate.scale(1.12), run_time=0.5, rate_func=smooth)
        t += 0.5
        self.wait(15.78 - t)
        t = 15.78
        dash = DashedLine(sevenN.get_bottom() + DOWN * 0.05, slot0.box.get_top() + UP * 0.05, color=ACCENT2, stroke_width=5, dash_length=0.18)
        coll_lab = Text("HD 0 taken", font_size=30, color=ACCENT2).next_to(dash, RIGHT, buff=0.15)
        if coll_lab.width > 2.2:
            coll_lab.scale(2.2 / coll_lab.width)
        coll_lab.move_to([1.55, -0.35, 0])
        self.play(Create(dash), FadeIn(coll_lab, shift=LEFT * 0.15), run_time=1.4, rate_func=smooth)
        t += 1.4
        self.play(Indicate(slot0.box, color=ACCENT2, scale_factor=1.12), Indicate(sevenN, color=ACCENT2, scale_factor=1.12), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.wait(19.34 - t)
        t = 19.34
        x_cross = VGroup(Line(sevenN.get_center() + LEFT * 0.22 + UP * 0.22, sevenN.get_center() + RIGHT * 0.22 + DOWN * 0.22, color=MUTED, stroke_width=6), Line(sevenN.get_center() + LEFT * 0.22 + DOWN * 0.22, sevenN.get_center() + RIGHT * 0.22 + UP * 0.22, color=MUTED, stroke_width=6))
        self.play(sevenN.circle.animate.set_fill(ACCENT2, opacity=1), q7.box.animate.set_stroke(ACCENT2, width=5).set_fill(ACCENT2, opacity=0.35), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.play(sevenN.animate.scale(0.82), FadeIn(x_cross, scale=1.3), FadeOut(coll_lab), run_time=0.5, rate_func=smooth)
        t += 0.5
        sevenN.circle.set_fill(MUTED, opacity=0.55)
        sevenN.lab.set_opacity(0.55)
        self.play(FadeOut(dash), FadeOut(q7, shift=DOWN * 0.15), run_time=0.5, rate_func=smooth)
        t += 0.5
        self.play(Indicate(slot0.box, color=FG, scale_factor=1.05), run_time=0.5, rate_func=smooth)
        t += 0.5
        self.wait(22.5 - t)
        t = 22.5
        self.play(FadeIn(banner, shift=UP * 0.2), slotM.box.animate.set_stroke(ACCENT, width=6), slot0.box.animate.set_stroke(ACCENT, width=6), slotP.box.animate.set_stroke(ACCENT, width=6), run_time=0.71, rate_func=smooth)
        t += 0.71