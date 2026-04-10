"""Покупки в магазине: зелья, буст XP, сброс статов."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from config import (
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_STRENGTH,
    RESET_STATS_COST_DIAMONDS,
    expected_max_hp_from_level,
    stats_when_reaching_level,
)


class ShopStoreMixin:
    def buy_hp_potion_small(self, user_id: int) -> Dict[str, Any]:
        COST = 60
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        max_hp = int(row["max_hp"] or 100)
        current_hp = int(row["current_hp"] or max_hp)
        if current_hp >= max_hp:
            conn.close()
            return {"ok": False, "reason": "HP уже полное!"}
        new_hp = min(max_hp, current_hp + int(max_hp * 0.30))
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
            (COST, new_hp, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "hp_restored": new_hp - current_hp, "new_hp": new_hp, "max_hp": max_hp}

    def buy_hp_potion(self, user_id: int) -> Dict[str, Any]:
        COST = 200
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = max_hp, last_hp_regen = ? WHERE user_id = ?",
            (COST, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "hp_restored": row["max_hp"] - row["current_hp"]}

    def buy_xp_boost(self, user_id: int) -> Dict[str, Any]:
        COST = 400
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, xp_boost_charges = xp_boost_charges + 5 WHERE user_id = ?",
            (COST, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "charges_added": 5}

    def buy_stat_reset(self, user_id: int) -> Dict[str, Any]:
        COST = RESET_STATS_COST_DIAMONDS
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT diamonds, level FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["diamonds"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} алмазов, у вас {row['diamonds']}"}
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
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "free_stats": total_free}

    def consume_xp_boost_charge(self, user_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or (row["xp_boost_charges"] or 0) <= 0:
            conn.close()
            return False
        cursor.execute(
            "UPDATE players SET xp_boost_charges = xp_boost_charges - 1 WHERE user_id = ?",
            (user_id,),
        )
        conn.commit()
        conn.close()
        return True
