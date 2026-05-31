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
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

# Telegram BotFather требует ровно один из: 320×180 / 640×360 / 960×540 (всё 16:9).
# Берём 640×360 — стандарт, читаемо и на мобильном, и в десктопном клиенте.
W, H = 640, 360
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "webapp", "bot_description.png")

# Если положить картинку по этому пути — она станет фоном (центр-кроп до 640×360,
# затем небольшой dim-overlay чтобы текст читался). Не положил — берётся
# процедурный неон-градиент с сеткой-полом (старое поведение).
BG_IMAGE_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "webapp", "bot_description_bg.png"),
    os.path.join(os.path.dirname(__file__), "..", "webapp", "bot_description_bg.jpg"),
    os.path.join(os.path.dirname(__file__), "..", "webapp", "bot_description_bg.jpeg"),
]


def _load_custom_bg() -> Image.Image | None:
    """Если есть готовая bot_description_bg.{png,jpg} — вписываем 640×360
    центр-кропом и слегка затемняем (35%) чтобы текст поверх читался."""
    for path in BG_IMAGE_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            bg = Image.open(path).convert("RGB")
            bg = ImageOps.fit(bg, (W, H), method=Image.LANCZOS)
            # Затемнение поверх — иначе яркая AI-картинка съест текст
            dim = Image.new("RGBA", (W, H), (0, 0, 0, 90))
            bg = bg.convert("RGBA")
            bg.alpha_composite(dim)
            return bg
        except Exception as exc:
            print(f"warn: фон {path} не загрузился ({exc}) — fallback на процедурный")
            return None
    return None


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
    for y in range(horizon, H, 12):
        depth = (y - horizon) / max(1, H - horizon)
        alpha = int(20 + 130 * depth)
        d.line([(0, y), (W, y)], fill=(0, 240, 255, alpha), width=1)
    # Вертикальные сходятся в точке схода (середина горизонта)
    vp = W // 2
    for x_floor in range(-W, 2 * W, 30):
        d.line([(vp, horizon), (x_floor, H)], fill=(255, 60, 200, 60), width=1)
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
            title = ImageFont.truetype(p, 80); break
        except Exception:
            continue
    for p in candidates_reg:
        try:
            tag = ImageFont.truetype(p, 16); desc = ImageFont.truetype(p, 19); break
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
    # Если есть webapp/bot_description_bg.{png,jpg} — используем как фон,
    # иначе процедурный градиент + сетка-пол (старое поведение).
    custom_bg = _load_custom_bg()
    if custom_bg is not None:
        img = custom_bg
        print("используем кастомный фон webapp/bot_description_bg.*")
    else:
        img = _gradient_bg().convert("RGBA")
        img = _add_glow(img, W // 2, H + 40, 350, (255, 40, 180), 130)   # розовый снизу
        img = _add_glow(img, W // 3, H // 3, 230, (0, 200, 255), 80)     # голубой сверху-слева
        img = _add_glow(img, W * 4 // 5, H // 4, 190, (140, 80, 255), 70)  # фиолет сверху-справа
        img = _draw_grid_floor(img)

    # Декор-полоски сверху/снизу — нужны и на кастомном фоне (фирменный кант)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 0, W, 3], fill=(0, 240, 255, 200))
    d.rectangle([0, H - 3, W, H], fill=(255, 60, 200, 200))

    title_f, tag_f, desc_f = _load_fonts()

    # Заголовок DUEL ARENA — неоновое свечение
    title = "DUEL ARENA"
    tx = _centered_x(d, title, title_f)
    img = _text_with_glow(img, (tx, int(H * 0.14)), title, title_f, (255, 255, 255), (255, 60, 200), blur=10)

    # Tagline
    tag = "//   NEON  ·  COMBAT  ·  LEGEND   //"
    d = ImageDraw.Draw(img)
    tx = _centered_x(d, tag, tag_f)
    d.text((tx, int(H * 0.40)), tag, font=tag_f, fill=(124, 230, 255))

    # Описание (2 строки) на тёмной плашке с неон-рамкой —
    # иначе сетка-пол режет текст и читать невозможно.
    d1 = "Место, где сражаются тысячи бойцов."
    d2 = "Дуэли · Кланы · Мировые боссы · Рейтинг."
    y1 = int(H * 0.60)
    line_h = 28
    # Считаем ширину плашки по самой длинной строке
    w1 = d.textbbox((0, 0), d1, font=desc_f)
    w2 = d.textbbox((0, 0), d2, font=desc_f)
    inner_w = max(w1[2] - w1[0], w2[2] - w2[0])
    pad_x, pad_y_top, pad_y_bot = 22, 12, 16
    box_l = (W - inner_w) // 2 - pad_x
    box_r = (W + inner_w) // 2 + pad_x
    box_t = y1 - pad_y_top
    box_b = y1 + line_h + 22 + pad_y_bot
    # Тёмная подложка с неон-рамкой
    d.rounded_rectangle([box_l, box_t, box_r, box_b], radius=10,
                        fill=(15, 8, 32, 215), outline=(120, 90, 220, 230), width=2)
    # Текст поверх плашки
    d.text((_centered_x(d, d1, desc_f), y1), d1, font=desc_f, fill=(220, 220, 240))
    d.text((_centered_x(d, d2, desc_f), y1 + 28), d2, font=desc_f, fill=(255, 200, 90))

    # CTA-полоска внизу (как кнопка)
    # NB: ASCII-стрелки вместо ▸◂ — Arial их не содержит, выходили квадратики.
    cta = ">  ЖМИ  «СТАРТ»  —  ПОПАДЁШЬ  В  АРЕНУ  <"
    bbox = d.textbbox((0, 0), cta, font=tag_f)
    cw = bbox[2] - bbox[0]
    cy = int(H * 0.84)
    pad_x, pad_y = 18, 6
    cx_l = (W - cw) // 2 - pad_x
    cx_r = (W + cw) // 2 + pad_x
    d.rounded_rectangle([cx_l, cy - pad_y, cx_r, cy + 20 + pad_y], radius=12,
                        fill=(255, 60, 200, 90), outline=(255, 60, 200, 220), width=2)
    d.text(((W - cw) // 2, cy), cta, font=tag_f, fill=(255, 255, 255))

    out_abs = os.path.abspath(OUT_PATH)
    img.convert("RGB").save(out_abs, "PNG", optimize=True)
    size_kb = os.path.getsize(out_abs) // 1024
    print(f"OK: {out_abs}  ({W}x{H}, {size_kb} KB)")


if __name__ == "__main__":
    main()
