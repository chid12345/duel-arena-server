"""Расчёт наград рейда Мирового босса (см. docs/WORLD_BOSS.md §Награды).

Вход: spawn_id + is_victory. Выход — записи в world_boss_rewards.

Формула (Вариант Б — гарантия + пул по вкладу):
  ЗОЛОТО:
    guaranteed = 30 (фикс)
    pool       = 50 × N_участников
    итого      = (guaranteed + pool × вклад%) × mult
  ОПЫТ:
    база       = victory_xp_for_player_level(уровень_игрока)
    guaranteed = база × 0.3
    contrib    = база × 3.0 × вклад%
    итого      = (guaranteed + contrib) × mult

Множитель mult = 2.0 победа | 0.3 поражение.
Участник = ТОЛЬКО ударивший (нанёсший >0 урона). Регистрация без удара
наград не даёт — иначе можно «фармить» XP, просто заходя в рейд.

Алмазы — фиксированные бонусы топ-3 и last-hit (только при победе).
Сундуки — top-1 по урону (алмазный) при победе.
Свитки — 3% шанс scroll_all_12 для остальных при победе.
"""
from __future__ import annotations

import logging
import random
from typing import Any, Optional

from config.world_boss_constants import (
    WB_CHEST_TOP_DAMAGE,
    WB_DIAMONDS_LAST_HIT,
    WB_DIAMONDS_TOP1,
    WB_DIAMONDS_TOP2,
    WB_DIAMONDS_TOP3,
    WB_GOLD_GUARANTEED,
    WB_GOLD_CONTRIB_PER_PLAYER,
    WB_REWARD_MULT_DEFEAT,
    WB_REWARD_MULT_VICTORY,
    WB_XP_GUARANTEED_PCT,
    WB_XP_CONTRIB_MULT,
)
from progression_loader import victory_xp_for_player_level

# 3% шанс на ВЕСЬ рейд, что один случайный игрок (не топ-1) получит свиток
# «✨ Все пассивки +12» (scroll_all_12, 130⭐/$2 в магазине). Часто никто
# не получает — это «заманушка-редкость», ~1 свиток на 30 рейдов.
WB_VICTORY_SCROLL_DROP_CHANCE: float = 0.03
WB_VICTORY_SCROLL_ITEM_ID: str = "scroll_all_12"

logger = logging.getLogger(__name__)


def _get_player_levels(db: Any, user_ids: list[int]) -> dict[int, int]:
    """Уровень для каждого игрока (по умолчанию 1)."""
    if not user_ids:
        return {}
    placeholders = ",".join("?" * len(user_ids))
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        f"SELECT user_id, level FROM players WHERE user_id IN ({placeholders})",
        [int(u) for u in user_ids],
    )
    out: dict[int, int] = {}
    for r in cur.fetchall():
        if isinstance(r, dict):
            out[int(r["user_id"])] = int(r.get("level") or 1)
        else:
            out[int(r[0])] = int(r[1] or 1)
    conn.close()
    return out


def compute_and_create_rewards(db: Any, spawn_id: int, is_victory: bool) -> int:
    """Создаёт записи world_boss_rewards для всех участников рейда.

    Идемпотентно через create_wb_reward (UNIQUE spawn_id+user_id).
    """
    # Участники = ТОЛЬКО те, кто реально нанёс урон (>0).
    # Зарегистрировался без удара → 0 наград (нет фарма XP за «зашёл»).
    hits = db.get_wb_all_participants_damage(int(spawn_id))
    by_uid = {
        int(p["user_id"]): int(p.get("total_damage") or 0)
        for p in hits
        if int(p.get("total_damage") or 0) > 0
    }

    if not by_uid:
        return 0

    n_participants = len(by_uid)
    total_damage = sum(by_uid.values())
    levels = _get_player_levels(db, list(by_uid.keys()))

    # Авто-боты: получают пенальти ×0.5 к итоговой награде.
    auto_bots: set[int] = set()
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id FROM world_boss_player_state "
            "WHERE spawn_id=? AND auto_bot=1",
            (int(spawn_id),),
        )
        for r in cur.fetchall():
            auto_bots.add(int(r["user_id"] if not isinstance(r, tuple) else r[0]))
        conn.close()
    except Exception as e:
        logger.warning("wb_rewards_calc: ошибка чтения auto-bots spawn=%s: %s", spawn_id, e)

    mult = WB_REWARD_MULT_VICTORY if is_victory else WB_REWARD_MULT_DEFEAT
    pool_gold = WB_GOLD_CONTRIB_PER_PLAYER * n_participants

    top3 = db.get_wb_top_damagers(int(spawn_id), limit=3)
    top_uid = int(top3[0]["user_id"]) if top3 else None
    diamonds_by_rank: dict[int, int] = {}
    if is_victory:
        tiers = [WB_DIAMONDS_TOP1, WB_DIAMONDS_TOP2, WB_DIAMONDS_TOP3]
        for i, row in enumerate(top3[:3]):
            diamonds_by_rank[int(row["user_id"])] = tiers[i]
    last_hit_uid: Optional[int] = db.get_wb_last_hitter(int(spawn_id)) if is_victory else None

    # Редкая удача: 3% шанс на весь рейд, что один случайный участник
    # (не топ-1) получит свиток scroll_all_12. Часто никто не получает —
    # это «заманушка-редкость» (~1 свиток на 30 рейдов).
    scroll_lucky_uid: Optional[int] = None
    if is_victory and random.random() < WB_VICTORY_SCROLL_DROP_CHANCE:
        candidates = [u for u in by_uid.keys() if u != top_uid]
        if candidates:
            scroll_lucky_uid = random.choice(candidates)

    created = 0
    for uid, dmg in by_uid.items():
        contribution_pct = (dmg / total_damage) if total_damage else 0.0
        # Пенальти за авто-бой (бот в лобби — игрок офлайн).
        bot_penalty = 0.5 if uid in auto_bots else 1.0

        # ЗОЛОТО: гарантия + (пул × вклад%) × mult.
        gold = max(0, int((WB_GOLD_GUARANTEED + pool_gold * contribution_pct) * mult * bot_penalty))

        # ОПЫТ: от уровня игрока, как 1v1, + бонус по вкладу.
        lvl = levels.get(uid, 1)
        base_1v1 = victory_xp_for_player_level(lvl)
        guaranteed_xp = base_1v1 * WB_XP_GUARANTEED_PCT
        contrib_xp = base_1v1 * WB_XP_CONTRIB_MULT * contribution_pct
        exp = max(0, int((guaranteed_xp + contrib_xp) * mult * bot_penalty))

        diamonds = int(diamonds_by_rank.get(uid, 0))
        if last_hit_uid and uid == last_hit_uid:
            diamonds += WB_DIAMONDS_LAST_HIT

        # Сундук: только топ-1 по урону при победе → 💠 алмазный.
        # Свиток scroll_all_12: один случайный счастливчик за рейд (3% боёв),
        # выбран до цикла в scroll_lucky_uid. 130⭐/$2 в магазине.
        # Поражение: ничего сверх утешительного золота/опыта.
        chest_type = None
        if is_victory and top_uid and uid == top_uid:
            chest_type = WB_CHEST_TOP_DAMAGE
        elif scroll_lucky_uid and uid == scroll_lucky_uid:
            chest_type = WB_VICTORY_SCROLL_ITEM_ID

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
