"""Покупка, разблокировка и экипировка образов."""

from __future__ import annotations

from typing import Any, Dict

from config import PLAYER_START_CRIT, PLAYER_START_ENDURANCE, PLAYER_START_STRENGTH


class AvatarsShopMixin:
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

            new_strength = max(PLAYER_START_STRENGTH, int(p["strength"]) + d_str)
            new_endurance = max(PLAYER_START_ENDURANCE, int(p["endurance"]) + d_end)
            new_crit = max(PLAYER_START_CRIT, int(p["crit"]) + d_crit)
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
