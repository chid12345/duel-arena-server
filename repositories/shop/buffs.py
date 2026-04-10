"""Активные бафы игрока (player_buffs): CRUD + применение к бою."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


class ShopBuffsMixin:
    # Максимально допустимые значения бафов (против абуза)
    _BUFF_CAPS: Dict[str, int] = {
        "armor_pct":    40,
        "dodge_pct":    30,
        "double_pct":   40,
        "lifesteal_pct": 15,
    }

    def get_raw_buffs(self, user_id: int) -> List[Dict[str, Any]]:
        """Все активные бафы: charge-based и time-based."""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute(
            """SELECT id, buff_type, value, charges, expires_at
               FROM player_buffs
               WHERE user_id = ?
                 AND (charges IS NULL OR charges > 0)
                 AND (expires_at IS NULL OR expires_at > ?)""",
            (user_id, now),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def get_combined_buffs(self, user_id: int) -> Dict[str, int]:
        """Суммарные значения всех бафов (для применения в бою)."""
        buffs = self.get_raw_buffs(user_id)
        combined: Dict[str, int] = {}
        for b in buffs:
            bt = b["buff_type"]
            combined[bt] = combined.get(bt, 0) + b["value"]
        # Применяем капы
        for bt, cap in self._BUFF_CAPS.items():
            if bt in combined:
                combined[bt] = max(-cap, min(cap, combined[bt]))
        return combined

    def has_any_combat_buff(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Возвращает первый активный combat-баф (свиток), или None."""
        buffs = self.get_raw_buffs(user_id)
        for b in buffs:
            if b["buff_type"] not in ("gold_pct",):
                return b
        return None

    def clear_combat_buffs(self, user_id: int) -> None:
        """Удалить все combat-бафы (при замене свитка)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM player_buffs WHERE user_id = ? AND buff_type != 'gold_pct'",
            (user_id,),
        )
        conn.commit()
        conn.close()

    def add_buff(
        self,
        user_id: int,
        buff_type: str,
        value: int,
        charges: Optional[int] = None,
        hours: Optional[float] = None,
    ) -> None:
        """Добавить баф. charges=N → зарядный; hours=N → временной."""
        expires_at = None
        if hours is not None:
            expires_at = (datetime.utcnow() + timedelta(hours=hours)).isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO player_buffs (user_id, buff_type, value, charges, expires_at) VALUES (?,?,?,?,?)",
            (user_id, buff_type, value, charges, expires_at),
        )
        conn.commit()
        conn.close()

    def consume_charges(self, user_id: int) -> None:
        """Уменьшить заряды всех charge-based бафов на 1 после боя; удалить нулевые."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE player_buffs SET charges = charges - 1 WHERE user_id = ? AND charges IS NOT NULL AND charges > 0",
            (user_id,),
        )
        cursor.execute(
            "DELETE FROM player_buffs WHERE user_id = ? AND charges IS NOT NULL AND charges <= 0",
            (user_id,),
        )
        conn.commit()
        conn.close()

    def cleanup_expired(self, user_id: int) -> None:
        """Удалить устаревшие time-based бафы."""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "DELETE FROM player_buffs WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at <= ?",
            (user_id, now),
        )
        conn.commit()
        conn.close()

    def apply_scroll_buffs(
        self,
        user_id: int,
        effects: List[tuple],
        replace: bool = False,
    ) -> Dict[str, Any]:
        """
        Применить свиток из инвентаря.
        effects: [(buff_type, value, charges), ...]
        replace=True → убрать старый свиток перед применением.
        """
        existing = self.has_any_combat_buff(user_id)
        if existing and not replace:
            return {"ok": False, "conflict": True, "active_buff": existing}
        if replace:
            self.clear_combat_buffs(user_id)
        for buff_type, value, charges in effects:
            self.add_buff(user_id, buff_type, value, charges=charges)
        return {"ok": True}
