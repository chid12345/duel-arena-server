"""
repositories/users.py — игрок: создание, статы, HP, ежедневный бонус,
улучшения, chat_id, поиск, Premium, wipe.
"""

from __future__ import annotations

import time
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from config import (
    DAILY_BONUS_GOLD,
    DIAMONDS_DAILY_STREAK,
    HP_REGEN_BASE_SECONDS,
    HP_REGEN_ENDURANCE_BONUS,
    IMPROVEMENT_COST_MULTIPLIER,
    IMPROVEMENT_LEVELS,
    MAX_LEVEL,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
    RESET_STATS_COST_DIAMONDS,
    expected_max_hp_from_level,
    gold_when_reaching_level,
    stats_when_reaching_level,
)


class UsersMixin:
    """Mixin: всё про игрока — CRUD, HP, бонусы, улучшения, поиск, Premium."""

    # ── Создание / получение игрока ───────────────────────────────────────────

    def get_or_create_player(self, user_id: int, username: str) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
        player = cursor.fetchone()
        if not player:
            _g1 = gold_when_reaching_level(1)
            start_max_hp = PLAYER_START_MAX_HP
            cursor.execute(
                """INSERT INTO players
                   (user_id, username, level, exp, strength, endurance, crit, max_hp, current_hp,
                    free_stats, gold, exp_milestones)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id, username, PLAYER_START_LEVEL, 0,
                    PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
                    start_max_hp, start_max_hp, PLAYER_START_FREE_STATS, _g1, 0,
                ),
            )
            self._init_player_improvements_with_cursor(cursor, user_id)
            conn.commit()
            cursor.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
            player = cursor.fetchone()
        conn.close()
        return dict(player)

    def _init_player_improvements_with_cursor(self, cursor, user_id: int):
        for imp_type in ("attack_power", "dodge", "block_mastery", "critical_strike"):
            cursor.execute(
                "INSERT OR IGNORE INTO improvements (user_id, improvement_type, level) VALUES (?, ?, 0)",
                (user_id, imp_type),
            )

    # ── Обновление статов ─────────────────────────────────────────────────────

    def update_player_stats(self, user_id: int, stats_update: Dict):
        """При смене current_hp — сбрасываем last_hp_regen (точка отсчёта регена)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        set_clauses = []
        values = []
        for key, value in stats_update.items():
            set_clauses.append(f"{key} = ?")
            values.append(value)
        if "current_hp" in stats_update:
            set_clauses.append("last_hp_regen = ?")
            values.append(datetime.utcnow().isoformat())
        values.append(user_id)
        cursor.execute(
            f"UPDATE players SET {', '.join(set_clauses)}, last_active = CURRENT_TIMESTAMP WHERE user_id = ?",
            values,
        )
        conn.commit()
        conn.close()

    # ── HP реген ──────────────────────────────────────────────────────────────

    def apply_hp_regen(self, user_id: int, endurance_invested: int) -> Dict:
        """Ленивый реген HP по таймеру — вызывать при каждом действии игрока."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT max_hp, current_hp, last_hp_regen FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {}
            max_hp = int(row["max_hp"] or PLAYER_START_MAX_HP)
            current_hp = max_hp if row["current_hp"] is None else int(row["current_hp"])
            now = datetime.utcnow()
            if current_hp < max_hp:
                last_regen_str = row["last_hp_regen"]
                try:
                    last_regen = datetime.fromisoformat(last_regen_str) if last_regen_str else now
                except ValueError:
                    last_regen = now
                elapsed = max(0.0, (now - last_regen).total_seconds())
                mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
                gained = int(elapsed * (max_hp / HP_REGEN_BASE_SECONDS * mult))
                current_hp = min(max_hp, current_hp + gained)
            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id),
            )
            conn.commit()
            return {"current_hp": current_hp, "max_hp": max_hp}
        finally:
            conn.close()

    def apply_hp_regen_from_player(self, player: Dict, endurance_invested: int) -> Dict:
        """Быстрая версия: принимает уже загруженный dict игрока, экономит 1 SELECT."""
        user_id = player.get("user_id")
        if not user_id:
            return {}
        max_hp = int(player.get("max_hp") or PLAYER_START_MAX_HP)
        current_hp = max_hp if player.get("current_hp") is None else int(player["current_hp"])
        last_regen_str = player.get("last_hp_regen")
        now = datetime.utcnow()
        if current_hp < max_hp:
            try:
                last_regen = datetime.fromisoformat(
                    str(last_regen_str).split("+")[0].split(".")[0]
                ) if last_regen_str else now
            except (ValueError, AttributeError):
                last_regen = now
            elapsed = max(0.0, (now - last_regen).total_seconds())
            mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
            gained = int(elapsed * (max_hp / HP_REGEN_BASE_SECONDS * mult))
            current_hp = min(max_hp, current_hp + gained)
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id),
            )
            conn.commit()
        finally:
            conn.close()
        return {"current_hp": current_hp, "max_hp": max_hp}

    # ── Wipe профиля ──────────────────────────────────────────────────────────

    def wipe_player_profile(self, user_id: int, *, keep_wallet_clan_and_referrals: bool = False) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        for table in ("improvements", "daily_quests", "daily_bonuses", "achievements", "inventory"):
            cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM metric_events WHERE user_id = ?", (user_id,))
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

    # ── Лидерборд ─────────────────────────────────────────────────────────────

    def get_top_players(self, limit: int = 10) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, level, rating, wins, losses FROM players "
            "WHERE wins + losses > 0 ORDER BY rating DESC LIMIT ?",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ── Ежедневный бонус ──────────────────────────────────────────────────────

    def check_daily_bonus(self, user_id: int) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        today = datetime.now().date()
        cursor.execute("SELECT daily_streak, last_daily FROM players WHERE user_id = ?", (user_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return {"can_claim": True, "streak": 0, "bonus": DAILY_BONUS_GOLD}
        streak = result["daily_streak"]
        last_daily = result["last_daily"]
        if last_daily:
            if isinstance(last_daily, str):
                last_date = datetime.strptime(last_daily, "%Y-%m-%d").date()
            else:
                last_date = last_daily
            if last_date == today:
                conn.close()
                return {"can_claim": False, "streak": streak, "bonus": 0}
            elif last_date == today - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        bonus = DAILY_BONUS_GOLD
        extra_d = DIAMONDS_DAILY_STREAK if streak % 7 == 0 else 0
        if streak % 7 == 0:
            bonus += DIAMONDS_DAILY_STREAK
        cursor.execute(
            "UPDATE players SET daily_streak = ?, last_daily = ?, gold = gold + ?, diamonds = diamonds + ? WHERE user_id = ?",
            (streak, today, bonus if bonus > 0 else 0, extra_d, user_id),
        )
        conn.commit()
        conn.close()
        return {"can_claim": True, "streak": streak, "bonus": bonus}

    # ── Улучшения ─────────────────────────────────────────────────────────────

    def get_player_improvements(self, user_id: int) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT improvement_type, level FROM improvements WHERE user_id = ?",
            (user_id,),
        )
        improvements = {row["improvement_type"]: row["level"] for row in cursor.fetchall()}
        conn.close()
        return improvements

    def upgrade_improvement(self, user_id: int, improvement_type: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT level FROM improvements WHERE user_id = ? AND improvement_type = ?",
            (user_id, improvement_type),
        )
        result = cursor.fetchone()
        if not result or result["level"] >= IMPROVEMENT_LEVELS:
            conn.close()
            return False
        new_level = result["level"] + 1
        cost = self._get_improvement_cost(improvement_type, new_level)
        cursor.execute("SELECT gold AS gold FROM players WHERE user_id = ?", (user_id,))
        player_gold = cursor.fetchone()["gold"]
        if player_gold < cost:
            conn.close()
            return False
        cursor.execute(
            "UPDATE improvements SET level = ? WHERE user_id = ? AND improvement_type = ?",
            (new_level, user_id, improvement_type),
        )
        cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (cost, user_id))
        conn.commit()
        conn.close()
        return True

    def _get_improvement_cost(self, improvement_type: str, level: int) -> int:
        base_costs = {
            "attack_power": 1000,
            "dodge": 1500,
            "block_mastery": 1200,
            "critical_strike": 2000,
        }
        base_cost = base_costs.get(improvement_type, 1000)
        return int(base_cost * (IMPROVEMENT_COST_MULTIPLIER ** (level - 1)))

    # ── Chat ID ───────────────────────────────────────────────────────────────

    def update_chat_id(self, user_id: int, chat_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET chat_id = ? WHERE user_id = ?", (chat_id, user_id))
        conn.commit()
        conn.close()

    def get_players_with_chat_id(self, limit: int = 1000) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, chat_id, username FROM players WHERE chat_id IS NOT NULL LIMIT ?",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def get_player_chat_id(self, user_id: int) -> Optional[int]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT chat_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return int(row["chat_id"]) if row and row["chat_id"] is not None else None

    # ── Поиск игроков ─────────────────────────────────────────────────────────

    @staticmethod
    def _norm_username(username: str) -> str:
        return (username or "").strip().lstrip("@").lower()

    def find_player_by_username(self, username: str) -> Optional[Dict]:
        un = self._norm_username(username)
        if not un:
            return None
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, level, rating, current_hp, max_hp FROM players "
            "WHERE username IS NOT NULL AND LOWER(username) = ? LIMIT 1",
            (un,),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def search_players_by_username(self, query: str, limit: int = 5) -> List[Dict]:
        q = self._norm_username(query)
        if not q:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, level, rating FROM players "
            "WHERE username IS NOT NULL AND LOWER(username) LIKE ? "
            "ORDER BY CASE WHEN LOWER(username) = ? THEN 0 ELSE 1 END, rating DESC LIMIT ?",
            (f"%{q}%", q, int(limit)),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ── Метрики ───────────────────────────────────────────────────────────────

    def log_metric_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        value: int = 0,
        duration_ms: int = 0,
    ):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO metric_events (event_type, user_id, value, duration_ms) VALUES (?, ?, ?, ?)",
            (event_type, user_id, value, duration_ms),
        )
        conn.commit()
        conn.close()

    def get_health_metrics(self) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total_players FROM players")
        total_players = cursor.fetchone()["total_players"]
        cursor.execute(
            "SELECT COUNT(DISTINCT user_id) AS dau FROM metric_events "
            "WHERE event_type = 'command_start' AND created_at >= datetime('now', '-1 day')"
        )
        dau = cursor.fetchone()["dau"] or 0
        cursor.execute(
            "SELECT COUNT(*) AS battles_hour FROM metric_events "
            "WHERE event_type IN ('battle_ended', 'battle_ended_afk') "
            "AND created_at >= datetime('now', '-1 hour')"
        )
        battles_hour = cursor.fetchone()["battles_hour"] or 0
        cursor.execute(
            "SELECT AVG(duration_ms) AS avg_duration_ms FROM metric_events "
            "WHERE event_type IN ('battle_ended', 'battle_ended_afk') "
            "AND duration_ms > 0 AND created_at >= datetime('now', '-1 day')"
        )
        avg_ms = cursor.fetchone()["avg_duration_ms"]
        conn.close()
        return {
            "total_players": total_players,
            "dau": dau,
            "battles_hour": battles_hour,
            "avg_battle_duration_ms": int(avg_ms) if avg_ms else 0,
        }

    # ── Premium ───────────────────────────────────────────────────────────────

    def get_premium_status(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row["premium_until"]:
                return {"is_active": False, "days_left": 0, "premium_until": None}
            try:
                until = datetime.fromisoformat(row["premium_until"])
                now = datetime.utcnow()
                if until <= now:
                    return {"is_active": False, "days_left": 0, "premium_until": row["premium_until"]}
                return {"is_active": True, "days_left": max(0, (until - now).days), "premium_until": row["premium_until"]}
            except Exception:
                return {"is_active": False, "days_left": 0, "premium_until": None}
        finally:
            conn.close()

    def activate_premium(self, user_id: int, days: int = 21) -> Dict[str, Any]:
        """Активировать/продлить Premium на N дней. При первой активации — +1000 алмазов."""
        from datetime import timedelta
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            now = datetime.utcnow()
            current_until = None
            if row and row["premium_until"]:
                try:
                    current_until = datetime.fromisoformat(row["premium_until"])
                except Exception:
                    pass
            base = current_until if (current_until and current_until > now) else now
            new_until = base + timedelta(days=days)
            is_renewal = bool(current_until and current_until > now)
            bonus_diamonds = 0 if is_renewal else 1000
            cursor.execute(
                "UPDATE players SET premium_until = ?, diamonds = diamonds + ? WHERE user_id = ?",
                (new_until.isoformat(), bonus_diamonds, user_id),
            )
            conn.commit()
            return {
                "ok": True,
                "premium_until": new_until.isoformat(),
                "days_left": max(0, (new_until - now).days),
                "bonus_diamonds": bonus_diamonds,
            }
        finally:
            conn.close()
