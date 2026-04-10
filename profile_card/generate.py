"""Сборка PNG карточки профиля."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw

from config import (
    CRIT_MAX_CHANCE,
    DODGE_MAX_CHANCE,
    MAX_LEVEL,
    PLAYER_START_CRIT,
    PLAYER_START_MAX_HP,
    STRENGTH_DAMAGE_FLAT_PER_LEVEL,
    STRENGTH_DAMAGE_POWER,
    STRENGTH_DAMAGE_SCALE,
    armor_reduction,
    exp_needed_for_next_level,
    stamina_stats_invested,
    total_free_stats_at_level,
)
from profile_card.constants import (
    BG_TOP,
    C_BLUE,
    C_GOLD,
    C_GRAY,
    C_GREEN,
    C_ORANGE,
    C_RED,
    C_WHITE,
    H,
    STAT_COLORS,
    W,
)
from profile_card.decoration import _draw_frame, _draw_stars, _draw_warrior
from profile_card.draw_helpers import _draw_bar, _draw_gradient_bg, _draw_rounded_rect
from profile_card.fonts import _BOLD, _NORMAL


def generate_profile_card(player: dict) -> bytes:
    """
    Генерирует PNG-карточку профиля игрока.
    Возвращает bytes.
    """
    lv = int(player.get("level", 1))
    name = str(player.get("username") or "Боец")[:18]
    s = int(player.get("strength", 3))
    agi = int(player.get("endurance", 3))
    intu = int(player.get("crit", PLAYER_START_CRIT))
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    gold = int(player.get("gold", 0))
    wins = int(player.get("wins", 0))
    loss = int(player.get("losses", 0))
    rat = int(player.get("rating", 1000))
    exp = int(player.get("exp", 0))
    fs = int(player.get("free_stats", 0))

    vyn = stamina_stats_invested(mhp, lv)
    tf = total_free_stats_at_level(lv)

    avg_agi = max(1, 3 + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    dodge_p = int(min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100)
    crit_p = int(min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100)
    armor_p = round(armor_reduction(vyn, lv) * 100, 1)
    dmg = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))

    need_xp = exp_needed_for_next_level(lv)

    img = Image.new("RGB", (W, H), BG_TOP)
    _draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)
    _draw_stars(draw, seed=lv + wins)

    char_cx, char_cy = 145, 155
    for r in range(55, 5, -5):
        draw.ellipse([char_cx - r, char_cy - r, char_cx + r, char_cy + r],
                     fill=(100, 80, 200))
    _draw_warrior(draw, char_cx, char_cy, scale=0.92)

    fn_label = _BOLD(13)
    _draw_rounded_rect(draw, (8, H - 72, 270, H - 8), 10, (25, 22, 42, 180),
                       outline=(70, 60, 110), outline_width=1)

    draw.text((char_cx, 18), name, font=_BOLD(20), fill=C_WHITE, anchor="mt")

    badge_x, badge_y = char_cx, 46
    _draw_rounded_rect(draw, (badge_x - 28, badge_y - 12, badge_x + 28, badge_y + 12),
                       8, C_GOLD)
    draw.text((badge_x, badge_y), f"ур.{lv}", font=_BOLD(14), fill=(20, 18, 30), anchor="mm")

    draw.text((char_cx, 68), f"★ {rat}", font=_NORMAL(13), fill=C_GOLD, anchor="mt")

    if wins > 0:
        wr = int(wins / max(1, wins + loss) * 100)
        draw.text((char_cx, 87), f"{wins}W / {loss}L  ({wr}%)", font=_NORMAL(12), fill=C_GRAY, anchor="mt")

    draw.text((18, H - 57), "Золото", font=fn_label, fill=C_GRAY)
    draw.text((18, H - 41), f"{gold:,}".replace(",", " "), font=_BOLD(16), fill=C_GOLD)

    if fs > 0:
        _draw_rounded_rect(draw, (100, H - 60, 220, H - 36), 8,
                           (80, 40, 10))
        draw.text((160, H - 48), f"⚡ +{fs} статов свободно",
                  font=_BOLD(11), fill=C_ORANGE, anchor="mm")

    hbar_x, hbar_y = 10, H - 30
    hbar_w = 252
    hp_color = C_GREEN if chp / mhp > 0.5 else (C_ORANGE if chp / mhp > 0.25 else C_RED)
    _draw_bar(draw, hbar_x, hbar_y, hbar_w, 16, chp, mhp, hp_color, radius=6)
    draw.text((hbar_x + hbar_w // 2, hbar_y + 8),
              f"HP  {chp}/{mhp}", font=_BOLD(10), fill=C_WHITE, anchor="mm")

    if lv < MAX_LEVEL and need_xp > 0:
        xbar_x, xbar_y = 10, H - 14
        _draw_bar(draw, xbar_x, xbar_y, 252, 8, exp, need_xp, C_BLUE, radius=3)

    rx = 280
    rw = W - rx - 10

    _draw_rounded_rect(draw, (rx - 5, 8, W - 8, H - 8), 12, (22, 20, 38, 220),
                       outline=(70, 60, 110), outline_width=1)

    draw.text((rx + rw // 2, 20), "ХАРАКТЕРИСТИКИ",
              font=_BOLD(13), fill=C_GRAY, anchor="mt")

    draw.line([(rx, 38), (W - 12, 38)], fill=(70, 60, 110), width=1)

    stats = [
        ("💪  Сила", s, f"~{dmg} ур.", STAT_COLORS["str"]),
        ("🤸  Ловкость", agi, f"{dodge_p}% уворот", STAT_COLORS["agi"]),
        ("💥  Интуиция", intu, f"{crit_p}% крит", STAT_COLORS["int"]),
        ("🛡  Выносл.", vyn, f"{armor_p}% броня", STAT_COLORS["vyn"]),
    ]

    row_h = 52
    for i, (label, val, pct_str, col) in enumerate(stats):
        sy = 44 + i * row_h
        bx = rx + 5

        if i % 2 == 0:
            _draw_rounded_rect(draw, (bx, sy, W - 12, sy + row_h - 4), 6,
                               (28, 26, 46))

        draw.rounded_rectangle([bx, sy + 4, bx + 4, sy + row_h - 8], radius=2, fill=col)

        draw.text((bx + 12, sy + 8), label, font=_BOLD(13), fill=C_WHITE)

        draw.text((bx + 12, sy + 25), str(val), font=_BOLD(22), fill=col)

        max_expected = max(1, 3 + tf)
        bar_x = bx + 55
        bar_y = sy + 28
        bar_w = int(rw * 0.45)
        _draw_bar(draw, bar_x, bar_y, bar_w, 8, val, max_expected, col,
                  bg_color=(40, 38, 58), radius=3, outline=None)

        draw.text((W - 15, sy + 27), pct_str,
                  font=_NORMAL(11), fill=col, anchor="ra")

    _draw_frame(draw)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.getvalue()
