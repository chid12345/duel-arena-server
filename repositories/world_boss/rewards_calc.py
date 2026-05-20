"""Расчёт наград рейда Мирового босса (см. docs/WORLD_BOSS.md §Награды).

Вход: spawn_id + is_victory. Выход — записи в world_boss_rewards.

Формула:
  ЗОЛОТО:
    pool  = WB_POOL_BASE(500) + 50 × N_участников
    итого = pool × вклад% × mult
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

from config.world_boss_constants import WB_CHEST_TOP_DAMAGE
from db_core.week_utils import iso_week_key_utc
from economy.curves import tier_unlocked_at
from economy.loader import get_world_boss
from progression_loader import victory_xp_for_player_level

# Балансные числа — из economy.json/world_boss (этап 2D). Читаются при каждом
# вызове, чтобы геймдиз мог менять конфиг без перезапуска (через load_economy(force=True)).
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

    mult = get_world_boss("reward_mult_victory") if is_victory else get_world_boss("reward_mult_defeat")
    pool_gold = int(get_world_boss("pool_base")) + int(get_world_boss("gold_contrib_per_player")) * n_participants

    # Топ-3 считаем из by_uid (world_boss_hits) — единый источник истины.
    # get_wb_top_damagers читает player_state, которая может разойтись с hits при рассинхроне.
    top3_uids = sorted(by_uid.keys(), key=lambda u: by_uid[u], reverse=True)[:3]
    top_uid = top3_uids[0] if top3_uids else None
    diamonds_by_rank: dict[int, int] = {}
    if is_victory:
        # top-1 получает сундук, алмазы только top-2 и top-3
        tiers = [0, int(get_world_boss("diamonds_top2")), int(get_world_boss("diamonds_top3"))]
        for i, uid_rank in enumerate(top3_uids):
            if tiers[i] > 0:
                diamonds_by_rank[uid_rank] = tiers[i]
        try:
            from repositories.season_pass.award_points import award_wb_top_damage
            if top_uid:
                award_wb_top_damage(db, top_uid)
        except Exception:
            pass
    # Редкая удача: 3% шанс на весь рейд, что один случайный участник
    # (не топ-1) получит свиток scroll_all_12. Часто никто не получает —
    # это «заманушка-редкость» (~1 свиток на 30 рейдов).
    scroll_lucky_uid: Optional[int] = None
    if is_victory and random.random() < get_world_boss("victory_scroll_drop_chance"):
        candidates = [u for u in by_uid.keys() if u != top_uid]
        if candidates:
            scroll_lucky_uid = random.choice(candidates)

    created = 0
    for uid, dmg in by_uid.items():
        contribution_pct = (dmg / total_damage) if total_damage else 0.0

        # ЗОЛОТО: гарантия + (пул × вклад%) × mult.
        gold = max(0, int(pool_gold * contribution_pct * mult))

        # ОПЫТ: от уровня игрока, как 1v1, + бонус по вкладу.
        lvl = levels.get(uid, 1)
        base_1v1 = victory_xp_for_player_level(lvl)
        guaranteed_xp = base_1v1 * get_world_boss("xp_guaranteed_pct")
        contrib_xp = base_1v1 * get_world_boss("xp_contrib_mult") * contribution_pct
        exp = max(0, int((guaranteed_xp + contrib_xp) * mult))

        diamonds = int(diamonds_by_rank.get(uid, 0))

        # Сундук: только топ-1 по урону при победе → 💠 алмазный.
        # Свиток scroll_all_12: один случайный счастливчик за рейд (3% боёв),
        # выбран до цикла в scroll_lucky_uid. 130⭐/$2 в магазине.
        # Поражение: ничего сверх утешительного золота/опыта.
        chest_type = None
        if is_victory and top_uid and uid == top_uid:
            chest_type = WB_CHEST_TOP_DAMAGE
        elif scroll_lucky_uid and uid == scroll_lucky_uid:
            chest_type = WB_VICTORY_SCROLL_ITEM_ID

        # Списываем заряды активных свитков как в PvP/Натиске/Титанах:
        # рейд = 1 «бой» с точки зрения charge-based бафов.
        try:
            db.consume_charges(uid)
        except Exception as _ce:
            logger.warning("wb_rewards_calc: consume_charges uid=%s: %s", uid, _ce)

        # Этап 4D.5 редизайна — WB-дроп шардов УБРАН (решение 2026-05-17).
        # Шарды теперь добываются ТОЛЬКО разборкой ненужного шмота.
        # Позже могут добавиться другие источники (отдельная задача).

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
    # Обновляем недельный рейтинг урона
    week_key = iso_week_key_utc()
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        for uid, dmg in by_uid.items():
            cur.execute(
                # Квалифицируем столбцы таблицы: голая ссылка в DO UPDATE
                # неоднозначна в PostgreSQL (есть и в таблице, и в excluded).
                """INSERT INTO wb_weekly_scores (user_id, week_key, total_damage, raids_count)
                   VALUES (?, ?, ?, 1)
                   ON CONFLICT(user_id, week_key) DO UPDATE SET
                   total_damage = wb_weekly_scores.total_damage + excluded.total_damage,
                   raids_count = wb_weekly_scores.raids_count + 1""",
                (uid, week_key, int(dmg)),
            )
        conn.commit()
        conn.close()
    except Exception as _we:
        logger.warning("wb_rewards_calc: weekly score update failed: %s", _we)
    return created
