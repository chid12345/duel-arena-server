"""Кланы и клановый чат."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class SocialClanMixin:
    """Создание, вступление, поиск, чат клана."""

    def create_clan(self, leader_id: int, name: str, tag: str) -> Dict[str, Any]:
        name = " ".join((name or "").split())
        tag = (tag or "").strip().upper()[:4]
        if len(name) < 3 or len(name) > 20:
            return {"ok": False, "reason": "Имя клана: 3–20 символов"}
        if len(tag) < 2 or len(tag) > 4:
            return {"ok": False, "reason": "Тег клана: 2–4 символа"}
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (leader_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы уже состоите в клане"}
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (leader_id,))
        gold_row = cursor.fetchone()
        if not gold_row or gold_row["gold"] < self.CLAN_CREATE_COST_GOLD:
            conn.close()
            return {"ok": False, "reason": f"Нужно {self.CLAN_CREATE_COST_GOLD} золота"}
        cursor.execute("SELECT clan_id FROM clan_members WHERE user_id = ?", (leader_id,))
        member_row = cursor.fetchone()
        if member_row:
            member_clan_id = int(member_row["clan_id"])
            cursor.execute("SELECT id FROM clans WHERE id = ?", (member_clan_id,))
            if cursor.fetchone():
                cursor.execute("UPDATE players SET clan_id = ? WHERE user_id = ?", (member_clan_id, leader_id))
                conn.commit()
                conn.close()
                return {"ok": False, "reason": "Вы уже состоите в клане"}
            cursor.execute("DELETE FROM clan_members WHERE user_id = ?", (leader_id,))
        cursor.execute("SELECT id FROM clans WHERE LOWER(name) = LOWER(?) OR UPPER(tag) = ?", (name, tag))
        if cursor.fetchone():
            conn.close()
            return {"ok": False, "reason": "Клан с таким именем или тегом уже существует"}
        try:
            if self._pg:
                cursor.execute(
                    "INSERT INTO clans (name, tag, leader_id) VALUES (%s, %s, %s) RETURNING id",
                    (name, tag, leader_id),
                )
                clan_id = int(cursor.fetchone()["id"])
            else:
                cursor.execute("INSERT INTO clans (name, tag, leader_id) VALUES (?, ?, ?)", (name, tag, leader_id))
                clan_id = int(cursor.lastrowid)
            cursor.execute(
                "INSERT INTO clan_members (user_id, clan_id, role) VALUES (?, ?, 'leader')",
                (leader_id, clan_id),
            )
            cursor.execute(
                "UPDATE players SET gold = gold - ?, clan_id = ? WHERE user_id = ?",
                (self.CLAN_CREATE_COST_GOLD, clan_id, leader_id),
            )
            conn.commit()
            self.track_purchase(leader_id, "clan_create", "gold", self.CLAN_CREATE_COST_GOLD)
            return {"ok": True, "clan_id": clan_id, "name": name, "tag": tag}
        except Exception as exc:
            conn.rollback()
            err = str(exc).lower()
            is_clan_duplicate = (
                ("unique constraint failed: clans." in err)
                or ("duplicate key value violates unique constraint" in err and "clans_" in err)
            )
            if is_clan_duplicate:
                return {"ok": False, "reason": "Клан с таким именем или тегом уже существует"}
            return {"ok": False, "reason": "Не удалось создать клан. Попробуйте еще раз"}
        finally:
            conn.close()

    def join_clan(self, user_id: int, clan_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы уже состоите в клане"}
        cursor.execute("SELECT id, name FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close()
            return {"ok": False, "reason": "Клан не найден"}
        cursor.execute("SELECT COUNT(*) as cnt FROM clan_members WHERE clan_id = ?", (clan_id,))
        if cursor.fetchone()["cnt"] >= 20:
            conn.close()
            return {"ok": False, "reason": "Клан полон (макс. 20 человек)"}
        cursor.execute("INSERT INTO clan_members (user_id, clan_id) VALUES (?, ?)", (user_id, clan_id))
        cursor.execute("UPDATE players SET clan_id = ? WHERE user_id = ?", (clan_id, user_id))
        conn.commit()
        conn.close()
        return {"ok": True, "clan_name": clan["name"]}

    def leave_clan(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or not row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы не в клане"}
        clan_id = row["clan_id"]
        cursor.execute("SELECT leader_id FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if clan and clan["leader_id"] == user_id:
            conn.close()
            return {"ok": False, "reason": "Лидер не может покинуть клан. Сначала передайте лидерство."}
        cursor.execute("DELETE FROM clan_members WHERE user_id = ?", (user_id,))
        cursor.execute("UPDATE players SET clan_id = NULL WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"ok": True}

    def get_clan_info(self, clan_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close()
            return None
        cursor.execute(
            "SELECT cm.user_id, cm.role, p.username, p.level, p.wins FROM clan_members cm "
            "JOIN players p ON p.user_id = cm.user_id WHERE cm.clan_id = ? ORDER BY cm.role DESC, p.wins DESC",
            (clan_id,),
        )
        members = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"clan": dict(clan), "members": members}

    def search_clans(self, query_str: str, limit: int = 5) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT c.id, c.name, c.tag, c.level, c.wins, "
            "(SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count "
            "FROM clans c WHERE c.name LIKE ? OR c.tag LIKE ? ORDER BY c.wins DESC LIMIT ?",
            (f"%{query_str}%", f"%{query_str}%", limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def transfer_clan_leader(self, leader_id: int, new_leader_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Вы не являетесь лидером клана"}
            clan_id = clan_row["id"]
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

