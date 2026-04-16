"""Заявки на вступление в клан (для закрытых кланов)."""

from __future__ import annotations

from typing import Any, Dict, List


class SocialClanJoinReqMixin:
    """Создание/одобрение/отклонение заявок на вступление."""

    def submit_join_request(self, user_id: int, clan_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id, level, wins, username FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row.get("clan_id"):
            conn.close(); return {"ok": False, "reason": "Вы уже в клане"}
        cursor.execute(
            "SELECT id, name, COALESCE(closed,0) as closed, COALESCE(min_level,1) as min_level "
            "FROM clans WHERE id = ?",
            (clan_id,),
        )
        clan = cursor.fetchone()
        if not clan:
            conn.close(); return {"ok": False, "reason": "Клан не найден"}
        if int(clan["closed"]) != 1:
            conn.close(); return {"ok": False, "reason": "Клан открыт — заявка не нужна"}
        plvl = int((row or {}).get("level") or 1)
        if plvl < int(clan["min_level"]):
            conn.close(); return {"ok": False, "reason": f"Нужен уровень {clan['min_level']}+"}
        username = (row or {}).get("username") or ""
        wins = int((row or {}).get("wins") or 0)
        try:
            if self._pg:
                cursor.execute(
                    "INSERT INTO clan_join_requests (clan_id, user_id, username, level, wins) "
                    "VALUES (%s, %s, %s, %s, %s) "
                    "ON CONFLICT (clan_id, user_id) DO UPDATE SET status='pending', "
                    "username=EXCLUDED.username, level=EXCLUDED.level, wins=EXCLUDED.wins, "
                    "created_at=CURRENT_TIMESTAMP",
                    (clan_id, user_id, username, plvl, wins),
                )
            else:
                cursor.execute(
                    "INSERT OR REPLACE INTO clan_join_requests (clan_id, user_id, username, level, wins, status) "
                    "VALUES (?, ?, ?, ?, ?, 'pending')",
                    (clan_id, user_id, username, plvl, wins),
                )
            conn.commit()
            return {"ok": True}
        except Exception as exc:
            conn.rollback()
            return {"ok": False, "reason": "Не удалось подать заявку"}
        finally:
            conn.close()

    def list_join_requests(self, leader_id: int) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
        row = cursor.fetchone()
        if not row:
            conn.close(); return []
        clan_id = int(row["id"])
        cursor.execute(
            "SELECT id, user_id, username, level, wins, created_at FROM clan_join_requests "
            "WHERE clan_id = ? AND status = 'pending' ORDER BY created_at ASC",
            (clan_id,),
        )
        out = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return out

    def accept_join_request(self, leader_id: int, request_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
        clan_row = cursor.fetchone()
        if not clan_row:
            conn.close(); return {"ok": False, "reason": "Только лидер"}
        clan_id = int(clan_row["id"])
        cursor.execute(
            "SELECT user_id FROM clan_join_requests WHERE id = ? AND clan_id = ? AND status='pending'",
            (request_id, clan_id),
        )
        rq = cursor.fetchone()
        if not rq:
            conn.close(); return {"ok": False, "reason": "Заявка не найдена"}
        target_uid = int(rq["user_id"])
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (target_uid,))
        p = cursor.fetchone()
        if p and p.get("clan_id"):
            cursor.execute("UPDATE clan_join_requests SET status='cancelled' WHERE id = ?", (request_id,))
            conn.commit(); conn.close()
            return {"ok": False, "reason": "Игрок уже вступил в другой клан"}
        cursor.execute("SELECT COUNT(*) as cnt FROM clan_members WHERE clan_id = ?", (clan_id,))
        if int(cursor.fetchone()["cnt"]) >= 20:
            conn.close(); return {"ok": False, "reason": "Клан полон"}
        try:
            cursor.execute("INSERT INTO clan_members (user_id, clan_id) VALUES (?, ?)", (target_uid, clan_id))
            cursor.execute("UPDATE players SET clan_id = ? WHERE user_id = ?", (clan_id, target_uid))
            cursor.execute("UPDATE clan_join_requests SET status='accepted' WHERE id = ?", (request_id,))
            conn.commit()
            return {"ok": True, "user_id": target_uid}
        except Exception:
            conn.rollback()
            return {"ok": False, "reason": "Ошибка вступления"}
        finally:
            conn.close()

    def reject_join_request(self, leader_id: int, request_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
        clan_row = cursor.fetchone()
        if not clan_row:
            conn.close(); return {"ok": False, "reason": "Только лидер"}
        clan_id = int(clan_row["id"])
        cursor.execute(
            "UPDATE clan_join_requests SET status='rejected' "
            "WHERE id = ? AND clan_id = ? AND status='pending'",
            (request_id, clan_id),
        )
        conn.commit(); conn.close()
        return {"ok": True}
