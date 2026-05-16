"""Совместимый интерфейс старой системы set-бонусов поверх нового v2 (Этап 5C).

Старая система (рарити-сеты): один активный сет одной редкости (common/rare/
epic/mythic), порог 3-6. Заменена архетипными сетами 2/4/6 (этап 5A-5B).

Этот файл — compatibility shim: имена функций и сигнатуры сохранены, но
вся логика делегирована в repositories/sets/set_resolver. Это даёт:
- consumers (api/world_boss_*, battle_system/mixins/set_perks, tma_route_player)
  работают без правок;
- агрегация ВСЕХ активных архетипных сетов (несколько одновременно) выдаётся
  как «один сводный» сет для UI/боя;
- ring2 исключается (как и раньше).

Старые SET_BONUSES/SET_NAMES/SET_EMOJI оставлены для обратной совместимости UI,
но в новой системе они не используются — see config/sets_catalog_v2.py.
"""
from __future__ import annotations

from db_schema.equipment_catalog import (
    SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1, SLOT_SHIELD, SLOT_WEAPON,
    RARITY_COMMON, RARITY_EPIC, RARITY_RARE,
)
from repositories.sets import aggregate_set_bonuses, resolve_active_sets

RARITY_MYTHIC = "mythic"

# Категории сета — 6 штук. ring2 НЕ считается (legacy, в UI скрыт).
# Оставлено для consumers, которые читают эту константу напрямую.
SET_CATEGORIES = [SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1]

# Legacy константы для UI — сохранены как декорации (новые архетипы используют свои):
RARITY_ORDER = [RARITY_COMMON, RARITY_RARE, RARITY_EPIC, RARITY_MYTHIC]
SET_NAMES = {RARITY_COMMON: "Новобранец", RARITY_RARE: "Герой",
             RARITY_EPIC: "Чемпион", RARITY_MYTHIC: "Бог войны"}
SET_EMOJI = {RARITY_COMMON: "🥈", RARITY_RARE: "🥇",
             RARITY_EPIC: "💎", RARITY_MYTHIC: "⭐"}

# Legacy SET_BONUSES — больше не используется в новой системе, но не удалён
# чтобы существующие UI-таблицы продолжали работать. Реальные бонусы — в
# config/sets_catalog_v2.py.
SET_BONUSES: dict[str, dict[int, dict]] = {}
SET_PERKS = {}
PERK_INFO = {}


def class_id_to_rarity(class_id: str | None) -> str | None:
    """Legacy: парсер class_id (гардероб) в редкость сета. Не используется
    в новой системе (см. config/class_set_mapping.class_id_to_set_id).
    Оставлен для совместимости consumers."""
    if not class_id:
        return None
    cid = str(class_id)
    if cid.startswith("usdt_custom_"):
        return RARITY_MYTHIC
    if cid.endswith("_mythic") or cid.endswith("_usdt"):
        return RARITY_MYTHIC
    if cid.endswith("_diamonds"):
        return RARITY_EPIC
    if cid.endswith("_gold"):
        return RARITY_RARE
    if cid.endswith("_free"):
        return RARITY_COMMON
    return None


def count_set_rarities(equipped: dict, current_class: str | None = None) -> dict[str, int]:  # noqa: ARG001
    """Legacy. Возвращает {rarity: count} для совместимости. В новой системе
    рарити больше не основа сетов — используется set_id. Эта функция оставлена
    для UI/тестов, считает по старой логике (для отчётности).

    Унификация armor (шаг 4/6): armor теперь полноценный слот в equipped,
    рарити берётся прямо из equipped[SLOT_ARMOR]. Параметр current_class
    игнорируется (оставлен для обратной совместимости старых вызовов).
    """
    counts: dict[str, int] = {}
    for slot in SET_CATEGORIES:
        item = equipped.get(slot)
        rarity = item.get("rarity") if item else None
        if not rarity:
            continue
        counts[rarity] = counts.get(rarity, 0) + 1
    return counts


def resolve_active_set(equipped: dict, current_class: str | None = None) -> dict | None:
    """Совместимый возврат «одного главного сета» из множества активных
    архетипных. Берёт сет с max threshold, при равенстве — с max count.

    Формат: {rarity, count, threshold, name, emoji, bonuses, perk}.
    Поле 'rarity' переименовано под архетип ('predator'/'bastion'/...).
    """
    actives = resolve_active_sets(equipped, current_class)
    if not actives:
        return None
    # Берём «главный» — самый высокий порог, потом count
    best = max(actives, key=lambda s: (s["threshold"], s["count"]))
    return {
        "rarity": best["set_id"],  # legacy-имя поля (для consumers)
        "count": best["count"],
        "threshold": best["threshold"],
        "name": best["name"],
        "emoji": best["emoji"],
        "bonuses": best["bonuses"],
        "perk": best["bonuses"].get("perk_id"),
    }


def apply_set_to_wb_stats(eff_max_hp: int, eff_strength: int,
                          equipped: dict, current_class: str | None) -> tuple[int, int]:
    """Применяет hp_pct и atk_pct ВСЕХ активных сетов к эффективным статам."""
    data = get_wb_set_data(equipped, current_class)
    new_hp = int(eff_max_hp * (1 + data["hp_pct"] / 100)) if data["hp_pct"] else eff_max_hp
    new_str = int(eff_strength * (1 + data["atk_pct"] / 100)) if data["atk_pct"] else eff_strength
    return new_hp, new_str


def get_wb_set_data(equipped: dict, current_class: str | None) -> dict:
    """Сводка по всем активным сетам для WB. Аггрегированные проценты.

    Возвращает legacy-формат {hp_pct, atk_pct, def_pct, perk_id, count, rarity}.
    count — суммарное число предметов в активных сетах.
    rarity — set_id «главного» сета (или None если ни одного).
    perk_id — первый перк из агрегированного списка (или None).
    """
    actives = resolve_active_sets(equipped, current_class)
    if not actives:
        return {"hp_pct": 0, "atk_pct": 0, "def_pct": 0.0,
                "perk_id": None, "count": 0, "rarity": None}
    agg = aggregate_set_bonuses(actives)
    main = max(actives, key=lambda s: (s["threshold"], s["count"]))
    perks = agg.get("perks") or []
    return {
        "hp_pct":  int(agg.get("hp_pct", 0)),
        "atk_pct": int(agg.get("atk_pct", 0)),
        "def_pct": float(agg.get("def_pct", 0.0)),
        "perk_id": perks[0] if perks else None,
        "count":   sum(s["count"] for s in actives),
        "rarity":  main["set_id"],
    }


_HUMAN_STAT_LABELS: tuple[tuple[str, str], ...] = (
    ("hp_pct",       "+{v}% HP"),
    ("atk_pct",      "+{v}% урон"),
    ("def_pct_bonus", "+{vp}% защита от урона"),  # legacy ключ
    ("def_pct",      "+{vp}% защита от урона"),   # новый ключ
    ("crit_bonus",   "+{v} крит"),
    ("dodge_bonus",  "+{v}% уворот"),
    ("accuracy",     "+{v}% точность"),
    ("pen_pct",      "+{vp}% пробой брони"),
    ("double_pct",   "+{v}% двойной удар"),
)


def bonuses_human(bonuses: dict) -> list[str]:
    """Текстовый список бонусов для UI. Поддерживает оба формата (старый+новый)."""
    lines: list[str] = []
    for key, template in _HUMAN_STAT_LABELS:
        val = bonuses.get(key)
        if not val:
            continue
        if "{vp}" in template:
            lines.append(template.format(vp=int(float(val) * 100)))
        else:
            lines.append(template.format(v=int(val)))
    return lines
