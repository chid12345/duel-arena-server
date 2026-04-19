"""Mixin: награды рейда — world_boss_rewards (создание, список, забор)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger(__name__)


class WorldBossRewardsMixin:

    def create_wb_reward(
        self,
        spawn_id: int,
        user_id: int,
        gold: int,
        exp: int,
        diamonds: int,
        contribution_pct: float,
        is_victory: bool,
        chest_type: Optional[str] = None,
    ) -> int:
        """Создаёт запись о награде. Идемпотентно по (spawn_id, user_id)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT reward_id FROM world_boss_rewards WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        if row:
            conn.close()
            return int(row["reward_id"])
        cur.execute(
            """INSERT INTO world_boss_rewards
                  (spawn_id, user_id, gold, exp, diamonds, chest_type,
                   contribution_pct, is_victory)
               VALUES (?,?,?,?,?,?,?,?)""",
            (int(spawn_id), int(user_id), int(gold), int(exp), int(diamonds),
             chest_type, float(contribution_pct), 1 if is_victory else 0),
        )
        conn.commit()
        if not self._pg:
            rid = cur.lastrowid
        else:
            cur.execute(
                "SELECT reward_id FROM world_boss_rewards WHERE spawn_id=? AND user_id=? "
                "ORDER BY reward_id DESC LIMIT 1",
                (int(spawn_id), int(user_id)),
            )
            row = cur.fetchone()
            rid = row["reward_id"] if row else 0
        conn.close()
        return int(rid)

    def get_wb_unclaimed_rewards(self, user_id: int) -> List[Dict[str, Any]]:
        """Все незабранные награды игрока (может быть несколько, если не забирал)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT r.*, s.boss_name, s.boss_type, s.ended_at "
            "FROM world_boss_rewards r "
            "JOIN world_boss_spawns s ON s.spawn_id = r.spawn_id "
            "WHERE r.user_id=? AND r.claimed=FALSE "
            "ORDER BY r.reward_id DESC",
            (int(user_id),),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def claim_wb_reward(self, reward_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Атомарно помечает награду как забранную.
        Возвращает dict с gold/exp/diamonds/chest_type если успешно, иначе None.
        Начисление валют — делает вызывающая сторона (handler/API).
        """
        conn = self.get_connection()
        cur = conn.cursor()
        # claimed=TRUE: адаптер НЕ матчит (паттерн claimed\s*=\s*1\b), не конвертирует.
        # SQLite: TRUE == 1 → INTEGER колонка принимает.
        # PostgreSQL: после миграции 113 колонка BOOLEAN → TRUE корректен.
        cur.execute(
            "UPDATE world_boss_rewards "
            "SET claimed=TRUE, claimed_at=CURRENT_TIMESTAMP "
            "WHERE reward_id=? AND user_id=? AND claimed=FALSE",
            (int(reward_id), int(user_id)),
        )
        conn.commit()
        if cur.rowcount == 0:
            conn.close()
            return None
        cur.execute(
            "SELECT * FROM world_boss_rewards WHERE reward_id=?",
            (int(reward_id),),
        )
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_wb_wins_count(self, user_id: int) -> int:
        """Количество побед игрока в рейдах Мирового босса (для ach_wb_wins).
        Считаем уникальные spawn_id, где была создана запись is_victory=1.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(DISTINCT spawn_id) AS c FROM world_boss_rewards "
            "WHERE user_id=? AND is_victory=1",
            (int(user_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["c"]) if row else 0

    def get_wb_reward_by_spawn(
        self, spawn_id: int, user_id: int
    ) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_rewards WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    # ── Reminder toggle (players.wb_reminder_opt_in) ──

    def set_wb_reminder_opt_in(self, user_id: int, enabled: bool) -> None:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE players SET wb_reminder_opt_in=? WHERE user_id=?",
            (1 if enabled else 0, int(user_id)),
        )
        conn.commit()
        conn.close()

    def get_wb_reminder_users(self) -> List[Tuple[int, int]]:
        """Подписчики на пуш за 5 мин до рейда: (user_id, chat_id). Только те, у кого есть chat_id."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, chat_id FROM players "
            "WHERE wb_reminder_opt_in=1 AND chat_id IS NOT NULL"
        )
        rows = cur.fetchall()
        conn.close()
        return [(int(r["user_id"]), int(r["chat_id"])) for r in rows]
