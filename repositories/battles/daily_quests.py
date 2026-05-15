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
        # Сегодняшняя серия: инкремент при победе, обнуление при поражении.
        # today_max_streak держит максимум за сутки → для dq_streak3.
        new_streak = 0
        if won_battle:
            cursor.execute(
                "UPDATE daily_quests SET today_win_streak=today_win_streak+1, "
                "today_max_streak=CASE WHEN today_win_streak+1 > today_max_streak "
                "THEN today_win_streak+1 ELSE today_max_streak END "
                "WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
            cursor.execute(
                "SELECT today_win_streak FROM daily_quests WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
            row = cursor.fetchone()
            new_streak = int(row["today_win_streak"] or 0) if row else 0
        else:
            cursor.execute(
                "UPDATE daily_quests SET today_win_streak=0 WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
        conn.commit()
        conn.close()

        # Недельная серия — отдельный ключ task_progress, max за неделю.
        # Нужно для weekly_undefeated_5 и weekly_streak_5, которые раньше
        # использовали глобальную players.win_streak (вечную).
        if won_battle and new_streak > 0:
            try:
                from datetime import datetime as _dt
                y, w, _ = _dt.utcnow().isocalendar()
                week_key = f"{int(y)}-W{int(w):02d}"
                self.set_task_progress_if_greater(
                    user_id, f"wq_max_streak_{week_key}", new_streak,
                )
            except Exception:
                pass

    def get_bot_wins_today(self, user_id: int) -> int:
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT bot_wins FROM daily_quests WHERE user_id = ? AND quest_date = ?",
            (user_id, today),
        )
        row = cursor.fetchone()
        conn.close()
        return int(row["bot_wins"] or 0) if row else 0

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

    def claim_daily_quest_reward(self, user_id: int, gold_reward: int | None = None, xp_reward: int | None = None) -> Dict[str, Any]:
        """Забрать награду за legacy-ежедневку «5 боёв + 3 победы».

        Если gold_reward/xp_reward не переданы — берёт из economy.json/quests/
        daily_main_quest. Этап 2E редизайна — раньше были захардкожены 55/150.
        """
        if gold_reward is None or xp_reward is None:
            from economy.loader import get_daily_main_quest_reward
            cfg_gold, cfg_xp = get_daily_main_quest_reward()
            gold_reward = cfg_gold if gold_reward is None else gold_reward
            xp_reward = cfg_xp if xp_reward is None else xp_reward
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
        conn.commit()
        conn.close()
        result = self.grant_exp_with_levelup(user_id, xp_reward, gold_add=gold_reward)
        return {"ok": True, "gold": gold_reward, "xp": xp_reward,
                "leveled": result.get("leveled", False),
                "new_level": result.get("new_level"),
                "xp_to_gold": int(result.get("xp_to_gold", 0) or 0)}
