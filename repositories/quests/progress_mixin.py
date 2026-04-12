"""Mixin: прогресс заданий — task_progress + task_claims + достижения."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict

from repositories.quests.definitions_achieve import ACHIEVEMENT_DEFS, ACHIEVEMENT_BY_KEY
from repositories.quests.definitions_tasks import (
    DAILY_QUEST_DEFS, WEEKLY_EXTRA_DEFS,
)
from reward_calculator import calc_reward

log = logging.getLogger(__name__)

_ISO_WEEK = lambda: (lambda d: f"{d[0]}-W{d[1]:02d}")(datetime.utcnow().isocalendar())
_TODAY = lambda: datetime.now().date().isoformat()


class QuestsProgressMixin:
    # ── Базовые методы task_progress / task_claims ─────────────────────

    def get_task_progress(self, user_id: int, task_key: str) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT value FROM task_progress WHERE user_id=? AND task_key=?",
                    (user_id, task_key))
        row = cur.fetchone()
        conn.close()
        return int(row["value"]) if row else 0

    def add_task_progress(self, user_id: int, task_key: str, amount: int = 1) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO task_progress (user_id, task_key, value) VALUES (?,?,?) "
            "ON CONFLICT(user_id, task_key) DO UPDATE SET value=value+?, updated_at=CURRENT_TIMESTAMP",
            (user_id, task_key, amount, amount),
        )
        cur.execute("SELECT value FROM task_progress WHERE user_id=? AND task_key=?",
                    (user_id, task_key))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return int(row["value"]) if row else amount

    def has_task_claim(self, user_id: int, claim_key: str) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM task_claims WHERE user_id=? AND claim_key=?",
                    (user_id, claim_key))
        result = cur.fetchone() is not None
        conn.close()
        return result

    def add_task_claim(self, user_id: int, claim_key: str) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO task_claims (user_id, claim_key) VALUES (?,?)",
                        (user_id, claim_key))
            conn.commit()
            return True
        except Exception:
            return False
        finally:
            conn.close()

    # ── Трекинг покупок и использования предметов ──────────────────────

    def track_purchase(self, user_id: int, item_id: str, currency: str, price: int) -> None:
        try:
            if currency == "gold" and price > 0:
                self.add_task_progress(user_id, "ach_buy_gold", 1)
                self.add_task_progress(user_id, "ach_spend_gold", price)
                self.add_task_progress(user_id, f"wq_buy_gold_{_ISO_WEEK()}", 1)
                self.add_task_progress(user_id, f"wq_spend_gold_{_ISO_WEEK()}", price)
                self._incr_daily_shop_buys(user_id)
            elif currency == "diamonds" and price > 0:
                self.add_task_progress(user_id, "ach_buy_diamonds", 1)
                self.add_task_progress(user_id, "ach_spend_diamonds", price)
                self._incr_daily_shop_buys(user_id)
            elif currency in ("stars", "usdt"):
                self.add_task_progress(user_id, "ach_buy_premium", 1)
                self._incr_daily_shop_buys(user_id)
        except Exception as e:
            log.warning("track_purchase error: %s", e)

    def track_item_use(self, user_id: int, item_id: str) -> None:
        try:
            if item_id in ("hp_small", "hp_medium", "hp_full"):
                self.add_task_progress(user_id, "ach_use_potions", 1)
                self.add_task_progress(user_id, f"wq_use_potions_{_ISO_WEEK()}", 1)
                if item_id == "hp_small":
                    self.add_task_progress(user_id, "ach_use_hp_small", 1)
            elif item_id.startswith("scroll_"):
                self.add_task_progress(user_id, "ach_use_scrolls", 1)
        except Exception as e:
            log.warning("track_item_use error: %s", e)

    def _incr_daily_shop_buys(self, user_id: int) -> None:
        today = _TODAY()
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?,?,0,0,0)",
            (user_id, today),
        )
        cur.execute("UPDATE daily_quests SET shop_buys=shop_buys+1 WHERE user_id=? AND quest_date=?",
                    (user_id, today))
        conn.commit()
        conn.close()

    # ── Достижения ─────────────────────────────────────────────────────

    def _computed_values(self, user_id: int) -> dict:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT wins, losses, level FROM players WHERE user_id=?", (user_id,))
        p = cur.fetchone() or {}
        cur.execute("SELECT best_floor FROM titan_progress WHERE user_id=?", (user_id,))
        t = cur.fetchone() or {}
        cur.execute("SELECT best_wave FROM endless_progress WHERE user_id=?", (user_id,))
        e = cur.fetchone() or {}
        cur.execute("SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id=?", (user_id,))
        r = cur.fetchone() or {}
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
        }

    def get_achievements_status(self, user_id: int) -> list[dict]:
        computed = self._computed_values(user_id)
        result = []
        for ach in ACHIEVEMENT_DEFS:
            key = ach["key"]
            if ach["source"] == "computed":
                cur_val = computed.get(ach["compute"], 0)
            else:
                cur_val = self.get_task_progress(user_id, key)

            claimed_tier = 0
            for t in ach["tiers"]:
                if self.has_task_claim(user_id, f"{key}_t{t['tier']}"):
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
                if not self.has_task_claim(user_id, ck) and cur_val >= t["target"]:
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
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE players SET gold=gold+?, diamonds=diamonds+?, exp=exp+? WHERE user_id=?",
            (tier_def["gold"], tier_def["diamonds"], tier_def["xp"], user_id),
        )
        conn.commit()
        conn.close()
        return {
            "ok": True,
            "gold": tier_def["gold"],
            "diamonds": tier_def["diamonds"],
            "xp": tier_def["xp"],
        }

    # ── Ежедневные задания ─────────────────────────────────────────────

    def get_daily_tasks_status(self, user_id: int) -> list[dict]:
        today = _TODAY()
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT battles_played, battles_won, endless_wins, bot_wins, shop_buys "
            "FROM daily_quests WHERE user_id=? AND quest_date=?",
            (user_id, today),
        )
        row = cur.fetchone() or {}
        conn.close()
        p = dict(row) if row else {}
        streak = int((self.get_or_create_player(user_id, "") or {}).get("win_streak", 0))
        track_map = {
            "battles": int(p.get("battles_played") or 0),
            "wins": int(p.get("battles_won") or 0),
            "endless": int(p.get("endless_wins") or 0),
            "bot_wins": int(p.get("bot_wins") or 0),
            "shop_buys": int(p.get("shop_buys") or 0),
            "streak": streak,
        }
        result = []
        for dq in DAILY_QUEST_DEFS:
            cur_val = track_map.get(dq["track"], 0)
            done = cur_val >= dq["target"]
            claimed = self.has_task_claim(user_id, f"{dq['key']}_{today}")
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
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE players SET gold=gold+?, diamonds=diamonds+?, exp=exp+? WHERE user_id=?",
            (task["reward_gold"], task["reward_diamonds"], task["reward_xp"], user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": task["reward_gold"],
                "diamonds": task["reward_diamonds"], "xp": task["reward_xp"]}

    # ── Дополнительные недельные задания ──────────────────────────────

    def get_weekly_extra_status(self, user_id: int, week_key: str) -> list[dict]:
        streak = int((self.get_or_create_player(user_id, "") or {}).get("win_streak", 0))
        result = []
        for wq in WEEKLY_EXTRA_DEFS:
            if wq["track"] == "streak":
                cur_val = streak
            else:
                cur_val = self.get_task_progress(user_id, f"{wq['track']}_{week_key}")
            done = cur_val >= wq["target"]
            claimed = self.has_task_claim(user_id, f"{wq['key']}_{week_key}")
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
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE players SET gold=gold+?, diamonds=diamonds+?, exp=exp+? WHERE user_id=?",
            (task["reward_gold"], task["reward_diamonds"], task["reward_xp"], user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": task["reward_gold"],
                "diamonds": task["reward_diamonds"], "xp": task["reward_xp"]}
