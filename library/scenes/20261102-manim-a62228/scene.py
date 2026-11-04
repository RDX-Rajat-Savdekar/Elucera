class Seg(MovingCameraScene):
    def construct(self):
        self.camera.background_color = BG
        t = 0.0

        bubble_bg = RoundedRectangle(corner_radius=0.35, width=4.3, height=1.7, fill_color=WHITE, fill_opacity=1, stroke_width=0)
        bubble_bg.move_to([-1.2, 4.2, 0])
        bubble_text = Text("What's free\nFriday?", font_size=42, color=BLACK)
        bubble_text.move_to(bubble_bg.get_center() + LEFT * 0.1)
        bubble_tail = Triangle(fill_color=WHITE, fill_opacity=1, stroke_width=0).scale(0.22).rotate(PI)
        bubble_tail.next_to(bubble_bg, DOWN, buff=-0.08).shift(LEFT * 1.2)

        bot = Icon("Bot", color=ACCENT, height=1.1, label="CHATBOT")
        bot.next_to(bubble_bg, DOWN, buff=0.35).shift(LEFT * 0.4)

        gap_bar = Rectangle(width=0.38, height=5.2, fill_color="#FF2E2E", fill_opacity=1, stroke_width=0)
        gap_bar.move_to([0.15, 1.6, 0])

        cant = Text("CAN'T", font_size=110, color=FG)
        cant.move_to([-0.5, -0.55, 0])

        cal_icon = Icon("Calendar", color=MUTED, height=1.9)
        cal_icon.move_to([1.6, 1.7, 0])
        lock_badge = Icon("Lock", color="#FF2E2E", height=0.85)
        lock_badge.next_to(cal_icon, DOWN + RIGHT, buff=-0.35).shift(DOWN * 0.2 + RIGHT * 0.15)
        cal_group = VGroup(cal_icon, lock_badge)

        until_word = Text("Until", font_size=78, color=ACCENT3)
        now_word = Text("now.", font_size=78, color=ACCENT3)
        bottom_line = VGroup(until_word, now_word).arrange(RIGHT, buff=0.3)
        bottom_line.move_to([-0.5, -2.7, 0])

        glow = Rectangle(width=0.55, height=5.2, fill_color=ACCENT, fill_opacity=0.35, stroke_color=ACCENT, stroke_width=6, stroke_opacity=0.9)
        glow.move_to(gap_bar.get_center() + RIGHT * 0.05)

        self.play(GrowFromCenter(bubble_bg), GrowFromCenter(bubble_tail), Write(bubble_text), run_time=0.42, rate_func=smooth)
        t = 0.42

        self.play(FadeIn(bot, shift=DOWN * 0.6), run_time=0.6, rate_func=smooth)
        t = 1.02

        self.play(GrowFromCenter(gap_bar), FadeIn(cant, scale=1.6), run_time=0.6, rate_func=smooth)
        t = 1.62
        self.play(Indicate(gap_bar, scale_factor=1.15), Indicate(cant, scale_factor=1.1), run_time=0.58, rate_func=there_and_back)
        t = 2.2

        self.play(FadeIn(cal_group, scale=0.6), run_time=0.28, rate_func=smooth)
        t = 2.48
        self.play(cal_group.animate.shift(LEFT * 0.25), run_time=0.1)
        t = 2.58
        if 2.68 - t > 0.001:
            self.wait(2.68 - t)
            t = 2.68

        self.play(self.camera.frame.animate.scale(0.9).move_to([0, 0.6, 0]), FadeIn(until_word, shift=RIGHT * 0.8), run_time=0.9, rate_func=smooth)
        t = 3.58

        self.play(FadeIn(glow, scale=1.1), gap_bar.animate.set_fill(color=ACCENT, opacity=1), FadeIn(now_word, scale=1.5), run_time=0.6, rate_func=smooth)
        t = 4.18
        self.play(Indicate(lock_badge, scale_factor=1.35), Indicate(glow, scale_factor=1.08), run_time=0.77, rate_func=there_and_back)
        t = 4.95