"""Тактика «голова/тело/ноги» в бою с мировым боссом (Фаза 2).

Игрок при ударе выбирает зону атаки и зону защиты. Сервер для этого удара
рандомит зону защиты босса и зону атаки босса (per-hit). Сравниваем:

- atk_match (player_atk == boss_def) → урон по боссу * ATK_BLOCK_MULT (блок)
- def_match (player_def == boss_atk) → 0 урона по игроку (отбил)
- иначе: полный урон по боссу / контр-урон 3% maxHP игроку

Чистая функция (без БД), легко тестируется.
"""
from __future__ import annotations

import random
from typing import Optional

ZONES = ("HEAD", "TORSO", "LEGS")
ATK_BLOCK_MULT = 0.4   # урон по боссу при попадании в защиту = 40% от обычного
PLAYER_HIT_PCT = 0.03  # 3% maxHP игрока за пропущенный встречный удар босса

# Защита новичков от тяжёлых рейдов: контр-урон масштабируется по уровню.
# Лоулевелы получают мягче, чтобы не вылетали с пары пропусков защиты.
NEWBIE_TIER_LOW_LEVEL    = 10   # < 10 ур. → ×0.5
NEWBIE_TIER_MID_LEVEL    = 30   # 10-29 ур. → ×0.75; 30+ ур. → ×1.0
NEWBIE_MULT_LOW          = 0.5
NEWBIE_MULT_MID          = 0.75


def _norm(z) -> Optional[str]:
    if not z:
        return None
    z = str(z).upper().strip()
    return z if z in ZONES else None


def _newbie_mult(level: int) -> float:
    if level < NEWBIE_TIER_LOW_LEVEL:
        return NEWBIE_MULT_LOW
    if level < NEWBIE_TIER_MID_LEVEL:
        return NEWBIE_MULT_MID
    return 1.0


def resolve_zones(
    player_atk_zone,
    player_def_zone,
    player_max_hp: int,
    base_damage_to_boss: int,
    *,
    player_level: int = 0,
    rng=None,
) -> dict:
    """Считает результат «зонного» удара.

    Args:
        player_atk_zone: 'HEAD'|'TORSO'|'LEGS' или None (старый клиент)
        player_def_zone: 'HEAD'|'TORSO'|'LEGS' или None
        player_max_hp:   максимальный HP игрока в рейде
        base_damage_to_boss: урон до зон-модификатора
        rng: random.Random для тестов (опционально)

    Returns dict:
        zone_mode: True если зоны переданы, иначе бэкап-режим (без зон).
        boss_atk_zone / boss_def_zone: что выбрал босс (или None в бэкапе).
        atk_blocked: атака игрока попала в защиту босса.
        def_blocked: защита игрока совпала с атакой босса (отбил).
        modified_damage: урон по боссу с учётом блока.
        counter_damage:  урон по игроку (0 если отбил).
    """
    rng = rng or random
    atk = _norm(player_atk_zone)
    dfn = _norm(player_def_zone)

    # Бэкап-совместимость: старый клиент без зон → полный урон, без контра.
    if not atk or not dfn:
        return {
            "zone_mode": False,
            "boss_atk_zone": None,
            "boss_def_zone": None,
            "atk_blocked": False,
            "def_blocked": True,
            "modified_damage": int(base_damage_to_boss),
            "counter_damage": 0,
        }

    boss_def = rng.choice(ZONES)
    boss_atk = rng.choice(ZONES)
    atk_blocked = (atk == boss_def)
    def_blocked = (dfn == boss_atk)

    mod_dmg = max(1, int(base_damage_to_boss * (ATK_BLOCK_MULT if atk_blocked else 1.0)))
    counter = 0 if def_blocked else max(1, int(player_max_hp * PLAYER_HIT_PCT))
    # Защита новичков: на низких уровнях контр-урон ослаблен.
    if counter > 0 and player_level > 0:
        counter = max(1, int(counter * _newbie_mult(int(player_level))))

    return {
        "zone_mode": True,
        "boss_atk_zone": boss_atk,
        "boss_def_zone": boss_def,
        "atk_blocked": atk_blocked,
        "def_blocked": def_blocked,
        "modified_damage": mod_dmg,
        "counter_damage": counter,
    }
