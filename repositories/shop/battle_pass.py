"""Battle Pass: прогресс, тиры, награды Натиска."""

from __future__ import annotations

from typing import Any, Dict, Optional


class ShopBattlePassMixin:
    def get_battle_pass(self, user_id: int, season_id: Optional[int] = None) -> Dict[str, Any]:
        if season_id is None:
            s = self.get_active_season()
            season_id = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)", (user_id, season_id))
        cursor.execute("SELECT * FROM battle_pass WHERE user_id = ? AND season_id = ?", (user_id, season_id))
        row = dict(cursor.fetchone())
        conn.commit()
        conn.close()
        return row

    def update_battle_pass(self, user_id: int, won: bool) -> None:
        s = self.get_active_season()
        sid = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)", (user_id, sid))
        cursor.execute(
            "UPDATE battle_pass SET battles_done = battles_done + 1, wins_done = wins_done + ? WHERE user_id = ? AND season_id = ?",
            (1 if won else 0, user_id, sid),
        )
        conn.commit()
        conn.close()

    def update_battle_pass_endless(self, user_id: int) -> None:
        s = self.get_active_season()
        sid = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)", (user_id, sid))
        cursor.execute(
            "UPDATE battle_pass SET endless_done = endless_done + 1 WHERE user_id = ? AND season_id = ?",
            (user_id, sid),
        )
        conn.commit()
        conn.close()

    def claim_battle_pass_endless_tier(self, user_id: int, tier: int) -> dict:
        ENDLESS_TIERS = [(5, 250, 0, 600), (15, 450, 3, 1200), (30, 650, 6, 2000)]
        if tier < 1 or tier > len(ENDLESS_TIERS):
            return {"ok": False, "reason": "Неверный тир"}
        s = self.get_active_season()
        sid = s["id"] if s else 1
        bp = self.get_battle_pass(user_id, sid)
        endless_done = int(bp.get("endless_done") or 0)
        tier_claimed = int(bp.get("endless_tier_claimed") or 0)
        if tier <= tier_claimed:
            return {"ok": False, "reason": "Уже получено"}
        needed, _, _, _ = ENDLESS_TIERS[tier - 1]
        if endless_done < needed:
            return {"ok": False, "reason": f"Нужно {needed} побед в Натиске"}
        gold = diamonds = xp = 0
        for i in range(tier_claimed, tier):
            _, g, d, x = ENDLESS_TIERS[i]
            gold += g
            diamonds += d
            xp += x
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE battle_pass SET endless_tier_claimed = ? WHERE user_id = ? AND season_id = ?",
            (tier, user_id, sid),
        )
        cursor.execute(
            "UPDATE players SET gold = gold + ?, diamonds = diamonds + ?, exp = exp + ? WHERE user_id = ?",
            (gold, diamonds, xp, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": gold, "diamonds": diamonds, "xp": xp, "tier": tier}

    def claim_battle_pass_tier(self, user_id: int, tier: int) -> Dict[str, Any]:
        s = self.get_active_season()
        sid = s["id"] if s else 1
        bp = self.get_battle_pass(user_id, sid)
        if tier <= bp["last_claimed_tier"]:
            return {"ok": False, "reason": "Тир уже получен"}
        if tier > len(self.BATTLE_PASS_TIERS):
            return {"ok": False, "reason": "Тир не существует"}
        for i in range(bp["last_claimed_tier"], tier):
            b_need, w_need, _, _, _ = self.BATTLE_PASS_TIERS[i]
            if bp["battles_done"] < b_need or bp["wins_done"] < w_need:
                return {"ok": False, "reason": f"Тир {i+1} ещё не выполнен"}
        total_d = total_g = total_xp = 0
        for i in range(bp["last_claimed_tier"], tier):
            _, _, d, g, xp = self.BATTLE_PASS_TIERS[i]
            total_d += d
            total_g += g
            total_xp += xp
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE battle_pass SET last_claimed_tier = ? WHERE user_id = ? AND season_id = ?",
            (tier, user_id, sid),
        )
        cursor.execute(
            "UPDATE players SET diamonds = diamonds + ?, gold = gold + ?, exp = exp + ? WHERE user_id = ?",
            (total_d, total_g, total_xp, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "diamonds": total_d, "gold": total_g, "xp": total_xp}
