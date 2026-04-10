"""Элит-билды: активный билд, распределение очков, сброс, доп. слот."""

from __future__ import annotations

from typing import Any, Dict

from config import ELITE_AVATAR_ID, ELITE_AVATAR_STARS, ELITE_AVATAR_USDT


class AvatarsEliteMixin:
    def set_active_elite_build(self, user_id: int, build_id: str) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT 1 FROM user_elite_builds WHERE user_id = ? AND build_id = ? LIMIT 1",
                (user_id, build_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Билд не найден"}
            cursor.execute("UPDATE user_elite_builds SET is_active = 0 WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE user_elite_builds SET is_active = 1 WHERE user_id = ? AND build_id = ?",
                (user_id, build_id),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def save_elite_build_alloc(
        self,
        user_id: int,
        build_id: str,
        alloc_strength: int,
        alloc_endurance: int,
        alloc_crit: int,
        alloc_stamina: int,
    ) -> Dict[str, Any]:
        vals = [
            max(0, int(alloc_strength)),
            max(0, int(alloc_endurance)),
            max(0, int(alloc_crit)),
            max(0, int(alloc_stamina)),
        ]
        used = sum(vals)
        if used > self._ELITE_FREE_POINTS:
            return {"ok": False, "reason": f"Доступно только {self._ELITE_FREE_POINTS} очков"}
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT 1 FROM user_elite_builds WHERE user_id = ? AND build_id = ? LIMIT 1",
                (user_id, build_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Билд не найден"}
            cursor.execute(
                """UPDATE user_elite_builds
                   SET alloc_strength = ?, alloc_endurance = ?, alloc_crit = ?, alloc_stamina = ?
                   WHERE user_id = ? AND build_id = ?""",
                (vals[0], vals[1], vals[2], vals[3], user_id, build_id),
            )
            conn.commit()
            return {"ok": True, "free_points_left": self._ELITE_FREE_POINTS - used}
        finally:
            conn.close()

    def reset_elite_build(self, user_id: int, build_id: str) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT resets_used FROM user_elite_builds WHERE user_id = ? AND build_id = ? LIMIT 1",
                (user_id, build_id),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Билд не найден"}
            resets_used = int(self._row_get(row, "resets_used", 0) or 0)
            if resets_used <= 0:
                cursor.execute(
                    """UPDATE user_elite_builds
                       SET alloc_strength = 0, alloc_endurance = 0, alloc_crit = 0, alloc_stamina = 0, resets_used = 1
                       WHERE user_id = ? AND build_id = ?""",
                    (user_id, build_id),
                )
                conn.commit()
                return {"ok": True, "free_reset_used": True}
            return {
                "ok": False,
                "reason": "Платный сброс",
                "need_payment": True,
                "reset_price": self._elite_half_price(),
            }
        finally:
            conn.close()

    def create_extra_elite_build(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ? LIMIT 1",
                (user_id, ELITE_AVATAR_ID),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Сначала купите Императора"}
            return {
                "ok": False,
                "reason": "Требуется покупка нового Императора",
                "need_payment": True,
                "new_build_price": {"usdt": str(ELITE_AVATAR_USDT), "stars": int(ELITE_AVATAR_STARS)},
            }
        finally:
            conn.close()
