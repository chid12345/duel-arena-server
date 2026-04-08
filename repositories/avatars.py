"""
repositories/avatars.py — система образов (классов): каталог, покупка, экипировка.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from config import (
    AVATAR_CATALOG,
    AVATAR_SCALE_EVERY_LEVELS,
    AVATAR_SCALE_MAX_BONUS,
    ELITE_AVATAR_ID,
    ELITE_AVATAR_STARS,
    ELITE_AVATAR_USDT,
    STAMINA_PER_FREE_STAT,
)


class AvatarsMixin:
    """Mixin: операции по образам (классам) игрока."""

    _BASE_AVATAR_IDS = ("base_tank", "base_rogue", "base_crit", "base_neutral")
    _ELITE_FREE_POINTS = 19
    _ELITE_FIXED_ENDURANCE = 5

    @staticmethod
    def _avatar_map() -> Dict[str, Dict[str, Any]]:
        return {a["id"]: dict(a) for a in AVATAR_CATALOG}

    @staticmethod
    def _row_get(row: Any, key: str, default: Any = None) -> Any:
        if row is None:
            return default
        if isinstance(row, dict):
            return row.get(key, default)
        try:
            return row[key]
        except Exception:
            return default

    def _ensure_avatar_schema(self, cursor) -> None:
        # Safety net for environments where avatar migration was not applied yet.
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS user_avatar_unlocks (
                user_id INTEGER NOT NULL,
                avatar_id TEXT NOT NULL,
                source TEXT DEFAULT 'shop',
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, avatar_id)
            )"""
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_avatar_unlocks_user ON user_avatar_unlocks (user_id)"
        )
        is_pg = bool(getattr(self, "_pg", False))
        if is_pg:
            cursor.execute(
                """SELECT 1
                   FROM information_schema.columns
                   WHERE table_name = 'players'
                     AND column_name = 'equipped_avatar_id'
                   LIMIT 1"""
            )
            has_col = bool(cursor.fetchone())
            if not has_col:
                cursor.execute("ALTER TABLE players ADD COLUMN equipped_avatar_id TEXT")
        else:
            cursor.execute("PRAGMA table_info(players)")
            cols = {r[1] for r in cursor.fetchall()}
            if "equipped_avatar_id" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN equipped_avatar_id TEXT")

    def _ensure_elite_builds_schema(self, cursor) -> None:
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS user_elite_builds (
                build_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT DEFAULT 'Император',
                alloc_strength INTEGER DEFAULT 0,
                alloc_endurance INTEGER DEFAULT 0,
                alloc_crit INTEGER DEFAULT 0,
                alloc_stamina INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 0,
                resets_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_elite_builds_user ON user_elite_builds (user_id)"
        )

    def _elite_half_price(self) -> Dict[str, Any]:
        try:
            usdt = round(float(str(ELITE_AVATAR_USDT)) * 0.5, 2)
        except Exception:
            usdt = 5.99
        stars = max(1, int(int(ELITE_AVATAR_STARS) * 0.5))
        return {"usdt": f"{usdt:.2f}", "stars": stars}

    def _elite_build_points_used(self, row: Any) -> int:
        return (
            int(self._row_get(row, "alloc_strength", 0) or 0)
            + int(self._row_get(row, "alloc_endurance", 0) or 0)
            + int(self._row_get(row, "alloc_crit", 0) or 0)
            + int(self._row_get(row, "alloc_stamina", 0) or 0)
        )

    def _ensure_default_elite_build(self, cursor, user_id: int) -> None:
        self._ensure_elite_builds_schema(cursor)
        cursor.execute(
            "SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ? LIMIT 1",
            (user_id, ELITE_AVATAR_ID),
        )
        if not cursor.fetchone():
            return
        cursor.execute("SELECT 1 FROM user_elite_builds WHERE user_id = ? LIMIT 1", (user_id,))
        if cursor.fetchone():
            return
        bid = f"elite_{uuid.uuid4().hex[:12]}"
        cursor.execute(
            """INSERT INTO user_elite_builds
               (build_id, user_id, title, alloc_strength, alloc_endurance, alloc_crit, alloc_stamina, is_active, resets_used)
               VALUES (?, ?, 'Император #1', 0, 0, 0, 0, 1, 0)""",
            (bid, user_id),
        )

    def _get_active_elite_build(self, cursor, user_id: int) -> Optional[Any]:
        self._ensure_default_elite_build(cursor, user_id)
        cursor.execute(
            "SELECT * FROM user_elite_builds WHERE user_id = ? AND is_active = 1 LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return row
        cursor.execute(
            "SELECT * FROM user_elite_builds WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE user_elite_builds SET is_active = 0 WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE user_elite_builds SET is_active = 1 WHERE user_id = ? AND build_id = ?",
                (user_id, self._row_get(row, "build_id")),
            )
        return row

    def _ensure_avatar_rows(self, cursor, user_id: int) -> None:
        self._ensure_avatar_schema(cursor)
        self._ensure_elite_builds_schema(cursor)
        for aid in self._BASE_AVATAR_IDS:
            cursor.execute(
                """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                   VALUES (?, ?, 'base')
                   ON CONFLICT (user_id, avatar_id) DO NOTHING""",
                (user_id, aid),
            )
        cursor.execute("SELECT equipped_avatar_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and not self._row_get(row, "equipped_avatar_id"):
            cursor.execute(
                "UPDATE players SET equipped_avatar_id = 'base_neutral' WHERE user_id = ?",
                (user_id,),
            )

    @staticmethod
    def _scale_bonus(level: int) -> int:
        step = max(1, int(AVATAR_SCALE_EVERY_LEVELS))
        cap = max(0, int(AVATAR_SCALE_MAX_BONUS))
        return min(cap, max(0, int(level)) // step)

    def _effective_avatar_bonus(self, avatar_id: Optional[str], level: int) -> Dict[str, int]:
        avatars = self._avatar_map()
        avatar = avatars.get(avatar_id or "")
        if not avatar:
            return {"strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0}

        scale = self._scale_bonus(level)
        tier = (avatar.get("tier") or "").lower()
        scale_allowed = tier in {"gold", "diamond", "elite"}

        b_str = int(avatar.get("strength", 0))
        b_end = int(avatar.get("endurance", 0))
        b_crit = int(avatar.get("crit", 0))
        b_hp = int(avatar.get("hp_flat", 0))

        if scale_allowed:
            b_str += scale
            b_end += scale
            b_crit += scale

        return {"strength": b_str, "endurance": b_end, "crit": b_crit, "hp_flat": b_hp}

    def _effective_avatar_bonus_for_user(self, cursor, user_id: int, avatar_id: Optional[str], level: int) -> Dict[str, int]:
        if (avatar_id or "") != ELITE_AVATAR_ID:
            return self._effective_avatar_bonus(avatar_id, level)
        active = self._get_active_elite_build(cursor, user_id)
        if not active:
            return self._effective_avatar_bonus(avatar_id, level)
        used = self._elite_build_points_used(active)
        if used > self._ELITE_FREE_POINTS:
            used = self._ELITE_FREE_POINTS
        scale = min(max(0, int(AVATAR_SCALE_MAX_BONUS)), max(0, int(level)) // max(1, int(AVATAR_SCALE_EVERY_LEVELS)))
        return {
            "strength": int(self._row_get(active, "alloc_strength", 0) or 0) + scale,
            "endurance": self._ELITE_FIXED_ENDURANCE + int(self._row_get(active, "alloc_endurance", 0) or 0) + scale,
            "crit": int(self._row_get(active, "alloc_crit", 0) or 0) + scale,
            "hp_flat": int(self._row_get(active, "alloc_stamina", 0) or 0) * int(STAMINA_PER_FREE_STAT),
        }

    def get_player_avatar_state(self, user_id: int) -> Dict[str, Any]:
        avatars = self._avatar_map()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_schema(cursor)
            cursor.execute("SELECT level, equipped_avatar_id FROM players WHERE user_id = ?", (user_id,))
            player = cursor.fetchone()
            if not player:
                return {"ok": False, "reason": "Игрок не найден"}

            self._ensure_avatar_rows(cursor, user_id)
            self._ensure_default_elite_build(cursor, user_id)
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

    def unlock_avatar(self, user_id: int, avatar_id: str, source: str = "shop") -> Dict[str, Any]:
        avatars = self._avatar_map()
        if avatar_id not in avatars:
            return {"ok": False, "reason": "Образ не найден"}
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                   VALUES (?, ?, ?)
                   ON CONFLICT (user_id, avatar_id) DO NOTHING""",
                (user_id, avatar_id, source),
            )
            created = int(getattr(cursor, "rowcount", 0) or 0) > 0
            conn.commit()
            return {"ok": True, "already_unlocked": not created}
        finally:
            conn.close()

    def buy_avatar(self, user_id: int, avatar_id: str) -> Dict[str, Any]:
        avatars = self._avatar_map()
        avatar = avatars.get(avatar_id)
        if not avatar:
            return {"ok": False, "reason": "Образ не найден"}
        currency = avatar.get("currency")
        price = int(avatar.get("price", 0) or 0)
        if currency not in {"gold", "diamonds"}:
            return {"ok": False, "reason": "Этот образ покупается через Stars/USDT"}

        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ? LIMIT 1",
                (user_id, avatar_id),
            )
            if cursor.fetchone():
                return {"ok": False, "reason": "Образ уже куплен"}

            cursor.execute("SELECT gold, diamonds FROM players WHERE user_id = ?", (user_id,))
            p = cursor.fetchone()
            if not p:
                return {"ok": False, "reason": "Игрок не найден"}
            gold = int(self._row_get(p, "gold", 0) or 0)
            dia = int(self._row_get(p, "diamonds", 0) or 0)
            if currency == "gold" and gold < price:
                return {"ok": False, "reason": f"Нужно {price} золота"}
            if currency == "diamonds" and dia < price:
                return {"ok": False, "reason": f"Нужно {price} алмазов"}

            if currency == "gold":
                cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (price, user_id))
            else:
                cursor.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?", (price, user_id))

            cursor.execute(
                """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                   VALUES (?, ?, ?)""",
                (user_id, avatar_id, currency),
            )
            conn.commit()
            return {"ok": True, "currency": currency, "price": price}
        finally:
            conn.close()

    def equip_avatar(self, user_id: int, avatar_id: str) -> Dict[str, Any]:
        avatars = self._avatar_map()
        if avatar_id not in avatars:
            return {"ok": False, "reason": "Образ не найден"}
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._ensure_avatar_rows(cursor, user_id)
            cursor.execute(
                "SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ? LIMIT 1",
                (user_id, avatar_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Образ не куплен"}

            cursor.execute(
                "SELECT level, strength, endurance, crit, max_hp, current_hp, equipped_avatar_id FROM players WHERE user_id = ?",
                (user_id,),
            )
            p = cursor.fetchone()
            if not p:
                return {"ok": False, "reason": "Игрок не найден"}

            level = int(self._row_get(p, "level", 1) or 1)
            cur_avatar = self._row_get(p, "equipped_avatar_id") or "base_neutral"
            if cur_avatar == avatar_id:
                return {"ok": True, "already_equipped": True}

            cur_b = self._effective_avatar_bonus_for_user(cursor, user_id, cur_avatar, level)
            new_b = self._effective_avatar_bonus_for_user(cursor, user_id, avatar_id, level)

            d_str = int(new_b["strength"]) - int(cur_b["strength"])
            d_end = int(new_b["endurance"]) - int(cur_b["endurance"])
            d_crit = int(new_b["crit"]) - int(cur_b["crit"])
            d_hp = int(new_b["hp_flat"]) - int(cur_b["hp_flat"])

            new_strength = max(1, int(p["strength"]) + d_str)
            new_endurance = max(1, int(p["endurance"]) + d_end)
            new_crit = max(1, int(p["crit"]) + d_crit)
            new_max_hp = max(1, int(p["max_hp"]) + d_hp)
            new_current_hp = min(new_max_hp, max(1, int(p["current_hp"]) + d_hp))

            cursor.execute(
                """UPDATE players
                   SET strength = ?, endurance = ?, crit = ?, max_hp = ?, current_hp = ?, equipped_avatar_id = ?
                   WHERE user_id = ?""",
                (new_strength, new_endurance, new_crit, new_max_hp, new_current_hp, avatar_id, user_id),
            )
            conn.commit()
            return {
                "ok": True,
                "equipped_avatar_id": avatar_id,
                "delta": {"strength": d_str, "endurance": d_end, "crit": d_crit, "max_hp": d_hp},
            }
        finally:
            conn.close()

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
        vals = [max(0, int(alloc_strength)), max(0, int(alloc_endurance)), max(0, int(alloc_crit)), max(0, int(alloc_stamina))]
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
            return {"ok": False, "reason": "Платный сброс", "need_payment": True, "reset_price": self._elite_half_price()}
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
