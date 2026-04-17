"""Расчёт наград рейда Мирового босса (см. docs/WORLD_BOSS.md §Награды).

Вход: spawn_id + is_victory. Выход — записи в world_boss_rewards
(claimed=0; игрок забирает через /api/world_boss/claim_reward).

Формула:
  base_gold × множитель × contribution_pct (вклад игрока в общий урон)
  множитель = 2.0 (победа) | 0.3 (поражение)

Алмазы — фиксированные бонусы топ-3 и last-hit (не пропорционально).
Сундуки — по одному: last-hit (wb_gold_chest) и top-damage (wb_diamond_chest).
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from config.world_boss_constants import (
    WB_BASE_EXP,
    WB_BASE_GOLD,
    WB_CHEST_LAST_HIT,
    WB_CHEST_TOP_DAMAGE,
    WB_DIAMONDS_LAST_HIT,
    WB_DIAMONDS_TOP1,
    WB_DIAMONDS_TOP2,
    WB_DIAMONDS_TOP3,
    WB_REWARD_MULT_DEFEAT,
    WB_REWARD_MULT_VICTORY,
)

logger = logging.getLogger(__name__)


def compute_and_create_rewards(db: Any, spawn_id: int, is_victory: bool) -> int:
    """Создаёт записи world_boss_rewards для всех участников рейда.

    Идемпотентно через create_wb_reward (UNIQUE spawn_id+user_id).
    Возвращает число созданных/найденных записей.
    """
    participants = db.get_wb_all_participants_damage(int(spawn_id))
    if not participants:
        return 0

    total_damage = sum(int(p.get("total_damage") or 0) for p in participants)
    if total_damage <= 0:
        return 0

    mult = WB_REWARD_MULT_VICTORY if is_victory else WB_REWARD_MULT_DEFEAT

    top3 = db.get_wb_top_damagers(int(spawn_id), limit=3)
    top_uid = int(top3[0]["user_id"]) if top3 else None
    # Алмазы — только при победе (топ-3 + last-hit). На поражении — утешительные gold/exp.
    diamonds_by_rank: dict[int, int] = {}
    if is_victory:
        tiers = [WB_DIAMONDS_TOP1, WB_DIAMONDS_TOP2, WB_DIAMONDS_TOP3]
        for i, row in enumerate(top3[:3]):
            diamonds_by_rank[int(row["user_id"])] = tiers[i]

    last_hit_uid: Optional[int] = db.get_wb_last_hitter(int(spawn_id)) if is_victory else None

    created = 0
    for p in participants:
        uid = int(p["user_id"])
        dmg = int(p.get("total_damage") or 0)
        contribution_pct = (dmg / total_damage) if total_damage else 0.0
        gold = max(0, int(WB_BASE_GOLD * mult * contribution_pct))
        exp = max(0, int(WB_BASE_EXP * mult * contribution_pct))
        diamonds = int(diamonds_by_rank.get(uid, 0))
        if last_hit_uid and uid == last_hit_uid:
            diamonds += WB_DIAMONDS_LAST_HIT

        chest_type = None
        if is_victory and last_hit_uid and uid == last_hit_uid:
            chest_type = WB_CHEST_LAST_HIT
        if is_victory and top_uid and uid == top_uid:
            # Топ-1 имеет приоритет над last_hit на сундук (алмазный > золотой);
            # если один и тот же игрок — оставляем алмазный (редкий).
            chest_type = WB_CHEST_TOP_DAMAGE

        try:
            db.create_wb_reward(
                spawn_id=int(spawn_id),
                user_id=uid,
                gold=gold,
                exp=exp,
                diamonds=diamonds,
                contribution_pct=round(contribution_pct * 100.0, 2),
                is_victory=is_victory,
                chest_type=chest_type,
            )
            created += 1
        except Exception as e:
            logger.warning(
                "wb_rewards_calc: ошибка создания награды uid=%s spawn=%s: %s",
                uid, spawn_id, e,
            )
    return created
