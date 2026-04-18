"""Mixin: состояние боя (HP босса, коронные флаги, ответка босса)."""
from __future__ import annotations

import logging
from typing import Optional

log = logging.getLogger(__name__)


class WorldBossBattleStateMixin:

    def apply_damage_to_boss(self, spawn_id: int, damage: int) -> Optional[int]:
        """Атомарно вычитает damage из current_hp.
        Возвращает новое значение HP, либо None если рейд уже не активен.
        Обрезает current_hp до 0 (не уходит в минус) — нужно для корректного last-hit.
        """
        if damage <= 0:
            return None
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET current_hp = MAX(0, current_hp - ?) "
            "WHERE spawn_id=? AND status='active' AND current_hp > 0",
            (int(damage), int(spawn_id)),
        )
        conn.commit()
        cur.execute(
            "SELECT current_hp FROM world_boss_spawns WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["current_hp"]) if row else None

    def wb_try_trigger_crown(self, spawn_id: int, flag_bit: int) -> bool:
        """Атомарно поднимает бит в crown_flags. True — если это был первый раз.
        Используется чтобы коронный удар сработал ровно 1 раз за рейд.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET crown_flags = COALESCE(crown_flags, 0) | ? "
            "WHERE spawn_id=? AND status='active' "
            "AND (COALESCE(crown_flags, 0) & ?)=0",
            (int(flag_bit), int(spawn_id), int(flag_bit)),
        )
        changed = cur.rowcount > 0
        conn.commit()
        conn.close()
        return bool(changed)

    def wb_try_enrage(self, spawn_id: int, new_stat_profile_json: str) -> bool:
        """Атомарный переход в стадию 2 (ярость). Фаза 2.3.
        True — если это сработало впервые; False если стадия уже 2.
        Одновременно перезаписывает stat_profile (обычно умноженный на 1.2).
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET stage=2, stat_profile=? "
            "WHERE spawn_id=? AND status='active' "
            "AND (stage IS NULL OR stage < 2)",
            (new_stat_profile_json, int(spawn_id)),
        )
        changed = cur.rowcount > 0
        conn.commit()
        conn.close()
        return bool(changed)

    def wb_try_mark_boss_attacked(
        self, spawn_id: int, cooldown_sec: int
    ) -> bool:
        """Атомарно ставит last_boss_attack_at=now если прошло ≥ cooldown_sec.
        True — если ответка «сработала» (т.е. сейчас можно бить).
        Защита от двойного тика если job пересёкся.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=int(cooldown_sec))).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET last_boss_attack_at=CURRENT_TIMESTAMP "
            "WHERE spawn_id=? AND status='active' "
            "AND (last_boss_attack_at IS NULL "
            "     OR last_boss_attack_at <= ?)",
            (int(spawn_id), cutoff),
        )
        changed = cur.rowcount > 0
        conn.commit()
        conn.close()
        return bool(changed)
