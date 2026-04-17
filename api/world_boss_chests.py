"""WB-сундуки: генераторы дропа золотого и алмазного сундуков рейда.

Золотой сундук (`wb_gold_chest`) — награда за last-hit. 2–4 базовых дропа.
Алмазный сундук (`wb_diamond_chest`) — награда за top-damage. 3–5 премиум
дропов + шанс на USDT-свиток и джекпот 100💎.

Переиспользуем `_apply_drops` из `api.shop_loot_box` — единый движок выдачи.
Сами сундуки регистрируются в `_BOX_GENERATORS` + `ALL_BOX_IDS` при импорте,
чтобы обычный flow «apply item» (`api/shop_apply_handler.py`) подхватил их
как любой другой лут-бокс.
"""
from __future__ import annotations

import random
from typing import Dict, List, Tuple

from config.world_boss_constants import WB_CHEST_LAST_HIT, WB_CHEST_TOP_DAMAGE


# ── Пулы дропа ────────────────────────────────────────────────────────────────
# Пометка "_diamonds_N" — не item_id, а шорткат на N алмазов (см. _expand).

_WB_GOLD_DROPS: List[Tuple[str, int]] = [
    ("scroll_str_3",    25), ("scroll_end_3",   25), ("scroll_crit_3",  20),
    ("scroll_hp_100",   20), ("scroll_armor_6", 15), ("scroll_warrior", 12),
    ("_diamonds_5",     15), ("_diamonds_10",    5),
]

_WB_DIAMOND_DROPS: List[Tuple[str, int]] = [
    ("scroll_str_6",    20), ("scroll_end_6",    20), ("scroll_crit_6",   15),
    ("scroll_hp_200",   15), ("scroll_dodge_5",  12), ("scroll_armor_10", 12),
    ("scroll_all_4",    10), ("scroll_predator",  8), ("scroll_bastion",   8),
    ("_diamonds_15",    10), ("_diamonds_30",     3),
]


def _pick_n(pool: List[Tuple[str, int]], n: int) -> List[str]:
    items, weights = zip(*pool)
    return random.choices(items, weights=weights, k=n)


def _expand(key: str, drops: List[Dict]) -> None:
    if key.startswith("_diamonds_"):
        amt = int(key.split("_")[-1])
        drops.append({"type": "diamonds", "amount": amt})
    else:
        drops.append({"type": "item", "item_id": key})


def _generate_wb_gold_chest(db, uid: int) -> Dict:
    from api.shop_loot_box import _apply_drops
    count = random.choice([2, 2, 3, 3, 3, 4])  # чаще 3
    drops: List[Dict] = []
    for key in _pick_n(_WB_GOLD_DROPS, count):
        _expand(key, drops)
    return _apply_drops(db, uid, drops)


def _generate_wb_diamond_chest(db, uid: int) -> Dict:
    from api.shop_loot_box import _apply_drops
    count = random.choice([3, 3, 4, 4, 5])  # чаще 4
    drops: List[Dict] = []
    for key in _pick_n(_WB_DIAMOND_DROPS, count):
        _expand(key, drops)
    # 5% джекпот: +100💎
    if random.random() < 0.05:
        drops.append({"type": "diamonds", "amount": 100})
    # 3% USDT-свиток
    if random.random() < 0.03:
        drops.append({"type": "item", "item_id": random.choice(
            ("scroll_str_12", "scroll_end_12", "scroll_crit_12", "scroll_hp_500", "scroll_all_12")
        )})
    return _apply_drops(db, uid, drops)


# ── Регистрация в lut-бокс системе (side-effect при импорте) ──────────────────
from api.shop_loot_box import _BOX_GENERATORS, ALL_BOX_IDS

_BOX_GENERATORS[WB_CHEST_LAST_HIT] = _generate_wb_gold_chest
_BOX_GENERATORS[WB_CHEST_TOP_DAMAGE] = _generate_wb_diamond_chest
ALL_BOX_IDS.add(WB_CHEST_LAST_HIT)
ALL_BOX_IDS.add(WB_CHEST_TOP_DAMAGE)
