"""Силуэт воина, звёзды, рамка."""

from __future__ import annotations

from PIL import ImageDraw

from profile_card.constants import C_BLUE, C_CYAN, C_GOLD, C_WHITE, H, W


def _draw_warrior(draw: ImageDraw.Draw, cx: int, cy: int, scale: float = 1.0, color=C_WHITE):
    """Схематичный силуэт воина из ellipse + polygon."""
    s = scale
    hx, hy, hr = cx, cy - int(60 * s), int(18 * s)
    draw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=color)
    bx0, by0 = cx - int(20 * s), cy - int(40 * s)
    bx1, by1 = cx + int(20 * s), cy + int(10 * s)
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=int(8 * s), fill=color)
    draw.line([
        (cx - int(20 * s), cy - int(30 * s)),
        (cx - int(40 * s), cy + int(5 * s)),
    ], fill=color, width=max(3, int(8 * s)))
    draw.line([
        (cx + int(20 * s), cy - int(30 * s)),
        (cx + int(45 * s), cy - int(10 * s)),
    ], fill=color, width=max(3, int(8 * s)))
    draw.line([
        (cx + int(45 * s), cy - int(10 * s)),
        (cx + int(72 * s), cy - int(55 * s)),
    ], fill=C_GOLD, width=max(3, int(5 * s)))
    draw.line([
        (cx + int(38 * s), cy - int(20 * s)),
        (cx + int(58 * s), cy - int(20 * s)),
    ], fill=C_GOLD, width=max(2, int(4 * s)))
    draw.line([
        (cx - int(8 * s), cy + int(10 * s)),
        (cx - int(14 * s), cy + int(55 * s)),
    ], fill=color, width=max(3, int(10 * s)))
    draw.line([
        (cx + int(8 * s), cy + int(10 * s)),
        (cx + int(14 * s), cy + int(55 * s)),
    ], fill=color, width=max(3, int(10 * s)))
    sx, sy = cx - int(52 * s), cy - int(22 * s)
    sr = int(16 * s)
    draw.ellipse([sx - sr, sy - sr * 2 // 1, sx + sr // 2, sy + sr * 2 // 1],
                 outline=C_BLUE, fill=(40, 80, 160), width=int(3 * s))
    draw.line([sx - sr // 2, sy, sx + sr // 3, sy], fill=C_CYAN, width=int(2 * s))


def _draw_stars(draw: ImageDraw.Draw, seed: int = 42):
    import random
    rng = random.Random(seed)
    for _ in range(50):
        x = rng.randint(0, W)
        y = rng.randint(0, H)
        r = rng.randint(1, 2)
        a = rng.randint(80, 200)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(a, a, a + 30))


def _draw_frame(draw: ImageDraw.Draw):
    draw.rounded_rectangle([3, 3, W - 4, H - 4], radius=16,
                           outline=C_GOLD, width=2)
    for px, py in [(8, 8), (W - 8, 8), (8, H - 8), (W - 8, H - 8)]:
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=C_GOLD)
