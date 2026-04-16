"""Бафф клана: +5% к золоту за победу + bump_clan_active + clan_wins/clan_xp.

Вызывается из battle_system/end_battle_finish.py одной строкой.
Не падает, если игрок без клана или БД недоступна.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

CLAN_GOLD_BONUS_PCT = 5  # +5% к золоту победителя если он в клане
CLAN_XP_PER_WIN = 10     # +10 клан-XP за победу участника


def apply_clan_win_bonus(db: Any, user_id: int | None, base_gold: int) -> int:
    """Вернуть скорректированное золото (с баффом клана если есть).

    Также:
    - обновляет clan_members.last_active_at (онлайн);
    - инкрементит clans.wins, clan_xp, weekly_wins, season_score.
    """
    if not user_id or base_gold <= 0:
        return base_gold
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (int(user_id),))
        row = cursor.fetchone()
        clan_id = (row or {}).get("clan_id") if row else None
        if not clan_id:
            conn.close()
            return base_gold
        # бамп активности
        ts = "NOW()" if db._pg else "CURRENT_TIMESTAMP"
        cursor.execute(
            f"UPDATE clan_members SET last_active_at = {ts} WHERE user_id = ?",
            (int(user_id),),
        )
        # инкремент кланового прогресса
        cursor.execute(
            "UPDATE clans SET wins = wins + 1, "
            "clan_xp = COALESCE(clan_xp,0) + ?, "
            "weekly_wins = COALESCE(weekly_wins,0) + 1, "
            "season_score = COALESCE(season_score,0) + 1 "
            "WHERE id = ?",
            (CLAN_XP_PER_WIN, int(clan_id)),
        )
        # авто-апгрейд уровня клана: каждые 100 clan_xp = +1 уровень
        cursor.execute(
            "UPDATE clans SET level = 1 + (COALESCE(clan_xp,0) / 100) WHERE id = ?",
            (int(clan_id),),
        )
        conn.commit()
        conn.close()
        bonus = (base_gold * CLAN_GOLD_BONUS_PCT) // 100
        return base_gold + max(1, bonus) if bonus > 0 else base_gold + 1
    except Exception as exc:
        logger.warning("clan win bonus failed for uid=%s: %s", user_id, exc)
        try:
            conn.close()
        except Exception:
            pass
        return base_gold
