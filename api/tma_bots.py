"""Генерация ботов для Башни и Натиска (TMA)."""

from __future__ import annotations

from typing import Any, Dict

from config import PLAYER_START_CRIT, PLAYER_START_MAX_HP

# Те же 31 id что у обычных PvE-ботов (см. webapp/bot_skin_picker.js).
# 6 и 19 пропущены — ассетов нет.
_BOT_SKIN_IDS = [i for i in range(1, 34) if i not in (6, 19)]


def _skin_id_for_index(idx: int) -> int:
    return _BOT_SKIN_IDS[(max(1, int(idx)) - 1) % len(_BOT_SKIN_IDS)]


def _titan_boss_for_floor(floor: int, player: Dict[str, Any]) -> Dict[str, Any]:
    fl = max(1, int(floor))
    lvl = int(player.get("level", 1))
    base_lvl = max(1, lvl + (fl - 1) // 2)
    hp_scale = 1.0 + min(3.5, fl * 0.14)
    str_scale = 1.0 + min(2.4, fl * 0.09)
    end_scale = 1.0 + min(2.8, fl * 0.10)
    crit_bonus = min(22, fl // 2)
    names = [
        "Страж Руин",
        "Костяной Колосс",
        "Пепельный Воитель",
        "Ледяной Палач",
        "Громовой Вестник",
        "Темный Титан",
        "Владыка Башни",
    ]
    nick = names[(fl - 1) % len(names)]
    p_max_hp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    p_str = int(player.get("strength", 10))
    p_end = int(player.get("endurance", 10))
    p_crit = int(player.get("crit", PLAYER_START_CRIT))
    max_hp = max(140, int(round(p_max_hp * hp_scale)))
    strength = max(8, int(round(p_str * str_scale)))
    endurance = max(8, int(round(p_end * end_scale)))
    crit = max(PLAYER_START_CRIT, p_crit + crit_bonus)
    return {
        "bot_id": 900000 + fl,
        "name": f"🗿 {nick} [{fl}]",
        "level": base_lvl,
        "strength": strength,
        "endurance": endurance,
        "crit": crit,
        "max_hp": max_hp,
        "current_hp": max_hp,
        "bot_type": "titan_boss",
        "ai_pattern": "adaptive",
        "skin_id": _skin_id_for_index(fl),
    }


def _endless_bot_for_wave(wave: int) -> Dict[str, Any]:
    """Генератор бота для режима Натиск."""
    WAVE_NAMES = [
        (1, 3, "Зелёный новобранец"),
        (4, 6, "Уличный боец"),
        (7, 10, "Опытный головорез"),
        (11, 15, "Боевой ветеран"),
        (16, 20, "Закалённый гладиатор"),
        (21, 30, "Элитный убийца"),
        (31, 40, "Тёмный рыцарь"),
        (41, 50, "Демон Арены"),
        (51, 99, "Легендарный Берсерк"),
    ]
    name = "Легендарный Берсерк"
    for lo, hi, n in WAVE_NAMES:
        if lo <= wave <= hi:
            name = n
            break
    strength = max(2, 2 + int(wave * 0.75))
    endurance = max(2, 2 + int(wave * 0.50))
    crit = max(1, 1 + int(wave * 0.35))
    max_hp = max(35, 35 + wave * 13)
    level = max(1, 1 + int(wave * 0.55))
    return {
        "bot_id": 800000 + wave,
        "name": f"[{wave}] {name}",
        "level": level,
        "strength": strength,
        "endurance": endurance,
        "crit": crit,
        "max_hp": max_hp,
        "current_hp": max_hp,
        "is_premium": False,
        "skin_id": _skin_id_for_index(wave),
    }
