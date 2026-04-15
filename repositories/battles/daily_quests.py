"""Ежедневные квесты (бои / победы / награда)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict


class BattlesDailyQuestsMixin:
    def update_daily_quest_progress(self, user_id: int, won_battle: bool = False, is_bot: bool = False):
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
            (user_id, today),
        )
        bot_inc = 1 if (won_battle and is_bot) else 0
        pvp_inc = 1 if (won_battle and not is_bot) else 0
        cursor.execute(
            "UPDATE daily_quests SET battles_played=battles_played+1, battles_won=battles_won+?, "
            "bot_wins=bot_wins+?, pvp_wins=pvp_wins+? WHERE user_id=? AND quest_date=?",
            (1 if won_battle else 0, bot_inc, pvp_inc, user_id, today),
        )
        conn.commit()
        conn.close()

    def get_daily_quest_status(self, user_id: int) -> Dict[str, Any]:
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
            (user_id, today),
        )
        cursor.execute(
            "SELECT battles_played, battles_won, reward_claimed FROM daily_quests WHERE user_id = ? AND quest_date = ?",
            (user_id, today),
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        battles_played = int(row["battles_played"] or 0) if row else 0
        battles_won = int(row["battles_won"] or 0) if row else 0
        endless_wins = int(row["endless_wins"] or 0) if row and "endless_wins" in (row.keys() if hasattr(row, "keys") else dir(row)) else 0
        reward_claimed = bool(row["reward_claimed"]) if row else False
        return {
            "battles_played": battles_played,
            "battles_won": battles_won,
            "endless_wins": endless_wins,
            "reward_claimed": reward_claimed,
            "is_completed": battles_played >= 5 and battles_won >= 3,
            "endless_quest_completed": endless_wins >= 3,
            "quest_target_played": 5,
            "quest_target_won": 3,
        }

    def claim_daily_quest_reward(self, user_id: int, gold_reward: int = 55, xp_reward: int = 150) -> Dict[str, Any]:
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT battles_played, battles_won, reward_claimed FROM daily_quests WHERE user_id = ? AND quest_date = ?",
            (user_id, today),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Квест еще не начат"}
        if row["reward_claimed"]:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}
        if row["battles_played"] < 5 or row["battles_won"] < 3:
            conn.close()
            return {"ok": False, "reason": "Квест еще не выполнен"}
        cursor.execute(
            "UPDATE daily_quests SET reward_claimed = 1 WHERE user_id = ? AND quest_date = ? AND reward_claimed = 0",
            (user_id, today),
        )
        if cursor.rowcount == 0:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}
        cursor.execute(
            "UPDATE players SET gold = gold + ?, exp = exp + ? WHERE user_id = ?",
            (gold_reward, xp_reward, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": gold_reward, "xp": xp_reward}
