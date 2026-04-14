"""Состояние образов игрока для API."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from config import AVATAR_CATALOG

_log = logging.getLogger(__name__)


class AvatarsStateMixin:
    def get_player_avatar_state(self, user_id: int) -> Dict[str, Any]:
        # ВАЖНО: _ensure_avatar_rows содержит try/except, которые в PostgreSQL
        # оставляют транзакцию в состоянии ABORTED даже при пойманном исключении.
        # Запускаем в отдельном соединении — ошибки инициализации не портят
        # основной SELECT.
        try:
            c0 = self.get_connection()
            cr0 = c0.cursor()
            try:
                self._ensure_avatar_rows(cr0, user_id)
                self._ensure_default_elite_build(cr0, user_id)
                c0.commit()
            except Exception as _e0:
                _log.warning("get_player_avatar_state ensure uid=%s: %s", user_id, _e0)
                try:
                    c0.rollback()
                except Exception:
                    pass
            finally:
                c0.close()
        except Exception:
            pass

        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_schema(cursor)
            self._ensure_elite_builds_schema(cursor)  # обеспечить таблицу даже если первое соединение упало
            cursor.execute("SELECT level, equipped_avatar_id FROM players WHERE user_id = ?", (user_id,))
            player = cursor.fetchone()
            if not player:
                return {"ok": False, "reason": "Игрок не найден"}
            cursor.execute(
                "SELECT avatar_id FROM user_avatar_unlocks WHERE user_id = ?",
                (user_id,),
            )
            unlocked_ids = {r["avatar_id"] for r in cursor.fetchall()}

            level = int(self._row_get(player, "level", 1) or 1)
            equipped = self._row_get(player, "equipped_avatar_id") or "base_neutral"
            rows: List[Dict[str, Any]] = []
            for a in AVATAR_CATALOG:
                aid = a["id"]
                eff = self._effective_avatar_bonus_for_user(cursor, user_id, aid, level)
                rows.append({
                    **dict(a),
                    "unlocked": aid in unlocked_ids,
                    "equipped": aid == equipped,
                    "effective_strength": eff["strength"],
                    "effective_endurance": eff["endurance"],
                    "effective_crit": eff["crit"],
                    "effective_hp_flat": eff["hp_flat"],
                })
            cursor.execute(
                "SELECT * FROM user_elite_builds WHERE user_id = ? ORDER BY created_at ASC",
                (user_id,),
            )
            builds = []
            for b in cursor.fetchall():
                used = self._elite_build_points_used(b)
                builds.append({
                    "build_id": self._row_get(b, "build_id"),
                    "title": self._row_get(b, "title", "Император"),
                    "alloc_strength": int(self._row_get(b, "alloc_strength", 0) or 0),
                    "alloc_endurance": int(self._row_get(b, "alloc_endurance", 0) or 0),
                    "alloc_crit": int(self._row_get(b, "alloc_crit", 0) or 0),
                    "alloc_stamina": int(self._row_get(b, "alloc_stamina", 0) or 0),
                    "fixed_endurance": self._ELITE_FIXED_ENDURANCE,
                    "free_points_total": self._ELITE_FREE_POINTS,
                    "free_points_left": max(0, self._ELITE_FREE_POINTS - used),
                    "is_active": int(self._row_get(b, "is_active", 0) or 0) == 1,
                    "resets_used": int(self._row_get(b, "resets_used", 0) or 0),
                })
            return {"ok": True, "equipped_avatar_id": equipped, "avatars": rows, "elite_builds": builds}
        finally:
            conn.commit()
            conn.close()
