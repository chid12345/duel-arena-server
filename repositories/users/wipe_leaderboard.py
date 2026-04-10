"""Сброс профиля и топ игроков."""

from __future__ import annotations

import time
from datetime import datetime
from typing import Dict, List

_TOP_CACHE: List[Dict] = []
_TOP_CACHE_TS: float = 0.0
_TOP_CACHE_TTL = 300  # 5 минут

from config import (
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
)


class UsersWipeLeaderboardMixin:
    def wipe_player_profile(self, user_id: int, *, keep_wallet_clan_and_referrals: bool = False) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        for table in ("improvements", "daily_quests", "daily_bonuses", "achievements", "inventory"):
            cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM metric_events WHERE user_id = ?", (user_id,))
        # Классы: удаляем всё кроме USDT-покупок (игрок заплатил реальные деньги)
        cursor.execute(
            "DELETE FROM user_inventory WHERE user_id = ? AND class_type != 'usdt'",
            (user_id,),
        )
        # Гарантируем наличие всех колонок (stamina_saved, passive_type могут быть
        # добавлены динамически и отсутствовать в старых БД)
        self._ensure_inventory_schema(cursor)
        # USDT-слоты снимаем (equipped=FALSE) и сбрасываем распределённые статы,
        # но сами записи (=купленные слоты) сохраняем
        cursor.execute(
            """UPDATE user_inventory SET
               equipped = FALSE, stats_applied = 0,
               strength_saved = 0, agility_saved = 0,
               intuition_saved = 0, stamina_saved = 0,
               free_stats_saved = 19, passive_type = NULL
               WHERE user_id = ?""",
            (user_id,),
        )
        if keep_wallet_clan_and_referrals:
            for table in ("season_stats", "battle_pass", "season_rewards", "pvp_queue"):
                cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
            now_iso = datetime.utcnow().isoformat()
            now_ts = int(time.time())
            start_hp = PLAYER_START_MAX_HP
            cursor.execute(
                """UPDATE players SET
                   level = ?, exp = 0, exp_milestones = 0,
                   strength = ?, endurance = ?, crit = ?,
                   max_hp = ?, current_hp = ?, free_stats = ?,
                   wins = 0, losses = 0, win_streak = 0, rating = 1000,
                   daily_streak = 0, last_daily = NULL,
                   xp_boost_charges = 0, profile_reset_ts = ?,
                   current_class = NULL, current_class_type = NULL,
                   last_active = CURRENT_TIMESTAMP, last_hp_regen = ?
                   WHERE user_id = ?""",
                (
                    PLAYER_START_LEVEL, PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE,
                    PLAYER_START_CRIT, start_hp, start_hp, PLAYER_START_FREE_STATS,
                    now_ts, now_iso, user_id,
                ),
            )
            self._init_player_improvements_with_cursor(cursor, user_id)
        else:
            cursor.execute("DELETE FROM players WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()

    def get_top_players(self, limit: int = 10) -> List[Dict]:
        global _TOP_CACHE, _TOP_CACHE_TS
        now = time.time()
        if _TOP_CACHE and now - _TOP_CACHE_TS < _TOP_CACHE_TTL:
            return _TOP_CACHE[:limit]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, level, rating, wins, losses FROM players "
            "WHERE wins + losses > 0 ORDER BY rating DESC LIMIT ?",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        _TOP_CACHE = rows
        _TOP_CACHE_TS = now
        return rows
