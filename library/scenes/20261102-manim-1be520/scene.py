class Seg(Scene):
    def construct(self):
        self.camera.background_color = BG
        cx = -0.7
        t = 0.0

        title = Text("Root distance zero", font_size=44, color=FG).move_to([cx, 5.9, 0])
        # keep narrow
        if title.width > 7.0:
            title.scale(7.0 / title.width)

        root_p = [cx, 4.1, 0]
        left_p = [cx - 1.5, 2.5, 0]
        right_p = [cx + 1.5, 2.5, 0]
        n7_p = [cx - 0.3, 0.8, 0]

        root_c = Circle(radius=0.42, fill_color=ACCENT, fill_opacity=1, stroke_color=FG, stroke_width=3).move_to(root_p)
        root_l = Text("10", font_size=40, color="#111111").move_to(root_p)
        hd0 = Text("HD 0", font_size=32, color=ACCENT3).next_to(root_c, DOWN, buff=0.15)

        edge1 = Line(root_p, left_p, color=MUTED, stroke_width=5)
        left_c = Circle(radius=0.38, fill_color=FG, fill_opacity=1, stroke_color=FG, stroke_width=3).move_to(left_p)
        left_l = Text("5", font_size=38, color="#111111").move_to(left_p)
        hd_m1 = Text("HD -1", font_size=32, color=ACCENT3).next_to(left_c, DOWN, buff=0.15)

        edge2 = Line(root_p, right_p, color=MUTED, stroke_width=5)
        right_c = Circle(radius=0.38, fill_color=FG, fill_opacity=1, stroke_color=FG, stroke_width=3).move_to(right_p)
        right_l = Text("15", font_size=36, color="#111111").move_to(right_p)
        hd_p1 = Text("HD +1", font_size=32, color=ACCENT3).next_to(right_c, DOWN, buff=0.15)

        edge3 = Line(left_p, n7_p, color=MUTED, stroke_width=4)

        # HD slots row (combines number line + map)
        slot_y = -1.2
        slot_xs = [cx - 1.3, cx, cx + 1.3]
        slot_boxes = VGroup(*[
            RoundedRectangle(width=1.15, height=0.62, corner_radius=0.15, fill_color="#1c1c22", fill_opacity=1, stroke_color=MUTED, stroke_width=3).move_to([x, slot_y, 0])
            for x in slot_xs
        ])
        slot_hd = VGroup(*[
            Text(s, font_size=26, color=MUTED).next_to(b, UP, buff=0.12)
            for s, b in zip(["-1", "0", "+1"], slot_boxes)
        ])
        slot_vals = VGroup(*[
            Text(s, font_size=36, color=FG).move_to(b.get_center())
            for s, b in zip(["5", "10", "15"], slot_boxes)
        ])

        # queue bar
        q_y = -3.0
        def make_queue(labels, active_idx):
            boxes = VGroup()
            labs = VGroup()
            for i, s in enumerate(labels):
                col = ACCENT if i == active_idx else MUTED
                b = RoundedRectangle(width=0.95, height=0.62, corner_radius=0.15, fill_color=ACCENT if i == active_idx else "#1c1c22", fill_opacity=0.95 if i == active_idx else 1, stroke_color=col, stroke_width=3).move_to([cx - 1.15 + i * 1.15, q_y, 0])
                lt = Text(s, font_size=32, color="#111111" if i == active_idx else FG).move_to(b.get_center())
                boxes.add(b)
                labs.add(lt)
            qlab = Text("queue", font_size=28, color=MUTED).next_to(boxes, UP, buff=0.15)
            return VGroup(qlab, boxes, labs)

        queue1 = make_queue(["10", "5", "15"], 0)
        queue2 = make_queue(["5", "15", "7"], 0)
        queue3 = make_queue(["5", "15", "7"], 2)

        n7_c = Circle(radius=0.36, fill_color=FG, fill_opacity=1, stroke_color=FG, stroke_width=3).move_to(n7_p)
        n7_l = Text("7", font_size=38, color="#111111").move_to(n7_p)

        coll_line = DashedLine([n7_p[0], n7_p[1] - 0.4, 0], [slot_xs[1], slot_y + 0.45, 0], color=ACCENT2, stroke_width=5, dash_length=0.12)
        x_mark = Text("X", font_size=40, color=ACCENT2).move_to(n7_p)

        banner_box = RoundedRectangle(width=4.6, height=0.8, corner_radius=0.2, fill_color="#1c1c22", fill_opacity=1, stroke_color=ACCENT, stroke_width=3).move_to([cx, q_y, 0])
        banner_t = Text("First seen wins", font_size=36, color=ACCENT).move_to(banner_box.get_center())
        banner = VGroup(banner_box, banner_t)
        if banner.width > 7.0:
            banner.scale(7.0 / banner.width)

        # beat 0.42 Give
        self.wait(0.42 - t)
        t = 0.42
        self.play(FadeIn(title, shift=UP * 0.2), GrowFromCenter(root_c), FadeIn(root_l, scale=0.5), FadeIn(hd0, shift=DOWN * 0.1), run_time=1.8, rate_func=smooth)
        t += 1.8
        self.wait(3.02 - t)
        t = 3.02
        # beat minus
        title2 = Text("Left is minus one", font_size=44, color=FG).move_to([cx, 5.9, 0])
        if title2.width > 7.0:
            title2.scale(7.0 / title2.width)
        self.play(ReplacementTransform(title, title2), Create(edge1), GrowFromCenter(left_c), FadeIn(left_l, scale=0.5), FadeIn(hd_m1, shift=DOWN * 0.1), run_time=1.0, rate_func=smooth)
        title = title2
        t += 1.0
        self.wait(4.48 - t)
        t = 4.48
        # beat plus
        title2 = Text("Right is plus one", font_size=44, color=FG).move_to([cx, 5.9, 0])
        if title2.width > 7.0:
            title2.scale(7.0 / title2.width)
        self.play(ReplacementTransform(title, title2), Create(edge2), GrowFromCenter(right_c), FadeIn(right_l, scale=0.5), FadeIn(hd_p1, shift=DOWN * 0.1), run_time=1.0, rate_func=smooth)
        title = title2
        t += 1.0
        self.wait(5.88 - t)
        t = 5.88
        # beat Walk queue
        title2 = Text("Walk level by level", font_size=44, color=FG).move_to([cx, 5.9, 0])
        if title2.width > 7.0:
            title2.scale(7.0 / title2.width)
        self.play(ReplacementTransform(title, title2), FadeIn(queue1, shift=UP * 0.2), root_c.animate.scale(1.12), run_time=1.8, rate_func=smooth)
        title = title2
        t += 1.8
        self.wait(8.32 - t)
        t = 8.32
        # beat breadth
        title2 = Text("Breadth first", font_size=44, color=FG).move_to([cx, 5.9, 0])
        self.play(ReplacementTransform(title, title2), ReplacementTransform(queue1, queue2), left_c.animate.set_fill(ACCENT, opacity=1), right_c.animate.set_fill(ACCENT, opacity=1), run_time=1.4, rate_func=smooth)
        title = title2
        queue_cur = queue2
        t += 1.4
        self.wait(10.22 - t)
        t = 10.22
        # beat ten map row
        title2 = Text("Keep first seen", font_size=44, color=FG).move_to([cx, 5.9, 0])
        self.play(ReplacementTransform(title, title2), LaggedStart(*[FadeIn(b, shift=UP * 0.15) for b in slot_boxes], lag_ratio=0.2), FadeIn(slot_hd, shift=UP * 0.1), LaggedStart(*[FadeIn(v, scale=1.2) for v in slot_vals], lag_ratio=0.2), run_time=1.5, rate_func=smooth)
        title = title2
        t += 1.5
        self.play(slot_boxes.animate.set_stroke(GOOD, width=4), run_time=0.7, rate_func=smooth)
        t += 0.7
        self.wait(13.74 - t)
        t = 13.74
        # beat seven
        title2 = Text("Five has seven", font_size=44, color=FG).move_to([cx, 5.9, 0])
        self.play(ReplacementTransform(title, title2), Create(edge3), GrowFromCenter(n7_c), FadeIn(n7_l, scale=0.5), ReplacementTransform(queue_cur, queue3), run_time=1.4, rate_func=smooth)
        title = title2
        queue_cur = queue3
        t += 1.4
        self.wait(15.78 - t)
        t = 15.78
        # beat zero collision
        title2 = Text("Seven hits zero", font_size=44, color=FG).move_to([cx, 5.9, 0])
        self.play(ReplacementTransform(title, title2), Create(coll_line), n7_c.animate.set_fill(ACCENT, opacity=1), run_time=1.2, rate_func=smooth)
        title = title2
        t += 1.2
        self.play(Indicate(slot_boxes[1], color=ACCENT2, scale_factor=1.12), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.play(Indicate(slot_vals[1], color=ACCENT3, scale_factor=1.15), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.wait(19.34 - t)
        t = 19.34
        # beat skip
        title2 = Text("Skip the duplicate", font_size=44, color=FG).move_to([cx, 5.9, 0])
        if title2.width > 7.0:
            title2.scale(7.0 / title2.width)
        self.play(ReplacementTransform(title, title2), Flash(n7_c.get_center(), color=ACCENT2, line_length=0.25, num_lines=12), n7_c.animate.set_fill(ACCENT2, opacity=1), run_time=1.2, rate_func=smooth)
        title = title2
        t += 1.2
        self.play(n7_c.animate.set_fill(MUTED, opacity=0.5).scale(0.85), FadeIn(x_mark, scale=1.3), slot_vals[1].animate.set_color(FG), run_time=0.6, rate_func=smooth)
        t += 0.6
        self.wait(22.5 - t)
        t = 22.5
        # beat keep
        title2 = Text("First seen wins", font_size=44, color=ACCENT).move_to([cx, 5.9, 0])
        self.play(ReplacementTransform(title, title2), FadeOut(queue_cur, shift=DOWN * 0.15), FadeOut(coll_line), FadeIn(banner, scale=1.05), slot_boxes.animate.set_stroke(ACCENT, width=5), left_c.animate.set_fill(ACCENT, opacity=1), right_c.animate.set_fill(ACCENT, opacity=1), run_time=0.71, rate_func=smooth)
        t += 0.71