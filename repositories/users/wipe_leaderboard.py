"""Сброс профиля и топ игроков."""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime
from typing import Dict, List

_logger = logging.getLogger(__name__)

_TOP_CACHE: List[Dict] = []
_TOP_CACHE_TS: float = 0.0
_TOP_CACHE_TTL = 300   # кэш живёт 5 минут
_TOP_CACHE_WARM = 270  # фоновый прогрев за 30с до истечения
_TOP_CACHE_REFRESHING = threading.Event()

from config import (
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
)


# Все per-user таблицы прогресса/контента, которые СНОСЯТСЯ при сбросе.
# Сохраняются (НЕ в списке): players (кошелёк/клан/рефералы/USDT — через UPDATE,
# не DELETE), referrals/referral_rewards/referral_withdrawals (рефералка + вывод),
# clans/clan_members (клан), stars_payments/crypto_invoices (аудит платежей).
_WIPE_TABLES = (
    "improvements", "inventory", "player_inventory",
    "daily_quests", "daily_bonuses", "achievements",
    "task_progress", "task_claims", "login_streak_v2", "weekly_claims",
    "titan_progress", "titan_weekly_scores",
    "endless_progress", "endless_attempts", "endless_weekly_scores",
    "player_buffs", "metric_events",
    "season_stats", "season_rewards", "battle_pass",
    "bp_progress", "bp_rewards_claimed",
    "item_upgrades", "player_equipment",
    "player_owned_weapons", "player_owned_armor2", "armor2_custom_mods",
    "equipment_rentals",
    "user_avatar_unlocks", "user_elite_builds",
    "world_boss_hits", "world_boss_player_state",
    "world_boss_rewards", "world_boss_registrations",
    "pvp_queue",
)


class UsersWipeLeaderboardMixin:
    def _existing_user_tables(self, cursor) -> set:
        """Имена существующих таблиц — чтобы DELETE не падал на ещё не созданных
        (часть схемы создаётся лениво и различается между SQLite и Postgres).

        В проде на Postgres соединение настроено как dict-style cursor —
        row[0] там падает с KeyError: 0. SQLite-Row поддерживает и индекс,
        и имя, поэтому SQLite-тесты этого бага не ловили, а wipe тихо падал
        на ВСЕХ путях сброса (Stars / USDT-webhook / crypto_check /
        auto-settler). Используем имя колонки и принимаем обе формы строк."""
        if getattr(self, "_pg", False):
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            col = "tablename"
        else:
            cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
            col = "name"
        out: set = set()
        for row in cursor.fetchall():
            # dict-cursor / sqlite3.Row / tuple — все три формата сразу
            try:
                out.add(row[col])
            except (TypeError, KeyError, IndexError):
                try:
                    out.add(row[0])
                except Exception:
                    pass
        return out

    def wipe_player_profile(self, user_id: int, *, keep_wallet_clan_and_referrals: bool = False) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        existing = self._existing_user_tables(cursor)
        for table in _WIPE_TABLES:
            if table in existing:
                cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        if keep_wallet_clan_and_referrals:
            # Сброс до новичка. Уходит ВСЁ, кроме кошелька/клана/рефералов/USDT:
            # уровень и статы → стартовые, Premium снимается полностью (включая
            # is_premium флаг и first_premium_at — иначе скидка первой покупки
            # Premium не вернётся, а реферальная логика будет считать игрока
            # «уже премом»), образы/бонус образа сбрасываются на стартовый,
            # счётчик «новых» покупок обнуляется. Этап 7C-кнопка «×2 следующий
            # бой» и ежедневный премиум-ящик — также сбрасываются.
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
                   premium_until = NULL, is_premium = 0,
                   first_premium_at = NULL, premium_box_claimed = NULL,
                   next_battle_x2 = 0, next_battle_x2_date = '',
                   equipped_avatar_id = 'default_start',
                   avatar_bonus_applied = 0, avatar_bonus_level = 0,
                   inventory_unseen = 0,
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
        # Диагностика: убеждаемся, что Premium действительно снят. Помогает
        # ловить ситуацию, когда UPDATE «прошёл», но игрок продолжает видеть
        # премиум-баннер (например, отдельная транзакция/recovery его вернула).
        if keep_wallet_clan_and_referrals:
            try:
                cursor.execute(
                    "SELECT premium_until, is_premium FROM players WHERE user_id = ?",
                    (user_id,),
                )
                row = cursor.fetchone()
                if row is not None:
                    pu = row["premium_until"] if hasattr(row, "keys") else row[0]
                    ip = row["is_premium"] if hasattr(row, "keys") else row[1]
                    if pu is not None or (ip and int(ip) != 0):
                        _logger.warning(
                            "wipe_player_profile: premium НЕ сброшен uid=%s premium_until=%r is_premium=%r",
                            user_id, pu, ip,
                        )
            except Exception as _e:
                _logger.warning("wipe_player_profile diag uid=%s: %s", user_id, _e)
        conn.close()

    def _refresh_top_cache(self, limit: int) -> None:
        global _TOP_CACHE, _TOP_CACHE_TS
        try:
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
            _TOP_CACHE_TS = time.time()
        finally:
            _TOP_CACHE_REFRESHING.clear()

    def get_top_players(self, limit: int = 10) -> List[Dict]:
        now = time.time()
        age = now - _TOP_CACHE_TS
        if _TOP_CACHE and age < _TOP_CACHE_TTL:
            # Кэш валиден — если скоро истечёт, запускаем прогрев в фоне
            if age > _TOP_CACHE_WARM and not _TOP_CACHE_REFRESHING.is_set():
                _TOP_CACHE_REFRESHING.set()
                threading.Thread(
                    target=self._refresh_top_cache, args=(limit,), daemon=True
                ).start()
            return _TOP_CACHE[:limit]
        # Кэш пустой или истёк — блокирующий запрос (первый старт)
        self._refresh_top_cache(limit)
        return _TOP_CACHE[:limit]
