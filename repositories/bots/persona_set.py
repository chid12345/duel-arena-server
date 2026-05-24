"""Полный комплект одного архетипа для высокоуровневых «богатых» ботов.

Зачем: топ-игрок одет в полный сет 6/6 (сет-бонус + перк) и оптимизирован.
Бот-«мажор»/«донатер» на высоких уровнях должен быть таким же — иначе бой
заканчивается за 2-4 хода. Здесь бот собирает реальный сет одного архетипа
(predator/bastion/berserk/ghost/mage/regent) и получает тот же сет-бонус, что
и игрок — честно, без «читерских» множителей.

Слой repositories: используем чистые резолверы repositories.sets (тот же слой),
боевой движок (execute.py) сам обрабатывает перк бота (_set_perk_id) и шипы.
"""
from __future__ import annotations

import random
from collections import defaultdict
from typing import Dict, List

from db_schema.equipment_catalog import EQUIPMENT_CATALOG
from repositories.bots.persona_gear import SLOTS_FOR_BOT, pick_gear_for_persona
from repositories.sets import aggregate_set_bonuses, resolve_active_sets

# Полный комплект собирается от этого уровня (эпик-эра, T3). Ниже — мажор/донатер
# донашиваются смешанным гардеробом (как раньше), чтобы не давить юного игрока.
SET_GEAR_MIN_LEVEL = 45

RARITY_RANK = {"common": 0, "rare": 1, "epic": 2, "mythic": 3}

# Какие архетипы реально дотягивают до нужной редкости по ВСЕМ слотам
# (см. маппинг set_id в db_schema/equipment_items/__init__._SET_RING):
#   до mythic доходят predator/bastion/berserk/ghost; mage/regent — только до epic.
DONATOR_SETS = ("predator", "bastion", "berserk", "ghost")  # mythic-наполнение
MAJOR_SETS   = ("berserk", "ghost", "mage", "regent")        # потолок epic


def _build_index() -> Dict[str, Dict[str, Dict[int, List[str]]]]:
    """{set_id: {slot: {rarity_rank: [item_id, ...]}}} — строится один раз."""
    idx: Dict[str, Dict[str, Dict[int, List[str]]]] = defaultdict(
        lambda: defaultdict(lambda: defaultdict(list))
    )
    for iid, item in EQUIPMENT_CATALOG.items():
        sid = item.get("set_id")
        slot = item.get("slot")
        rank = RARITY_RANK.get(item.get("rarity"))
        if sid and slot and rank is not None:
            idx[sid][slot][rank].append(iid)
    return idx


_SET_SLOT_INDEX = _build_index()


def _best_item(set_id: str, slot: str, cap_rank: int, rng: random.Random) -> str | None:
    """Лучший предмет данного сета в слоте: высшая редкость ≤ cap, вниз по fallback."""
    by_rank = _SET_SLOT_INDEX.get(set_id, {}).get(slot, {})
    for rank in range(cap_rank, -1, -1):
        if by_rank.get(rank):
            return rng.choice(by_rank[rank])
    return None


def pick_matched_set(rng: random.Random, allow_mythic: bool) -> Dict[str, str]:
    """Собрать полный комплект (все слоты) одного архетипа в максимальной редкости.

    allow_mythic=True (донатер) → мифик-сеты; иначе (мажор) → потолок epic.
    Возвращает {slot: item_id}. Пусто, если ни один сет не покрывает все слоты.
    """
    cap = RARITY_RANK["mythic"] if allow_mythic else RARITY_RANK["epic"]
    candidates = DONATOR_SETS if allow_mythic else MAJOR_SETS
    valid = [sid for sid in candidates
             if all(slot in _SET_SLOT_INDEX.get(sid, {}) for slot in SLOTS_FOR_BOT)]
    if not valid:
        return {}
    set_id = rng.choice(valid)
    items: Dict[str, str] = {}
    for slot in SLOTS_FOR_BOT:
        iid = _best_item(set_id, slot, cap, rng)
        if iid:
            items[slot] = iid
    return items


def equip_bot(bot: Dict, persona: str, level: int,
              rng: random.Random | None = None) -> Dict:
    """Одеть бота: гир по персоне/уровню → статы вещей + сет-бонус (мутирует bot).

    Единая «одевалка» для ВСЕХ ботов: обычный PvE (apply_persona_to_bot),
    Натиск и Башня (api/tma_bots). Гарантирует, что у соперника в любом режиме
    есть броня (защита тела/блок/шипы), бонусы вещей и сет-перк — как у игрока.
    """
    r = rng or random
    items, stats = pick_gear_for_persona(persona, level, r)
    bot["equipment_items"] = items
    extra = stats.pop("_extra", {})
    bot.update(stats)
    if extra.get("hp_bonus"):
        bot["max_hp"] = int(bot.get("max_hp", 100)) + extra["hp_bonus"]
        bot["current_hp"] = bot["max_hp"]
    if extra.get("str_bonus"):
        bot["strength"] = max(1, int(bot.get("strength", 1)) + extra["str_bonus"])
    if extra.get("agi_bonus"):
        bot["endurance"] = max(1, int(bot.get("endurance", 1)) + extra["agi_bonus"])
    if extra.get("intu_bonus") or extra.get("crit_bonus"):
        bot["crit"] = max(0, int(bot.get("crit", 0))
                            + extra.get("intu_bonus", 0) + extra.get("crit_bonus", 0))
    apply_set_bonus_to_bot(bot, items)
    return bot


def apply_set_bonus_to_bot(bot: Dict, items: Dict[str, str]) -> None:
    """Применить сет-бонус к словарю бота — та же логика, что у игрока в set_perks.

    Срабатывает для ЛЮБОГО бота, чьи вещи образуют сет ≥2 (даже частичный от
    смешанного гардероба). Полный комплект 6/6 даёт перк (_set_perk_id), который
    боевой движок (execute.py) обрабатывает для player2 наравне с игроком.
    """
    if not items:
        return
    equipped = {slot: EQUIPMENT_CATALOG.get(iid, {}) for slot, iid in items.items()}
    actives = resolve_active_sets(equipped)
    if not actives:
        return
    agg = aggregate_set_bonuses(actives)
    hp_pct = int(agg.get("hp_pct", 0))
    if hp_pct:
        old_max = max(1, int(bot.get("max_hp", 100)))
        bot["max_hp"] = old_max + int(old_max * hp_pct / 100)
        bot["current_hp"] = bot["max_hp"]
    if agg.get("atk_pct"):
        bot["_eq_atk_pct"] = int(bot.get("_eq_atk_pct", 0) or 0) + int(agg["atk_pct"])
    if agg.get("def_pct"):
        bot["_eq_def_pct"] = float(bot.get("_eq_def_pct", 0) or 0) + float(agg["def_pct"])
    if agg.get("crit_bonus"):
        bot["crit"] = max(0, int(bot.get("crit", 0)) + int(agg["crit_bonus"]))
    if agg.get("dodge_bonus"):
        bot["_eq_dodge_bonus"] = int(bot.get("_eq_dodge_bonus", 0) or 0) + int(agg["dodge_bonus"])
    if agg.get("accuracy"):
        bot["_eq_accuracy"] = int(bot.get("_eq_accuracy", 0) or 0) + int(agg["accuracy"])
    if agg.get("pen_pct"):
        bot["_eq_pen_pct"] = float(bot.get("_eq_pen_pct", 0) or 0) + float(agg["pen_pct"])
    if agg.get("double_pct"):
        bot["_eq_double_pct"] = int(bot.get("_eq_double_pct", 0) or 0) + int(agg["double_pct"])
    perks = agg.get("perks") or []
    if perks:
        bot["_set_perk_id"] = perks[0]
