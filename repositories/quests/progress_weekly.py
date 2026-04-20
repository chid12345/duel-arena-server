"""Mixin: недельные дополнительные задания — статус + клейм."""
from __future__ import annotations

from typing import Any, Dict

from repositories.quests.definitions_tasks import WEEKLY_EXTRA_DEFS
from reward_calculator import calc_reward


class ProgressWeeklyMixin:

    def get_weekly_extra_status(self, user_id: int, week_key: str) -> list[dict]:
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT win_streak FROM players WHERE user_id=?", (user_id,))
            _wr = cur.fetchone()
            streak = int(_wr["win_streak"] if _wr else 0)
            # Прогресс недельных треков одним запросом
            wq_keys = [f"{wq['track']}_{week_key}" for wq in WEEKLY_EXTRA_DEFS
                       if wq["track"] != "streak"]
            if wq_keys:
                placeholders = ",".join(["?" for _ in wq_keys])
                cur.execute(
                    f"SELECT task_key, value FROM task_progress WHERE user_id=? AND task_key IN ({placeholders})",
                    (user_id, *wq_keys),
                )
                prog = {r["task_key"]: int(r["value"]) for r in cur.fetchall()}
            else:
                prog = {}
            # Клеймы одним запросом
            claim_keys = [f"{wq['key']}_{week_key}" for wq in WEEKLY_EXTRA_DEFS]
            placeholders2 = ",".join(["?" for _ in claim_keys])
            cur.execute(
                f"SELECT claim_key FROM task_claims WHERE user_id=? AND claim_key IN ({placeholders2})",
                (user_id, *claim_keys),
            )
            claimed_set = {r["claim_key"] for r in cur.fetchall()}
        finally:
            conn.close()

        result = []
        for wq in WEEKLY_EXTRA_DEFS:
            if wq["track"] == "streak":
                cur_val = streak
            else:
                cur_val = prog.get(f"{wq['track']}_{week_key}", 0)
            done = cur_val >= wq["target"]
            claimed = f"{wq['key']}_{week_key}" in claimed_set
            g, d, xp = calc_reward(wq["difficulty"], wq["frequency"])
            result.append({
                "key": wq["key"], "label": wq["label"], "desc": wq["desc"],
                "current": min(cur_val, wq["target"]), "target": wq["target"],
                "is_completed": done, "reward_claimed": claimed,
                "reward_gold": g, "reward_diamonds": d, "reward_xp": xp,
            })
        return result

    def claim_weekly_extra(self, user_id: int, task_key: str, week_key: str) -> Dict[str, Any]:
        claim_key = f"{task_key}_{week_key}"
        if self.has_task_claim(user_id, claim_key):
            return {"ok": False, "reason": "Уже получено"}
        tasks = self.get_weekly_extra_status(user_id, week_key)
        task = next((t for t in tasks if t["key"] == task_key), None)
        if not task or not task["is_completed"]:
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
