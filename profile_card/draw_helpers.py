"""Градиент, скругления, бары, ширина текста."""

from __future__ import annotations

from PIL import Image, ImageDraw

from profile_card.constants import BG_BOT, BG_TOP, H, W


def _draw_rounded_rect(draw: ImageDraw.Draw, xy, radius: int, fill, outline=None, outline_width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                           outline=outline, width=outline_width)


def _draw_bar(draw: ImageDraw.Draw, x, y, w, h,
              value, max_value,
              fill_color, bg_color=(50, 48, 70),
              radius=5, outline=(80, 78, 100)):
    """Прогресс-бар с закруглёнными углами."""
    pct = max(0.0, min(1.0, value / max(1, max_value)))
    _draw_rounded_rect(draw, (x, y, x + w, y + h), radius, bg_color, outline, 1)
    if pct > 0:
        filled_w = max(radius * 2, int(w * pct))
        _draw_rounded_rect(draw, (x, y, x + filled_w, y + h), radius, fill_color)


def _draw_gradient_bg(img: Image.Image):
    """Вертикальный градиент фона."""
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
