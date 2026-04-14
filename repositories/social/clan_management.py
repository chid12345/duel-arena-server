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
            cursor.execute("DELETE FROM clan_messages WHERE clan_id = ?", (clan_id,))
            cursor.execute("DELETE FROM clan_members WHERE clan_id = ?", (clan_id,))
            cursor.execute("UPDATE players SET clan_id = NULL WHERE clan_id = ?", (clan_id,))
            cursor.execute("DELETE FROM clans WHERE id = ?", (clan_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
