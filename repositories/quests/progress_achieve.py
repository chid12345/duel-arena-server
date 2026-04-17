"""Mixin: достижения — _computed_values, статус, клейм тира."""
from __future__ import annotations

from typing import Any, Dict

from repositories.quests.definitions_achieve import ACHIEVEMENT_DEFS, ACHIEVEMENT_BY_KEY


class ProgressAchieveMixin:

    def _computed_values(self, user_id: int) -> dict:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT wins, losses, level FROM players WHERE user_id=?", (user_id,))
        _r = cur.fetchone(); p = dict(_r) if _r else {}
        cur.execute("SELECT best_floor FROM titan_progress WHERE user_id=?", (user_id,))
        _r = cur.fetchone(); t = dict(_r) if _r else {}
        cur.execute("SELECT best_wave FROM endless_progress WHERE user_id=?", (user_id,))
        _r = cur.fetchone(); e = dict(_r) if _r else {}
        cur.execute("SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id=?", (user_id,))
        _r = cur.fetchone(); r = dict(_r) if _r else {}
        conn.close()
        wins = int(p.get("wins") or 0)
        losses = int(p.get("losses") or 0)
        return {
            "battles": wins + losses,
            "wins": wins,
            "level": int(p.get("level") or 1),
            "tower_best": int(t.get("best_floor") or 0),
            "endless_best": int(e.get("best_wave") or 0),
            "referrals": int(r.get("cnt") or 0),
            "wb_wins": self.get_wb_wins_count(user_id),
        }

    def get_achievements_status(self, user_id: int) -> list[dict]:
        computed = self._computed_values(user_id)
        progress, claims = self._fetch_user_tasks_batch(user_id)
        result = []
        for ach in ACHIEVEMENT_DEFS:
            key = ach["key"]
            if ach["source"] == "computed":
                cur_val = computed.get(ach["compute"], 0)
            else:
                cur_val = progress.get(key, 0)

            claimed_tier = 0
            for t in ach["tiers"]:
                if f"{key}_t{t['tier']}" in claims:
                    claimed_tier = t["tier"]

            next_tier = claimed_tier + 1
            tiers = ach["tiers"]
            if next_tier > len(tiers):
                next_t = tiers[-1]
                prev_target = tiers[-2]["target"] if len(tiers) > 1 else 0
            else:
                next_t = tiers[next_tier - 1]
                prev_target = tiers[next_tier - 2]["target"] if next_tier > 1 else 0

            can_claim_tier = None
            for t in tiers:
                ck = f"{key}_t{t['tier']}"
                if ck not in claims and cur_val >= t["target"]:
                    can_claim_tier = t["tier"]
                    break

            result.append({
                "key": key,
                "label": ach["label"],
                "desc": ach["desc"],
                "current": cur_val,
                "claimed_tier": claimed_tier,
                "max_tier": len(tiers),
                "can_claim_tier": can_claim_tier,
                "next_tier": next_tier if next_tier <= len(tiers) else None,
                "next_target": next_t["target"],
                "prev_target": prev_target,
                "next_gold": next_t["gold"],
                "next_diamonds": next_t["diamonds"],
                "next_xp": next_t["xp"],
                "all_done": claimed_tier >= len(tiers),
            })
        return result

    def claim_achievement_tier(self, user_id: int, quest_key: str, tier: int) -> Dict[str, Any]:
        ach = ACHIEVEMENT_BY_KEY.get(quest_key)
        if not ach:
            return {"ok": False, "reason": "Достижение не найдено"}
        tier_def = next((t for t in ach["tiers"] if t["tier"] == tier), None)
        if not tier_def:
            return {"ok": False, "reason": "Уровень не найден"}
        claim_key = f"{quest_key}_t{tier}"
        if self.has_task_claim(user_id, claim_key):
            return {"ok": False, "reason": "Уже получено"}
        if ach["source"] == "computed":
            cv = self._computed_values(user_id)
            cur_val = cv.get(ach["compute"], 0)
        else:
            cur_val = self.get_task_progress(user_id, quest_key)
        if cur_val < tier_def["target"]:
            return {"ok": False, "reason": "Не выполнено"}
        if not self.add_task_claim(user_id, claim_key):
            return {"ok": False, "reason": "Уже получено"}
        result = self.grant_exp_with_levelup(
            user_id, tier_def["xp"], gold_add=tier_def["gold"],
            diamonds_add=tier_def["diamonds"],
        )
        return {
            "ok": True,
            "gold": tier_def["gold"],
            "diamonds": tier_def["diamonds"],
            "xp": tier_def["xp"],
            "leveled": result.get("leveled", False),
            "new_level": result.get("new_level"),
        }
