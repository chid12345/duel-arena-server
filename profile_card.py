"""
Генерация карточки профиля игрока (PIL).
Возвращает bytes PNG, который можно отправить как фото в Telegram.
"""

import io
import math
import os
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

# ─── Шрифты (Windows: Arial; Linux/Docker: DejaVu из fonts-dejavu-core) ─────
def _truetype_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ]
    for path in candidates:
        if not os.path.isfile(path):
            continue
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


_BOLD = lambda s: _truetype_font(s, bold=True)
_NORMAL = lambda s: _truetype_font(s, bold=False)

# ─── Цвета ───────────────────────────────────────────────────────────────────
BG_TOP    = (18, 18, 28)
BG_BOT    = (28, 24, 40)
PANEL_BG  = (30, 28, 48, 200)   # полупрозрачная панель

C_GOLD    = (255, 200, 60)
C_RED     = (220, 60, 70)
C_GREEN   = (60, 200, 100)
C_BLUE    = (80, 150, 255)
C_PURPLE  = (180, 90, 255)
C_ORANGE  = (255, 140, 40)
C_CYAN    = (60, 200, 220)
C_WHITE   = (240, 240, 250)
C_GRAY    = (130, 130, 150)
C_DARK    = (40, 36, 60)

STAT_COLORS = {
    "str": C_RED,
    "agi": C_CYAN,
    "int": C_PURPLE,
    "vyn": C_GREEN,
}

# ─── Размеры карточки ─────────────────────────────────────────────────────────
W, H = 640, 320

# ─── Вспомогательные функции ─────────────────────────────────────────────────

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
    # фон
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


def _text_w(draw: ImageDraw.Draw, text: str, font) -> int:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0]


# ─── Силуэт воина (простые фигуры) ───────────────────────────────────────────

def _draw_warrior(draw: ImageDraw.Draw, cx: int, cy: int, scale: float = 1.0, color=C_WHITE):
    """Схематичный силуэт воина из ellipse + polygon."""
    s = scale
    # голова
    hx, hy, hr = cx, cy - int(60 * s), int(18 * s)
    draw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=color)
    # тело
    bx0, by0 = cx - int(20 * s), cy - int(40 * s)
    bx1, by1 = cx + int(20 * s), cy + int(10 * s)
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=int(8 * s), fill=color)
    # левая рука
    draw.line([
        (cx - int(20 * s), cy - int(30 * s)),
        (cx - int(40 * s), cy + int(5 * s)),
    ], fill=color, width=max(3, int(8 * s)))
    # правая рука (с мечом)
    draw.line([
        (cx + int(20 * s), cy - int(30 * s)),
        (cx + int(45 * s), cy - int(10 * s)),
    ], fill=color, width=max(3, int(8 * s)))
    # меч
    draw.line([
        (cx + int(45 * s), cy - int(10 * s)),
        (cx + int(72 * s), cy - int(55 * s)),
    ], fill=C_GOLD, width=max(3, int(5 * s)))
    # гарда
    draw.line([
        (cx + int(38 * s), cy - int(20 * s)),
        (cx + int(58 * s), cy - int(20 * s)),
    ], fill=C_GOLD, width=max(2, int(4 * s)))
    # левая нога
    draw.line([
        (cx - int(8 * s), cy + int(10 * s)),
        (cx - int(14 * s), cy + int(55 * s)),
    ], fill=color, width=max(3, int(10 * s)))
    # правая нога
    draw.line([
        (cx + int(8 * s), cy + int(10 * s)),
        (cx + int(14 * s), cy + int(55 * s)),
    ], fill=color, width=max(3, int(10 * s)))
    # щит (левая рука)
    sx, sy = cx - int(52 * s), cy - int(22 * s)
    sr = int(16 * s)
    draw.ellipse([sx - sr, sy - sr*2//1, sx + sr//2, sy + sr*2//1],
                 outline=C_BLUE, fill=(40, 80, 160), width=int(3*s))
    # узор щита
    draw.line([sx - sr//2, sy, sx + sr//3, sy], fill=C_CYAN, width=int(2*s))


# ─── Звёзды фона ─────────────────────────────────────────────────────────────

def _draw_stars(draw: ImageDraw.Draw, seed: int = 42):
    import random
    rng = random.Random(seed)
    for _ in range(50):
        x = rng.randint(0, W)
        y = rng.randint(0, H)
        r = rng.randint(1, 2)
        a = rng.randint(80, 200)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(a, a, a+30))


# ─── Декоративная рамка ───────────────────────────────────────────────────────

def _draw_frame(draw: ImageDraw.Draw):
    # внешняя рамка
    draw.rounded_rectangle([3, 3, W-4, H-4], radius=16,
                            outline=C_GOLD, width=2)
    # угловые акценты
    acc = 20
    for px, py in [(8, 8), (W-8, 8), (8, H-8), (W-8, H-8)]:
        draw.ellipse([px-4, py-4, px+4, py+4], fill=C_GOLD)


# ─── Основная функция ─────────────────────────────────────────────────────────

def generate_profile_card(player: dict) -> bytes:
    """
    Генерирует PNG-карточку профиля игрока.
    Возвращает bytes.
    """
    from config import (
        PLAYER_START_MAX_HP, PLAYER_START_CRIT, PLAYER_START_LEVEL,
        stamina_stats_invested, total_free_stats_at_level,
        DODGE_MAX_CHANCE, CRIT_MAX_CHANCE, ARMOR_MAX_REDUCTION,
        ARMOR_STAMINA_K, STRENGTH_DAMAGE_BASE, STRENGTH_DAMAGE_PCT_PER_POINT,
        format_exp_progress, exp_needed_for_next_level, MAX_LEVEL,
    )

    lv   = int(player.get('level', 1))
    name = str(player.get('username') or 'Боец')[:18]
    s    = int(player.get('strength', 3))
    agi  = int(player.get('endurance', 3))
    intu = int(player.get('crit', PLAYER_START_CRIT))
    mhp  = int(player.get('max_hp', PLAYER_START_MAX_HP))
    chp  = int(player.get('current_hp', mhp))
    gold = int(player.get('gold', 0))
    wins = int(player.get('wins', 0))
    loss = int(player.get('losses', 0))
    rat  = int(player.get('rating', 1000))
    exp  = int(player.get('exp', 0))
    fs   = int(player.get('free_stats', 0))

    vyn = stamina_stats_invested(mhp, lv)
    tf  = total_free_stats_at_level(lv)

    # Combat %
    avg_agi  = max(1, 3 + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    dodge_p  = int(min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100)
    crit_p   = int(min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100)
    s_pct    = vyn / tf * 100 if tf > 0 else 0
    armor_p  = int(min(ARMOR_MAX_REDUCTION, s_pct / (s_pct + ARMOR_STAMINA_K)) * 100) if s_pct > 0 else 0
    dmg      = int(STRENGTH_DAMAGE_BASE * (1 + s * STRENGTH_DAMAGE_PCT_PER_POINT))

    need_xp  = exp_needed_for_next_level(lv)

    # ── Рисуем ──────────────────────────────────────────────────────────────
    img  = Image.new("RGB", (W, H), BG_TOP)
    _draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    _draw_stars(draw, seed=lv + wins)

    # ── Персонаж (центр-лево) ───────────────────────────────────────────────
    char_cx, char_cy = 145, 155
    # Свечение позади
    for r in range(55, 5, -5):
        alpha = int(15 * (1 - r / 55))
        draw.ellipse([char_cx - r, char_cy - r, char_cx + r, char_cy + r],
                     fill=(100, 80, 200))
    _draw_warrior(draw, char_cx, char_cy, scale=0.92)

    # ── Левая панель: имя + уровень + рейтинг ──────────────────────────────
    fn_name  = _BOLD(22)
    fn_label = _BOLD(13)
    fn_val   = _NORMAL(13)
    fn_big   = _BOLD(16)

    # Фон левой панели (под персонажем — нижняя полоса)
    _draw_rounded_rect(draw, (8, H - 72, 270, H - 8), 10, (25, 22, 42, 180),
                       outline=(70, 60, 110), outline_width=1)

    # Имя
    draw.text((char_cx, 18), name, font=_BOLD(20), fill=C_WHITE, anchor="mt")

    # Бейдж уровня
    badge_x, badge_y = char_cx, 46
    _draw_rounded_rect(draw, (badge_x - 28, badge_y - 12, badge_x + 28, badge_y + 12),
                       8, C_GOLD)
    draw.text((badge_x, badge_y), f"ур.{lv}", font=_BOLD(14), fill=(20, 18, 30), anchor="mm")

    # Рейтинг
    draw.text((char_cx, 68), f"★ {rat}", font=_NORMAL(13), fill=C_GOLD, anchor="mt")

    # Серия побед
    if wins > 0:
        wr = int(wins / max(1, wins + loss) * 100)
        draw.text((char_cx, 87), f"{wins}W / {loss}L  ({wr}%)", font=_NORMAL(12), fill=C_GRAY, anchor="mt")

    # Золото
    draw.text((18, H - 57), "Золото", font=fn_label, fill=C_GRAY)
    draw.text((18, H - 41), f"{gold:,}".replace(",", " "), font=_BOLD(16), fill=C_GOLD)

    # Свободные статы
    if fs > 0:
        _draw_rounded_rect(draw, (100, H - 60, 220, H - 36), 8,
                           (80, 40, 10))
        draw.text((160, H - 48), f"⚡ +{fs} статов свободно",
                  font=_BOLD(11), fill=C_ORANGE, anchor="mm")

    # ── HP бар ──────────────────────────────────────────────────────────────
    hbar_x, hbar_y = 10, H - 30
    hbar_w = 252
    hp_color = C_GREEN if chp / mhp > 0.5 else (C_ORANGE if chp / mhp > 0.25 else C_RED)
    _draw_bar(draw, hbar_x, hbar_y, hbar_w, 16, chp, mhp, hp_color, radius=6)
    draw.text((hbar_x + hbar_w // 2, hbar_y + 8),
              f"HP  {chp}/{mhp}", font=_BOLD(10), fill=C_WHITE, anchor="mm")

    # ── XP бар ──────────────────────────────────────────────────────────────
    if lv < MAX_LEVEL and need_xp > 0:
        xbar_x, xbar_y = 10, H - 14
        _draw_bar(draw, xbar_x, xbar_y, 252, 8, exp, need_xp, C_BLUE, radius=3)

    # ── Правая панель: статы ─────────────────────────────────────────────────
    rx = 280   # x начала правой части
    rw = W - rx - 10  # ширина

    # Фон правой панели
    _draw_rounded_rect(draw, (rx - 5, 8, W - 8, H - 8), 12, (22, 20, 38, 220),
                       outline=(70, 60, 110), outline_width=1)

    # Заголовок
    draw.text((rx + rw // 2, 20), "ХАРАКТЕРИСТИКИ",
              font=_BOLD(13), fill=C_GRAY, anchor="mt")

    # Разделитель
    draw.line([(rx, 38), (W - 12, 38)], fill=(70, 60, 110), width=1)

    # Статы
    stats = [
        ("💪  Сила",      s,   f"~{dmg} ур.", STAT_COLORS["str"]),
        ("🤸  Ловкость",  agi,  f"{dodge_p}% уворот", STAT_COLORS["agi"]),
        ("💥  Интуиция",  intu, f"{crit_p}% крит",    STAT_COLORS["int"]),
        ("🛡  Выносл.",   vyn,  f"{armor_p}% броня",  STAT_COLORS["vyn"]),
    ]

    row_h = 52
    for i, (label, val, pct_str, col) in enumerate(stats):
        sy = 44 + i * row_h
        bx = rx + 5

        # Фон строки
        if i % 2 == 0:
            _draw_rounded_rect(draw, (bx, sy, W - 12, sy + row_h - 4), 6,
                               (28, 26, 46))

        # Цветная полоска слева
        draw.rounded_rectangle([bx, sy + 4, bx + 4, sy + row_h - 8], radius=2, fill=col)

        # Название стата
        draw.text((bx + 12, sy + 8), label, font=_BOLD(13), fill=C_WHITE)

        # Значение (большое, цветное)
        draw.text((bx + 12, sy + 25), str(val), font=_BOLD(22), fill=col)

        # Мини-бар значения (насколько прокачан)
        max_expected = max(1, 3 + tf)
        bar_x = bx + 55
        bar_y = sy + 28
        bar_w = int(rw * 0.45)
        _draw_bar(draw, bar_x, bar_y, bar_w, 8, val, max_expected, col,
                  bg_color=(40, 38, 58), radius=3, outline=None)

        # % подпись справа
        draw.text((W - 15, sy + 27), pct_str,
                  font=_NORMAL(11), fill=col, anchor="ra")

    # ── Рамка поверх всего ──────────────────────────────────────────────────
    _draw_frame(draw)

    # ── Экспорт ─────────────────────────────────────────────────────────────
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.getvalue()
