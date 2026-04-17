"""Управление кланом: лидерство, исключение, роспуск."""

from __future__ import annotations

from typing import Any, Dict


class SocialClanManagementMixin:
    """Действия лидера клана."""

    def transfer_clan_leader(self, leader_id: int, new_leader_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Вы не являетесь лидером клана"}
            clan_id = int(clan_row["id"])
            if new_leader_id == leader_id:
                return {"ok": False, "reason": "Вы уже являетесь лидером"}
            cursor.execute(
                "SELECT user_id FROM clan_members WHERE user_id = ? AND clan_id = ?",
                (new_leader_id, clan_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Игрок не является участником вашего клана"}
            cursor.execute("UPDATE clans SET leader_id = ? WHERE id = ?", (new_leader_id, clan_id))
            cursor.execute(
                "UPDATE clan_members SET role = 'leader' WHERE user_id = ? AND clan_id = ?",
                (new_leader_id, clan_id),
            )
            cursor.execute(
                "UPDATE clan_members SET role = 'member' WHERE user_id = ? AND clan_id = ?",
                (leader_id, clan_id),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def kick_clan_member(self, leader_id: int, target_user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Только лидер может исключать участников"}
            clan_id = int(clan_row["id"])
            if target_user_id == leader_id:
                return {"ok": False, "reason": "Лидер не может исключить сам себя"}
            cursor.execute(
                "SELECT role FROM clan_members WHERE user_id = ? AND clan_id = ?",
                (target_user_id, clan_id),
            )
            member_row = cursor.fetchone()
            if not member_row:
                return {"ok": False, "reason": "Игрок не найден в вашем клане"}
            if member_row["role"] == "leader":
                return {"ok": False, "reason": "Нельзя исключить лидера"}
            cursor.execute("DELETE FROM clan_members WHERE user_id = ? AND clan_id = ?", (target_user_id, clan_id))
            cursor.execute("UPDATE players SET clan_id = NULL WHERE user_id = ?", (target_user_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def disband_clan(self, leader_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Только лидер может распустить клан"}
            clan_id = int(clan_row["id"])
            self._purge_clan_rows(cursor, clan_id)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def heal_clan_leadership(self, clan_id: int) -> Dict[str, Any]:
        """Если лидер клана пропал (профиль удалён или ушёл в другой клан) —
        передаёт лидерство самому старшему активному участнику (по level, wins).
        Если активных членов нет — клан удаляется полностью.
        Вызывается lazy при каждом GET /api/clan — чтобы «зависшие»
        кланы само-чинились без ручного вмешательства."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, leader_id FROM clans WHERE id = ?", (clan_id,))
            row = cursor.fetchone()
            if not row:
                return {"healed": False, "reason": "no_clan"}
            leader_id = int(row["leader_id"]) if row["leader_id"] else 0
            if leader_id:
                cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (leader_id,))
                lp = cursor.fetchone()
                alive = bool(lp) and int(lp["clan_id"] or 0) == int(clan_id)
                if alive:
                    cursor.execute(
                        "UPDATE clan_members SET role = 'leader' "
                        "WHERE user_id = ? AND clan_id = ? AND role <> 'leader'",
                        (leader_id, clan_id),
                    )
                    conn.commit()
                    return {"healed": False}
            cursor.execute(
                "SELECT cm.user_id, p.username, p.level, p.wins FROM clan_members cm "
                "JOIN players p ON p.user_id = cm.user_id "
                "WHERE cm.clan_id = ? AND (p.clan_id IS NULL OR p.clan_id = ?) "
                "ORDER BY p.level DESC, p.wins DESC, cm.user_id ASC LIMIT 1",
                (clan_id, clan_id),
            )
            cand = cursor.fetchone()
            if not cand:
                self._purge_clan_rows(cursor, int(clan_id))
                conn.commit()
                return {"healed": True, "disbanded": True}
            new_leader = int(cand["user_id"])
            cursor.execute("UPDATE clans SET leader_id = ? WHERE id = ?", (new_leader, clan_id))
            cursor.execute(
                "UPDATE clan_members SET role = 'member' WHERE clan_id = ? AND role = 'leader'",
                (clan_id,),
            )
            cursor.execute(
                "UPDATE clan_members SET role = 'leader' WHERE user_id = ? AND clan_id = ?",
                (new_leader, clan_id),
            )
            cursor.execute(
                "UPDATE players SET clan_id = ? WHERE user_id = ?",
                (clan_id, new_leader),
            )
            conn.commit()
            try: new_name = cand["username"] or f"User{new_leader}"
            except Exception: new_name = f"User{new_leader}"
            try:
                self.log_clan_event(int(clan_id), "leader_auto",
                                    actor_id=new_leader, actor_name=new_name)
            except Exception:
                pass
            return {"healed": True, "new_leader_id": new_leader,
                    "new_leader_name": new_name}
        finally:
            conn.close()

    def clear_orphan_clan_link(self, user_id: int) -> None:
        """Обнуляет players.clan_id если ссылается на несуществующий клан."""
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE players SET clan_id = NULL WHERE user_id = ? AND "
                "clan_id IS NOT NULL AND clan_id NOT IN (SELECT id FROM clans)",
                (user_id,),
            )
            conn.commit()
        finally:
            conn.close()

    def _purge_clan_rows(self, cursor, clan_id: int) -> None:
        """Полное удаление клана и всех связанных записей.
        Используется и disband_clan, и админ-скриптом delete_clan."""
        cursor.execute("UPDATE players SET clan_id = NULL WHERE clan_id = ?", (clan_id,))
        for tbl in (
            "clan_messages", "clan_members", "clan_join_requests",
            "clan_achievements", "clan_history", "clan_tasks",
        ):
            try: cursor.execute(f"DELETE FROM {tbl} WHERE clan_id = ?", (clan_id,))
            except Exception: pass
        try:
            cursor.execute(
                "DELETE FROM clan_wars WHERE clan_a = ? OR clan_b = ?",
                (clan_id, clan_id),
            )
        except Exception:
            pass
        cursor.execute("DELETE FROM clans WHERE id = ?", (clan_id,))
