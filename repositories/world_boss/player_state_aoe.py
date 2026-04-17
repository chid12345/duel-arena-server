"""Mixin: массовые удары по игрокам в рейде (коронные AOE-удары)."""
from __future__ import annotations

from typing import Any, Dict, List


class WorldBossPlayerStateAoeMixin:

    def wb_aoe_damage_all_alive(
        self, spawn_id: int, dmg_pct: float
    ) -> List[Dict[str, Any]]:
        """Коронный удар: отнимает у всех живых игроков dmg_pct% max_hp.
        Возвращает список убитых (user_id) — для нотификации.
        """
        if dmg_pct <= 0:
            return []
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_player_state "
            "SET current_hp = MAX(0, current_hp - CAST(max_hp * ? AS INTEGER)) "
            "WHERE spawn_id=? AND is_dead=0",
            (float(dmg_pct), int(spawn_id)),
        )
        cur.execute(
            "UPDATE world_boss_player_state "
            "SET is_dead=1, died_at=CURRENT_TIMESTAMP "
            "WHERE spawn_id=? AND is_dead=0 AND current_hp<=0",
            (int(spawn_id),),
        )
        cur.execute(
            "SELECT user_id FROM world_boss_player_state "
            "WHERE spawn_id=? AND is_dead=1 "
            "AND died_at>=datetime('now','-2 seconds')",
            (int(spawn_id),),
        )
        killed = [dict(r) for r in cur.fetchall()]
        conn.commit()
        conn.close()
        return killed
