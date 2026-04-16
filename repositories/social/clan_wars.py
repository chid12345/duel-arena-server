"""Клан-войны: вызов клан→клан, 24ч, подсчёт побед, награды.

Правила:
- Только лидер может бросить вызов или принять.
- Один активный вызов на клан (входящий или исходящий).
- 24 часа после старта: каждая победа участника = +1 очко клану в войне.
- По окончании: победитель получает 200 🪙 + 2 💎 каждому участнику.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

WAR_DURATION_HOURS = 24
WAR_REWARD_GOLD = 200
WAR_REWARD_DIAMONDS = 2


def _is_leader(cursor, user_id: int) -> Optional[int]:
    cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (int(user_id),))
    row = cursor.fetchone()
    return int(row["id"]) if row else None


class SocialClanWarsMixin:

    def challenge_clan_to_war(self, leader_id: int, target_clan_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        my_clan = _is_leader(cursor, leader_id)
        if not my_clan:
            conn.close(); return {"ok": False, "reason": "Только лидер"}
        if int(my_clan) == int(target_clan_id):
            conn.close(); return {"ok": False, "reason": "Нельзя вызвать свой клан"}
        cursor.execute("SELECT id FROM clans WHERE id = ?", (int(target_clan_id),))
        if not cursor.fetchone():
            conn.close(); return {"ok": False, "reason": "Клан не найден"}
        # Уже есть активный вызов?
        cursor.execute(
            "SELECT id FROM clan_wars WHERE status IN ('pending','active') "
            "AND (clan_a = ? OR clan_b = ? OR clan_a = ? OR clan_b = ?)",
            (my_clan, my_clan, int(target_clan_id), int(target_clan_id)),
        )
        if cursor.fetchone():
            conn.close(); return {"ok": False, "reason": "У одного из кланов уже есть активная война"}
        cursor.execute(
            "INSERT INTO clan_wars (clan_a, clan_b, status) VALUES (?, ?, 'pending')",
            (my_clan, int(target_clan_id)),
        )
        conn.commit(); conn.close()
        try:
            self.log_clan_event(int(my_clan), "war_challenge", actor_id=leader_id,
                                actor_name="", extra=f"→ clan {target_clan_id}")
            self.log_clan_event(int(target_clan_id), "war_challenge", actor_id=leader_id,
                                actor_name="", extra=f"← clan {my_clan}")
        except Exception:
            pass
        return {"ok": True, "challenged_clan_id": int(target_clan_id)}

    def accept_clan_war(self, leader_id: int, war_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        my_clan = _is_leader(cursor, leader_id)
        if not my_clan:
            conn.close(); return {"ok": False, "reason": "Только лидер"}
        cursor.execute(
            "SELECT id, clan_a, clan_b, status FROM clan_wars WHERE id = ? AND clan_b = ? AND status = 'pending'",
            (int(war_id), int(my_clan)),
        )
        row = cursor.fetchone()
        if not row:
            conn.close(); return {"ok": False, "reason": "Вызов не найден"}
        now = datetime.now(timezone.utc)
        ends = now + timedelta(hours=WAR_DURATION_HOURS)
        ts1 = now if self._pg else now.strftime("%Y-%m-%d %H:%M:%S")
        ts2 = ends if self._pg else ends.strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "UPDATE clan_wars SET status='active', started_at=?, ends_at=?, "
            "score_a=0, score_b=0 WHERE id = ?",
            (ts1, ts2, int(war_id)),
        )
        conn.commit(); conn.close()
        return {"ok": True, "war_id": int(war_id), "ends_at": str(ends)}

    def decline_clan_war(self, leader_id: int, war_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        my_clan = _is_leader(cursor, leader_id)
        if not my_clan:
            conn.close(); return {"ok": False, "reason": "Только лидер"}
        cursor.execute(
            "UPDATE clan_wars SET status='cancelled' "
            "WHERE id = ? AND clan_b = ? AND status='pending'",
            (int(war_id), int(my_clan)),
        )
        conn.commit(); conn.close()
        return {"ok": True}

    def get_active_war_for_clan(self, clan_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, clan_a, clan_b, score_a, score_b, status, started_at, ends_at "
            "FROM clan_wars WHERE status IN ('pending','active') "
            "AND (clan_a = ? OR clan_b = ?) ORDER BY id DESC LIMIT 1",
            (int(clan_id), int(clan_id)),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def bump_war_score(self, user_id: int) -> None:
        """Вызывать после победы: +1 очко в активной войне клана игрока."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (int(user_id),))
            row = cursor.fetchone()
            cid = (row or {}).get("clan_id")
            if not cid:
                conn.close(); return
            cursor.execute(
                "UPDATE clan_wars SET score_a = score_a + 1 "
                "WHERE clan_a = ? AND status='active'",
                (int(cid),),
            )
            cursor.execute(
                "UPDATE clan_wars SET score_b = score_b + 1 "
                "WHERE clan_b = ? AND status='active'",
                (int(cid),),
            )
            conn.commit(); conn.close()
        except Exception:
            pass

    def end_finished_wars(self) -> int:
        """Закрыть войны у которых ends_at прошёл, выдать награды. Возвращает кол-во закрытых."""
        conn = self.get_connection()
        cursor = conn.cursor()
        now_op = "NOW()" if self._pg else "datetime('now')"
        cursor.execute(
            f"SELECT id, clan_a, clan_b, score_a, score_b FROM clan_wars "
            f"WHERE status='active' AND ends_at IS NOT NULL AND ends_at < {now_op}"
        )
        wars = [dict(r) for r in cursor.fetchall()]
        if not wars:
            conn.close(); return 0
        for w in wars:
            sa, sb = int(w["score_a"]), int(w["score_b"])
            winner = w["clan_a"] if sa > sb else (w["clan_b"] if sb > sa else None)
            if winner:
                cursor.execute(
                    "SELECT user_id FROM clan_members WHERE clan_id = ?", (int(winner),),
                )
                members = [int(r["user_id"]) for r in cursor.fetchall()]
                for uid in members:
                    cursor.execute(
                        "UPDATE players SET gold = gold + ?, diamonds = diamonds + ? WHERE user_id = ?",
                        (WAR_REWARD_GOLD, WAR_REWARD_DIAMONDS, uid),
                    )
                cursor.execute(
                    "UPDATE clan_wars SET status='ended', winner_clan = ? WHERE id = ?",
                    (int(winner), int(w["id"])),
                )
                try:
                    cursor.execute(
                        "INSERT INTO clan_history (clan_id, event_type, actor_id, actor_name, extra) "
                        "VALUES (?, 'war_win', 0, '', ?)",
                        (int(winner), f"+{WAR_REWARD_GOLD}g +{WAR_REWARD_DIAMONDS}d each"),
                    )
                except Exception:
                    pass
            else:
                cursor.execute(
                    "UPDATE clan_wars SET status='draw' WHERE id = ?", (int(w["id"]),),
                )
        conn.commit(); conn.close()
        return len(wars)
