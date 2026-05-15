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
from economy.formulas import potion_price_for_hp


class ShopStoreMixin:
    def buy_hp_potion(self, user_id: int) -> Dict[str, Any]:
        """Зелье полного HP. Цена считается формулой от max_hp игрока
        (см. economy/formulas.py::potion_price_for_hp + config/economy.json/potions).

        На 1 ур (max_hp=100) ≈ 15g, на 80 ур (max_hp=1000) ≈ 150g.
        Этап 2B редизайна: унифицировано (раньше было buy_hp_potion_small=60g
        и buy_hp_potion=200g плоские, что создавало дыру TMA vs бот).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        max_hp = int(row["max_hp"] or 100)
        current_hp = int(row["current_hp"]) if row["current_hp"] is not None else max_hp
        if current_hp >= max_hp:
            conn.close()
            return {"ok": False, "reason": "HP уже полное!"}
        cost = potion_price_for_hp("hp_full", max_hp)
        if int(row["gold"] or 0) < cost:
            conn.close()
            return {"ok": False, "reason": f"Нужно {cost} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = max_hp, last_hp_regen = ? "
            "WHERE user_id = ? AND gold >= ? AND current_hp < max_hp",
            (cost, datetime.utcnow().isoformat(), user_id, cost),
        )
        if cursor.rowcount == 0:
            conn.close()
            return {"ok": False, "reason": f"Нужно {cost} золота, у вас недостаточно"}
        conn.commit()
        conn.close()
        return {"ok": True, "cost": cost, "hp_restored": max_hp - current_hp, "new_hp": max_hp, "max_hp": max_hp}

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
            "UPDATE players SET gold = gold - ?, xp_boost_charges = xp_boost_charges + 5 WHERE user_id = ? AND gold >= ?",
            (COST, user_id, COST),
        )
        if cursor.rowcount == 0:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас недостаточно"}
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
