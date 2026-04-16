"""Clan v2: эмблема, описание, min_level, closed, превью, online,
weekly_wins, last_active_at."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

ALLOWED_EMBLEMS = ("light", "dark", "neutral")
ONLINE_WINDOW_SEC = 600  # 10 минут


def _norm_emblem(value: Optional[str]) -> str:
    v = (value or "neutral").strip().lower()
    return v if v in ALLOWED_EMBLEMS else "neutral"


def _clamp_min_level(value: Any) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        n = 1
    return max(1, min(n, 50))


def _trunc_desc(value: Optional[str]) -> str:
    return (value or "").strip()[:120]


class SocialClanV2Mixin:
    """Дополнительные методы для Clan v2."""

    EMBLEMS = ALLOWED_EMBLEMS

    def update_clan_meta(self, leader_id: int, **fields) -> Dict[str, Any]:
        """Обновить description / emblem / min_level / closed (только лидер)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, leader_id FROM clans WHERE leader_id = ?", (leader_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Только лидер может менять"}
        clan_id = int(row["id"])
        sets, vals = [], []
        if "description" in fields:
            sets.append("description = ?"); vals.append(_trunc_desc(fields["description"]))
        if "emblem" in fields:
            sets.append("emblem = ?"); vals.append(_norm_emblem(fields["emblem"]))
        if "min_level" in fields:
            sets.append("min_level = ?"); vals.append(_clamp_min_level(fields["min_level"]))
        if "closed" in fields:
            sets.append("closed = ?"); vals.append(1 if int(fields["closed"]) else 0)
        if not sets:
            conn.close()
            return {"ok": False, "reason": "Нечего обновлять"}
        vals.append(clan_id)
        cursor.execute(f"UPDATE clans SET {', '.join(sets)} WHERE id = ?", vals)
        conn.commit(); conn.close()
        return {"ok": True}

    def bump_clan_active(self, user_id: int) -> None:
        """Отметить активность участника клана (вызывать после боя)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            ts = "NOW()" if self._pg else "CURRENT_TIMESTAMP"
            cursor.execute(
                f"UPDATE clan_members SET last_active_at = {ts} WHERE user_id = ?",
                (int(user_id),),
            )
            conn.commit(); conn.close()
        except Exception:
            pass

    def preview_clan(self, clan_id: int) -> Optional[Dict[str, Any]]:
        """Открытое превью клана без вступления."""
        info = self.get_clan_info(int(clan_id))
        if not info:
            return None
        members = info.get("members") or []
        # Подмешиваем last_active_at + online_count
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT user_id, last_active_at FROM clan_members WHERE clan_id = ?",
                (int(clan_id),),
            )
            la_map = {int(r["user_id"]): r["last_active_at"] for r in cursor.fetchall()}
            conn.close()
        except Exception:
            la_map = {}
        for m in members:
            m["last_active_at"] = la_map.get(int(m["user_id"]))
        online = self._count_online(la_map.values())
        return {"clan": info["clan"], "members": members, "online_count": online}

    def _count_online(self, ts_iter) -> int:
        from datetime import datetime, timedelta, timezone
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_WINDOW_SEC)
        n = 0
        for ts in ts_iter:
            if not ts:
                continue
            try:
                if isinstance(ts, str):
                    s = ts.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(s)
                else:
                    dt = ts
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= cutoff:
                    n += 1
            except Exception:
                continue
        return n

    def top_clans(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Топ клана с эмблемой + online + weekly_wins."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT c.id, c.name, c.tag, c.level, c.wins, c.emblem,
                      COALESCE(c.weekly_wins,0) as weekly_wins,
                      COALESCE(c.season_score,0) as season_score,
                      COALESCE(c.closed,0) as closed,
                      COALESCE(c.description,'') as description,
                      (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
               FROM clans c ORDER BY c.season_score DESC, c.wins DESC LIMIT ?""",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        cursor.execute(
            "SELECT clan_id, last_active_at FROM clan_members"
        )
        all_active = cursor.fetchall()
        conn.close()
        by_clan: Dict[int, list] = {}
        for r in all_active:
            by_clan.setdefault(int(r["clan_id"]), []).append(r["last_active_at"])
        for c in rows:
            c["online_count"] = self._count_online(by_clan.get(int(c["id"]), []))
            c["emblem"] = _norm_emblem(c.get("emblem"))
        return rows
