"""
repositories/avatars.py — система образов (классов): каталог, покупка, экипировка.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from config import AVATAR_CATALOG, AVATAR_SCALE_EVERY_LEVELS, AVATAR_SCALE_MAX_BONUS


class AvatarsMixin:
    """Mixin: операции по образам (классам) игрока."""

    _BASE_AVATAR_IDS = ("base_tank", "base_rogue", "base_crit", "base_neutral")

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
        try:
            cursor.execute("ALTER TABLE players ADD COLUMN equipped_avatar_id TEXT")
        except Exception:
            pass

    def _ensure_avatar_rows(self, cursor, user_id: int) -> None:
        self._ensure_avatar_schema(cursor)
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
                eff = self._effective_avatar_bonus(aid, level)
                rows.append({
                    **dict(a),
                    "unlocked": aid in unlocked_ids,
                    "equipped": aid == equipped,
                    "effective_strength": eff["strength"],
                    "effective_endurance": eff["endurance"],
                    "effective_crit": eff["crit"],
                    "effective_hp_flat": eff["hp_flat"],
                })
            return {"ok": True, "equipped_avatar_id": equipped, "avatars": rows}
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

            cur_b = self._effective_avatar_bonus(cur_avatar, level)
            new_b = self._effective_avatar_bonus(avatar_id, level)

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
