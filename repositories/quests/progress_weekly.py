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
            # Недельная серия — task_progress[wq_max_streak_<week>]:
            # обновляется в update_daily_quest_progress.set_task_progress_if_greater.
            # Раньше читали players.win_streak (глобальный) — это был баг:
            # серия с прошлой недели засчитывалась как выполненная.
            cur.execute(
                "SELECT value FROM task_progress WHERE user_id=? AND task_key=?",
                (user_id, f"wq_max_streak_{week_key}"),
            )
            _wr = cur.fetchone()
            streak = int(_wr["value"] if _wr else 0)
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
        # Премиум-бонус +25% НЕ применяется к наградам за задания.
        gold_final = int(task["reward_gold"])
        xp_final = int(task["reward_xp"])
        result = self.grant_exp_with_levelup(
            user_id, xp_final, gold_add=gold_final,
            diamonds_add=task["reward_diamonds"],
        )
        # Шаг 5: BP-очки за выполненный недельный квест
        try:
            from repositories.season_pass.award_points import award_quest_complete
            award_quest_complete(self, user_id, "weekly")
        except Exception:
            pass
        return {"ok": True, "gold": gold_final,
                "diamonds": task["reward_diamonds"], "xp": xp_final,
                "premium_bonus": False,
                "leveled": result.get("leveled", False),
                "new_level": result.get("new_level")}
