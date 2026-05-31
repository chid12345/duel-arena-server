"""
gen_bot_description_image.py — баннер бота в стиле V1 NEON CITY.

Telegram показывает эту картинку над текстом описания, когда новичок
открывает чат с ботом и ещё не нажал «СТАРТ».

Запуск:
    python scripts/gen_bot_description_image.py

Результат:
    webapp/bot_description.png  (1280×720, ~150-300 КБ)

Загрузка в Telegram:
    @BotFather → /mybots → выбрать бота → Edit Bot
    → Description Picture → отправить картинку из webapp/bot_description.png
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 720
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "webapp", "bot_description.png")


def _gradient_bg() -> Image.Image:
    """Вертикальный градиент тёмно-синий → почти чёрный, как в V1 sky."""
    img = Image.new("RGB", (W, H), (10, 6, 26))
    top = (10, 6, 26)
    mid = (26, 5, 48)
    bot = (5, 3, 15)
    px = img.load()
    for y in range(H):
        if y < H // 2:
            t = y / (H // 2)
            r = int(top[0] + (mid[0] - top[0]) * t)
            g = int(top[1] + (mid[1] - top[1]) * t)
            b = int(top[2] + (mid[2] - top[2]) * t)
        else:
            t = (y - H // 2) / (H // 2)
            r = int(mid[0] + (bot[0] - mid[0]) * t)
            g = int(mid[1] + (bot[1] - mid[1]) * t)
            b = int(mid[2] + (bot[2] - mid[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


def _add_glow(base: Image.Image, cx: int, cy: int, radius: int, color: tuple, max_alpha: int) -> Image.Image:
    """Радиальное свечение поверх base (с GaussianBlur для мягкости)."""
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    steps = 14
    for i in range(steps, 0, -1):
        r = int(radius * (i / steps))
        a = int(max_alpha * (1 - i / steps))
        od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    overlay = overlay.filter(ImageFilter.GaussianBlur(30))
    base = base.convert("RGBA")
    base.alpha_composite(overlay)
    return base


def _draw_grid_floor(img: Image.Image) -> Image.Image:
    """Горизонтальные + вертикальные неон-линии (имитация перспективы)."""
    d = ImageDraw.Draw(img, "RGBA")
    horizon = int(H * 0.58)
    # Горизонтальные линии, плотнее ближе к низу
    for y in range(horizon, H, 22):
        depth = (y - horizon) / max(1, H - horizon)
        alpha = int(20 + 130 * depth)
        d.line([(0, y), (W, y)], fill=(0, 240, 255, alpha), width=2)
    # Вертикальные сходятся в точке схода (середина горизонта)
    vp = W // 2
    for x_floor in range(-W, 2 * W, 60):
        d.line([(vp, horizon), (x_floor, H)], fill=(255, 60, 200, 60), width=2)
    return img


def _text_with_glow(img: Image.Image, xy, text: str, font, fill, glow_color, blur: int = 20):
    """Светящийся текст: размытый цветной слой + жёсткий текст сверху."""
    glow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    # Несколько проходов для насыщенности
    for _ in range(3):
        gd.text(xy, text, font=font, fill=(*glow_color, 220))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(glow_layer)
    d = ImageDraw.Draw(img)
    d.text(xy, text, font=font, fill=fill)
    return img


def _load_fonts():
    """Подгрузка шрифтов: arial bold для заголовка, arial для остального."""
    candidates_bold = ["arialbd.ttf", "Arial Bold.ttf", "C:\\Windows\\Fonts\\arialbd.ttf",
                       "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                       "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
    candidates_reg = ["arial.ttf", "Arial.ttf", "C:\\Windows\\Fonts\\arial.ttf",
                      "/System/Library/Fonts/Supplemental/Arial.ttf",
                      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    title = tag = desc = None
    for p in candidates_bold:
        try:
            title = ImageFont.truetype(p, 160); break
        except Exception:
            continue
    for p in candidates_reg:
        try:
            tag = ImageFont.truetype(p, 32); desc = ImageFont.truetype(p, 38); break
        except Exception:
            continue
    if title is None: title = ImageFont.load_default()
    if tag is None: tag = ImageFont.load_default()
    if desc is None: desc = ImageFont.load_default()
    return title, tag, desc


def _centered_x(d, text: str, font, total_w: int = W) -> int:
    bbox = d.textbbox((0, 0), text, font=font)
    return (total_w - (bbox[2] - bbox[0])) // 2


def main() -> None:
    img = _gradient_bg().convert("RGBA")
    img = _add_glow(img, W // 2, H + 80, 700, (255, 40, 180), 130)   # розовый снизу
    img = _add_glow(img, W // 3, H // 3, 460, (0, 200, 255), 80)     # голубой сверху-слева
    img = _add_glow(img, W * 4 // 5, H // 4, 380, (140, 80, 255), 70)  # фиолет сверху-справа
    img = _draw_grid_floor(img)

    # Декор-полоски сверху/снизу
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 0, W, 6], fill=(0, 240, 255, 200))
    d.rectangle([0, H - 6, W, H], fill=(255, 60, 200, 200))

    title_f, tag_f, desc_f = _load_fonts()

    # Заголовок DUEL ARENA — неоновое свечение
    title = "DUEL ARENA"
    tx = _centered_x(d, title, title_f)
    img = _text_with_glow(img, (tx, int(H * 0.16)), title, title_f, (255, 255, 255), (255, 60, 200), blur=18)

    # Tagline
    tag = "//   NEON  ·  COMBAT  ·  LEGEND   //"
    d = ImageDraw.Draw(img)
    tx = _centered_x(d, tag, tag_f)
    d.text((tx, int(H * 0.40)), tag, font=tag_f, fill=(124, 230, 255))

    # Описание (2 строки)
    d1 = "Место, где сражаются тысячи бойцов."
    d2 = "Дуэли · Кланы · Мировые боссы · Рейтинг."
    y1 = int(H * 0.58)
    d.text((_centered_x(d, d1, desc_f), y1), d1, font=desc_f, fill=(220, 220, 240))
    d.text((_centered_x(d, d2, desc_f), y1 + 56), d2, font=desc_f, fill=(255, 200, 90))

    # CTA-полоска внизу (как кнопка)
    cta = "▸  ЖМИ  «СТАРТ»  —  ПОПАДЁШЬ  В  АРЕНУ  ◂"
    bbox = d.textbbox((0, 0), cta, font=tag_f)
    cw = bbox[2] - bbox[0]
    cy = int(H * 0.82)
    pad_x, pad_y = 36, 14
    cx_l = (W - cw) // 2 - pad_x
    cx_r = (W + cw) // 2 + pad_x
    d.rounded_rectangle([cx_l, cy - pad_y, cx_r, cy + 40 + pad_y], radius=24,
                        fill=(255, 60, 200, 90), outline=(255, 60, 200, 220), width=3)
    d.text(((W - cw) // 2, cy), cta, font=tag_f, fill=(255, 255, 255))

    out_abs = os.path.abspath(OUT_PATH)
    img.convert("RGB").save(out_abs, "PNG", optimize=True)
    size_kb = os.path.getsize(out_abs) // 1024
    print(f"OK: {out_abs}  ({W}x{H}, {size_kb} KB)")


if __name__ == "__main__":
    main()
