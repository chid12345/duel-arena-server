"""Mixin: ежедневные задания — статус + клейм."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from repositories.quests.definitions_tasks import DAILY_QUEST_DEFS
from reward_calculator import calc_reward

_TODAY = lambda: datetime.now().date().isoformat()


class ProgressDailyMixin:

    def get_daily_tasks_status(self, user_id: int) -> list[dict]:
        today = _TODAY()
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT battles_played, battles_won, endless_wins, bot_wins, shop_buys, pvp_wins "
                "FROM daily_quests WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
        except Exception:
            cur.execute(
                "SELECT battles_played, battles_won, endless_wins "
                "FROM daily_quests WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
        _dq = cur.fetchone()
        p = dict(_dq) if _dq else {}
        cur.execute("SELECT win_streak FROM players WHERE user_id=?", (user_id,))
        _wr = cur.fetchone()
        streak = int(_wr["win_streak"] if _wr else 0)
        # Клеймы всех ежедневных заданий за сегодня одним запросом
        daily_keys = [f"{dq['key']}_{today}" for dq in DAILY_QUEST_DEFS]
        placeholders = ",".join(["?" for _ in daily_keys])
        cur.execute(
            f"SELECT claim_key FROM task_claims WHERE user_id=? AND claim_key IN ({placeholders})",
            (user_id, *daily_keys),
        )
        claimed_set = {r["claim_key"] for r in cur.fetchall()}
        conn.close()

        track_map = {
            "battles": int(p.get("battles_played") or 0),
            "wins": int(p.get("battles_won") or 0),
            "pvp_wins": int(p.get("pvp_wins") or 0),
            "endless": int(p.get("endless_wins") or 0),
            "bot_wins": int(p.get("bot_wins") or 0),
            "shop_buys": int(p.get("shop_buys") or 0),
            "streak": streak,
            "wb_hits": self.get_wb_hits_today_count(user_id),
        }
        result = []
        for dq in DAILY_QUEST_DEFS:
            cur_val = track_map.get(dq["track"], 0)
            done = cur_val >= dq["target"]
            claimed = f"{dq['key']}_{today}" in claimed_set
            g, d, xp = calc_reward(dq["difficulty"], dq["frequency"])
            result.append({
                "key": dq["key"], "label": dq["label"], "desc": dq["desc"],
                "current": min(cur_val, dq["target"]), "target": dq["target"],
                "is_completed": done, "reward_claimed": claimed,
                "reward_gold": g, "reward_diamonds": d, "reward_xp": xp,
            })
        return result

    def claim_daily_task(self, user_id: int, task_key: str) -> Dict[str, Any]:
        today = _TODAY()
        claim_key = f"{task_key}_{today}"
        if self.has_task_claim(user_id, claim_key):
            return {"ok": False, "reason": "Уже получено"}
        tasks = self.get_daily_tasks_status(user_id)
        task = next((t for t in tasks if t["key"] == task_key), None)
        if not task:
            return {"ok": False, "reason": "Задание не найдено"}
        if not task["is_completed"]:
            return {"ok": False, "reason": "Не выполнено"}
        if not self.add_task_claim(user_id, claim_key):
            return {"ok": False, "reason": "Уже получено"}
        result = self.grant_exp_with_levelup(
            user_id, task["reward_xp"], gold_add=task["reward_gold"],
            diamonds_add=task["reward_diamonds"],
        )
        return {"ok": True, "gold": task["reward_gold"],
                "diamonds": task["reward_diamonds"], "xp": task["reward_xp"],
                "leveled": result.get("leveled", False),
                "new_level": result.get("new_level")}
