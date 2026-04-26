"""Mixin: состояние игрока в рейде — HP, смерть, воскрешение, слоты рейд-свитков."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger(__name__)

# Допустимые значения для слотов рейд-свитков (синхронно с docs/WORLD_BOSS.md).
VALID_RAID_SCROLLS = {"damage_25", "defense_20", "dodge_10", "power_10", "crit_10"}


class WorldBossPlayerStateMixin:

    def wb_join_raid(
        self, spawn_id: int, user_id: int, max_hp: int,
        endurance: int = 3, crit: int = 3,
    ) -> Dict[str, Any]:
        """Инициализирует запись игрока в рейде (идемпотентно).
        Если игрок уже присоединён — возвращает текущее состояние.
        endurance и crit снимаются из профиля при первом входе и хранятся локально.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_player_state WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        if row:
            conn.close()
            return dict(row)
        cur.execute(
            """INSERT INTO world_boss_player_state
                  (spawn_id, user_id, current_hp, max_hp, endurance, crit)
                  VALUES (?,?,?,?,?,?)""",
            (int(spawn_id), int(user_id), int(max_hp), int(max_hp),
             int(endurance), int(crit)),
        )
        conn.commit()
        cur.execute(
            "SELECT * FROM world_boss_player_state WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else {}

    def get_wb_player_state(self, spawn_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_player_state WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_wb_player_states(self, spawn_id: int, user_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """Батч-загрузка состояний игроков рейда: 1 SQL вместо N.
        Используется в WS-тике мирового босса — без этого 100 подписчиков
        = 100 open/close соединений каждую секунду."""
        if not user_ids:
            return {}
        uids = [int(u) for u in user_ids]
        conn = self.get_connection()
        cur = conn.cursor()
        ph = ",".join(["?"] * len(uids))
        cur.execute(
            f"SELECT * FROM world_boss_player_state "
            f"WHERE spawn_id=? AND user_id IN ({ph})",
            (int(spawn_id), *uids),
        )
        rows = cur.fetchall()
        conn.close()
        return {int(r["user_id"]): dict(r) for r in rows}

    def wb_add_player_damage(
        self, spawn_id: int, user_id: int, damage: int
    ) -> None:
        """Увеличивает кэш total_damage и hits_count для игрока в рейде."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_player_state "
            "SET total_damage = total_damage + ?, hits_count = hits_count + 1, "
            "last_hit_at = CURRENT_TIMESTAMP "
            "WHERE spawn_id=? AND user_id=?",
            (int(damage), int(spawn_id), int(user_id)),
        )
        conn.commit()
        conn.close()

    def wb_apply_damage_to_player(
        self, spawn_id: int, user_id: int, damage: int
    ) -> Tuple[int, bool]:
        """Отнимает HP у игрока в рейде. Возвращает (new_hp, is_dead).
        Атомарно: current_hp не уйдёт ниже 0, is_dead ставится когда hp=0.
        """
        if damage < 0:
            damage = 0
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_player_state "
            "SET current_hp = MAX(0, current_hp - ?) "
            "WHERE spawn_id=? AND user_id=? AND is_dead=0",
            (int(damage), int(spawn_id), int(user_id)),
        )
        cur.execute(
            "SELECT current_hp FROM world_boss_player_state "
            "WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        new_hp = int(row["current_hp"]) if row else 0
        is_dead = new_hp <= 0
        if is_dead:
            cur.execute(
                "UPDATE world_boss_player_state "
                "SET is_dead=1, died_at=CURRENT_TIMESTAMP "
                "WHERE spawn_id=? AND user_id=? AND is_dead=0",
                (int(spawn_id), int(user_id)),
            )
        conn.commit()
        conn.close()
        return (new_hp, is_dead)

    def wb_resurrect_player(
        self, spawn_id: int, user_id: int, hp_pct: float
    ) -> Optional[int]:
        """Воскрешает игрока: current_hp = max_hp * hp_pct, is_dead=0.
        Возвращает новый current_hp или None если игрок не был мёртв.
        """
        if hp_pct <= 0 or hp_pct > 1.0:
            return None
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_player_state "
            "SET current_hp = CAST(max_hp * ? AS INTEGER), "
            "is_dead=0, died_at=NULL "
            "WHERE spawn_id=? AND user_id=? AND is_dead=1",
            (float(hp_pct), int(spawn_id), int(user_id)),
        )
        conn.commit()
        cur.execute(
            "SELECT current_hp FROM world_boss_player_state "
            "WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["current_hp"]) if row else None

    def wb_set_raid_scroll(
        self, spawn_id: int, user_id: int, slot: int, scroll_name: str
    ) -> bool:
        """Применяет рейд-свиток в слот 1 или 2. Возвращает True если применён."""
        if slot not in (1, 2):
            return False
        if scroll_name not in VALID_RAID_SCROLLS:
            return False
        col = "raid_scroll_1" if slot == 1 else "raid_scroll_2"
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE world_boss_player_state SET {col}=? "
            "WHERE spawn_id=? AND user_id=?",
            (scroll_name, int(spawn_id), int(user_id)),
        )
        conn.commit()
        conn.close()
        return True

    def wb_get_top_alive(self, spawn_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Топ живых игроков по total_damage — для выбора цели ответки босса."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, current_hp, max_hp, total_damage "
            "FROM world_boss_player_state "
            "WHERE spawn_id=? AND is_dead=0 "
            "ORDER BY total_damage DESC LIMIT ?",
            (int(spawn_id), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def wb_get_any_alive(self, spawn_id: int) -> List[Dict[str, Any]]:
        """ВСЕ живые игроки рейда (для рандом-выбора цели — анти-эксплойт
        'не бью, не получаю урон')."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, current_hp, max_hp, total_damage "
            "FROM world_boss_player_state "
            "WHERE spawn_id=? AND is_dead=0",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def wb_get_all_alive_ids(self, spawn_id: int) -> List[int]:
        """user_id всех живых игроков — для коронного AOE-удара."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id FROM world_boss_player_state "
            "WHERE spawn_id=? AND is_dead=0",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        conn.close()
        return [int(r["user_id"]) for r in rows]

