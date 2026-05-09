"""
economy/ — единая балансная сетка Duel Arena.

Источник правды: config/economy.json (12+ анкер-чисел).
Все цены/награды/EV считаются формулами от анкера.

Использование:
    from economy import (
        load_economy, get_anchor,
        reward_for_task, price_for_item, ev_for_box,
        diamond_to_gold, gold_to_diamond,
    )

Этап 1 (текущий): инфраструктура + аудит расхождений (dump_diffs).
Этапы 2–4: подключение к reward_calculator/tma_catalogs, сезоны/BP, веб-панель.
"""

from economy.loader import (
    economy_source_path,
    get_anchor,
    get_difficulty_pu,
    get_frequency_mult,
    get_rarity_mult,
    get_reward_split,
    get_tier_mult,
    load_economy,
)
from economy.formulas import (
    diamond_to_gold,
    ev_for_box,
    gold_to_diamond,
    gold_to_pu,
    price_for_item,
    pu_to_gold,
    reward_for_task,
    star_to_diamond,
    usdt_to_diamond,
)

__all__ = (
    "load_economy",
    "economy_source_path",
    "get_anchor",
    "get_difficulty_pu",
    "get_frequency_mult",
    "get_rarity_mult",
    "get_tier_mult",
    "get_reward_split",
    "pu_to_gold",
    "gold_to_pu",
    "diamond_to_gold",
    "gold_to_diamond",
    "star_to_diamond",
    "usdt_to_diamond",
    "reward_for_task",
    "price_for_item",
    "ev_for_box",
)
