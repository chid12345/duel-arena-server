"""
repositories/shop.py — магазин, сезоны, Battle Pass.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from config import (
    RESET_STATS_COST_DIAMONDS,
    PLAYER_START_STRENGTH,
    PLAYER_START_ENDURANCE,
    PLAYER_START_CRIT,
    PLAYER_START_MAX_HP,
    PLAYER_START_FREE_STATS,
    stats_when_reaching_level,
    expected_max_hp_from_level,
)
from reward_calculator import calc_reward as _calc_reward

# (battles_needed, wins_needed, diamonds, gold, xp) — once: easy/easy/medium/hard/epic
def _build_bp_tiers():
    rows = []
    for battles, wins, diff in [
        (3,   1,  'easy'),
        (10,  3,  'easy'),
        (25,  8,  'medium'),
        (50,  20, 'hard'),
        (100, 40, 'epic'),
    ]:
        g, d, xp = _calc_reward(diff, 'once')
        rows.append((battles, wins, d, g, xp))
    return rows

_BP_TIERS = _build_bp_tiers()


class ShopMixin:
    """Mixin: магазин (зелья, буст, ресет), сезоны, Battle Pass."""

    # ── Сезоны ────────────────────────────────────────────────────────────────

    def get_active_season(self) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM seasons WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def update_season_stats(self, user_id: int, won: bool) -> None:
        season = self.get_active_season()
        if not season:
            return
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)", (sid, user_id))
        if won:
            cursor.execute(
                "UPDATE season_stats SET wins = wins + 1, rating = rating + 10 WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        else:
            cursor.execute(
                "UPDATE season_stats SET losses = losses + 1, rating = MAX(900, rating - 5) WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        conn.commit()
        conn.close()

    def get_season_leaderboard(self, season_id: int, limit: int = 10) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ss.user_id, p.username, ss.wins, ss.losses, ss.rating FROM season_stats ss "
            "JOIN players p ON p.user_id = ss.user_id WHERE ss.season_id = ? "
            "ORDER BY ss.rating DESC, ss.wins DESC LIMIT ?",
            (season_id, limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def end_season(self, new_season_name: str) -> Dict[str, Any]:
        season = self.get_active_season()
        if not season:
            return {"ok": False, "reason": "Нет активного сезона"}
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE seasons SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?", (sid,))
        cursor.execute("SELECT user_id, rating FROM season_stats WHERE season_id = ? ORDER BY rating DESC LIMIT 3", (sid,))
        top3 = cursor.fetchall()
        for i, row in enumerate(top3):
            uid, d, t = row["user_id"], [100, 50, 25][i], ["Чемпион сезона", "Серебро сезона", "Бронза сезона"][i]
            cursor.execute("INSERT INTO season_rewards (season_id, user_id, rank, diamonds, reward_title) VALUES (?, ?, ?, ?, ?)", (sid, uid, i + 1, d, t))
            cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (d, uid))
        if self._pg:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (%s, 'active') RETURNING id", (new_season_name,))
            new_sid = int(cursor.fetchone()["id"])
        else:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (?, 'active')", (new_season_name,))
            new_sid = int(cursor.lastrowid)
        conn.commit()
        conn.close()
        return {"ok": True, "ended_season_id": sid, "new_season_id": new_sid, "rewarded": len(top3)}

    # ── Магазин ───────────────────────────────────────────────────────────────

    def buy_hp_potion_small(self, user_id: int) -> Dict[str, Any]:
        COST = 60
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close(); return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        max_hp = int(row["max_hp"] or 100)
        current_hp = int(row["current_hp"] or max_hp)
        if current_hp >= max_hp:
            conn.close(); return {"ok": False, "reason": "HP уже полное!"}
        new_hp = min(max_hp, current_hp + int(max_hp * 0.30))
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
            (COST, new_hp, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit(); conn.close()
        return {"ok": True, "cost": COST, "hp_restored": new_hp - current_hp, "new_hp": new_hp, "max_hp": max_hp}

    def buy_hp_potion(self, user_id: int) -> Dict[str, Any]:
        COST = 200
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close(); return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = max_hp, last_hp_regen = ? WHERE user_id = ?",
            (COST, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit(); conn.close()
        return {"ok": True, "cost": COST, "hp_restored": row["max_hp"] - row["current_hp"]}

    def buy_xp_boost(self, user_id: int) -> Dict[str, Any]:
        COST = 400
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close(); return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, xp_boost_charges = xp_boost_charges + 5 WHERE user_id = ?",
            (COST, user_id),
        )
        conn.commit(); conn.close()
        return {"ok": True, "cost": COST, "charges_added": 5}

    def buy_stat_reset(self, user_id: int) -> Dict[str, Any]:
        COST = RESET_STATS_COST_DIAMONDS
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT diamonds, level FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return {"ok": False, "reason": "Игрок не найден"}
        if row["diamonds"] < COST:
            conn.close(); return {"ok": False, "reason": f"Нужно {COST} алмазов, у вас {row['diamonds']}"}
        plv = int(row["level"])
        total_free = PLAYER_START_FREE_STATS
        for lv in range(2, plv + 1):
            total_free += stats_when_reaching_level(lv)
        reset_hp = expected_max_hp_from_level(plv)
        cursor.execute(
            "UPDATE players SET diamonds = diamonds - ?, strength = ?, endurance = ?, crit = ?, "
            "max_hp = ?, current_hp = ?, free_stats = ?, exp_milestones = 0, last_hp_regen = ? WHERE user_id = ?",
            (COST, PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
             reset_hp, reset_hp, total_free, datetime.utcnow().isoformat(), user_id),
        )
        cursor.execute("UPDATE improvements SET level = 0 WHERE user_id = ?", (user_id,))
        conn.commit(); conn.close()
        return {"ok": True, "cost": COST, "free_stats": total_free}

    def consume_xp_boost_charge(self, user_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or (row["xp_boost_charges"] or 0) <= 0:
            conn.close(); return False
        cursor.execute(
            "UPDATE players SET xp_boost_charges = xp_boost_charges - 1 WHERE user_id = ?",
            (user_id,),
        )
        conn.commit(); conn.close()
        return True

    # ── Battle Pass ───────────────────────────────────────────────────────────

    # (battles_needed, wins_needed, diamonds, gold, xp)
    # once: easy/easy/medium/hard/epic — синхронизировано с reward_calculator
    BATTLE_PASS_TIERS = _BP_TIERS  # назначается на уровне модуля ниже

    def get_battle_pass(self, user_id: int, season_id: Optional[int] = None) -> Dict[str, Any]:
        if season_id is None:
            s = self.get_active_season()
            season_id = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)", (user_id, season_id))
        cursor.execute("SELECT * FROM battle_pass WHERE user_id = ? AND season_id = ?", (user_id, season_id))
        row = dict(cursor.fetchone())
        conn.commit(); conn.close()
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
        conn.commit(); conn.close()

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
        conn.commit(); conn.close()

    def claim_battle_pass_endless_tier(self, user_id: int, tier: int) -> dict:
        # (victories_needed, gold, diamonds, xp) — синхронизировано с reward_calculator REWARD_TABLE
        # once/easy=250g/0d/600xp | once/medium=450g/3d/1200xp | once/hard=650g/6d/2000xp
        ENDLESS_TIERS = [(5, 250, 0, 600), (15, 450, 3, 1200), (30, 650, 6, 2000)]
        if tier < 1 or tier > len(ENDLESS_TIERS):
            return {"ok": False, "reason": "Неверный тир"}
        s = self.get_active_season(); sid = s["id"] if s else 1
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
            _, g, d, x = ENDLESS_TIERS[i]; gold += g; diamonds += d; xp += x
        conn = self.get_connection(); cursor = conn.cursor()
        cursor.execute(
            "UPDATE battle_pass SET endless_tier_claimed = ? WHERE user_id = ? AND season_id = ?",
            (tier, user_id, sid),
        )
        cursor.execute(
            "UPDATE players SET gold = gold + ?, diamonds = diamonds + ?, exp = exp + ? WHERE user_id = ?",
            (gold, diamonds, xp, user_id),
        )
        conn.commit(); conn.close()
        return {"ok": True, "gold": gold, "diamonds": diamonds, "xp": xp, "tier": tier}

    def claim_battle_pass_tier(self, user_id: int, tier: int) -> Dict[str, Any]:
        s = self.get_active_season(); sid = s["id"] if s else 1
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
            total_d += d; total_g += g; total_xp += xp
        conn = self.get_connection(); cursor = conn.cursor()
        cursor.execute(
            "UPDATE battle_pass SET last_claimed_tier = ? WHERE user_id = ? AND season_id = ?",
            (tier, user_id, sid),
        )
        cursor.execute(
            "UPDATE players SET diamonds = diamonds + ?, gold = gold + ?, exp = exp + ? WHERE user_id = ?",
            (total_d, total_g, total_xp, user_id),
        )
        conn.commit(); conn.close()
        return {"ok": True, "diamonds": total_d, "gold": total_g, "xp": total_xp}
