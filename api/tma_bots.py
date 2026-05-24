"""Генерация ботов для Башни и Натиска (TMA).

Единая модель силы: базовые статы берём из db._compute_bot_stats_for_level
(та же кривая, что у обычных PvE-ботов и игрока), затем одеваем через equip_bot
(гир по персоне + защита брони + сет-бонус/перк). Так соперник в любом режиме —
полноценный «одетый» боец, а не голый стат-блок.

- Натиск: сложность задаёт волна → эффективный уровень растёт с волной.
- Башня (Титаны): босс — статы на уровне игрока (умеренный урон, без бёрста
  от капа), но HP-танк (множитель по этажу) + растущая броня сета. Этаж-стена
  приходит от роста HP/брони, а не от мгновенной смерти.
"""

from __future__ import annotations

import random
from typing import Any, Dict

from config import MAX_LEVEL, PLAYER_START_CRIT, PLAYER_START_MAX_HP
from database import db
from repositories.bots.personas import pick_persona
from repositories.bots.persona_set import equip_bot

# Те же 31 id что у обычных PvE-ботов (см. webapp/bot_skin_picker.js).
# 6 и 19 пропущены — ассетов нет.
_BOT_SKIN_IDS = [i for i in range(1, 34) if i not in (6, 19)]


def _skin_id_for_index(idx: int) -> int:
    return _BOT_SKIN_IDS[(max(1, int(idx)) - 1) % len(_BOT_SKIN_IDS)]


def _clamp_level(lv: int) -> int:
    return max(1, min(int(MAX_LEVEL), int(lv)))


def _titan_boss_for_floor(floor: int, player: Dict[str, Any]) -> Dict[str, Any]:
    """Босс Башни: одетый боец на уровне игрока + HP-танк по этажу.

    Урон держим умеренным (статы на уровне игрока, медленно растут), чтобы босс
    не убивал в 2-3 удара через кап; стену этажей создаёт растущий HP и броня
    полного сета — бой превращается в долгий размен на истощение.
    """
    fl = max(1, int(floor))
    p_lvl = int(player.get("level", 1))
    # Боевой уровень: на 1-м этаже заметно НИЖЕ игрока (этаж проходим), растёт с
    # этажом и к ~15-му перерастает игрока — там и стена.
    stat_level = _clamp_level(round(p_lvl * (0.5 + 0.035 * fl)))
    s, e, c, hp = db._compute_bot_stats_for_level(stat_level)
    # HP-танк: вторичный рычаг (×1.035 на 1-м → до ×2.4), чтобы босс был «жирным»,
    # но убиваемым — а не стеной HP, которую не прогрызть за лимит раундов.
    hp_mult = 1.0 + min(1.4, fl * 0.035)
    names = [
        "Страж Руин", "Костяной Колосс", "Пепельный Воитель", "Ледяной Палач",
        "Громовой Вестник", "Тёмный Титан", "Владыка Башни",
    ]
    nick = names[(fl - 1) % len(names)]
    # Персона растёт с этажом: глубокие этажи — донатер в полном мифик-сете.
    persona = "donator" if fl >= 20 else ("major" if fl >= 8 else pick_persona(level=stat_level))
    boss: Dict[str, Any] = {
        "bot_id": 900000 + fl,
        "name": f"🗿 {nick} [{fl}]",
        "level": stat_level,
        "strength": max(8, int(s)),
        "endurance": max(8, int(e)),
        "crit": max(PLAYER_START_CRIT, int(c)),
        "max_hp": max(140, int(hp)),
        "current_hp": max(140, int(hp)),
        "bot_type": "titan_boss",
        "ai_pattern": "strategist",
        "skin_id": _skin_id_for_index(fl),
    }
    equip_bot(boss, persona, stat_level)
    # HP-танк применяем ПОСЛЕ гира (множим итоговый HP, включая бонус вещей/сета).
    boss["max_hp"] = int(boss["max_hp"] * hp_mult)
    boss["current_hp"] = boss["max_hp"]
    return boss


_WAVE_NAMES = (
    (1, 3, "Зелёный новобранец"), (4, 6, "Уличный боец"),
    (7, 10, "Опытный головорез"), (11, 15, "Боевой ветеран"),
    (16, 20, "Закалённый гладиатор"), (21, 30, "Элитный убийца"),
    (31, 40, "Тёмный рыцарь"), (41, 50, "Демон Арены"),
    (51, 999, "Легендарный Берсерк"),
)


def _endless_bot_for_wave(wave: int) -> Dict[str, Any]:
    """Бот Натиска: одетый боец, чей эффективный уровень растёт с волной.

    Ранние волны — слабые/полуголые новички, глубокие — мажоры/донатеры в сете.
    HP не копится у игрока между волнами → ramp от лёгкого к смертельному.
    """
    w = max(1, int(wave))
    eff_level = _clamp_level(1 + int(w * 1.1))
    s, e, c, hp = db._compute_bot_stats_for_level(eff_level)
    name = "Легендарный Берсерк"
    for lo, hi, n in _WAVE_NAMES:
        if lo <= w <= hi:
            name = n
            break
    persona = pick_persona(level=eff_level)
    bot: Dict[str, Any] = {
        "bot_id": 800000 + w,
        "name": f"[{w}] {name}",
        "level": eff_level,
        "strength": max(2, int(s)),
        "endurance": max(2, int(e)),
        "crit": max(1, int(c)),
        "max_hp": max(35, int(hp)),
        "current_hp": max(35, int(hp)),
        "is_premium": False,
        "skin_id": _skin_id_for_index(w),
    }
    equip_bot(bot, persona, eff_level)
    return bot
