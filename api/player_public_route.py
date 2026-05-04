"""Публичный профиль игрока /api/player/public/{uid} — без авторизации.

Возвращает безопасные игровые данные для отображения карточки в рейтинге.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI

_RARITY_COLOR = {
    "common": "#a0aec0",
    "rare":   "#fbbf24",
    "epic":   "#c084fc",
    "mythic": "#ff6b2b",
}


def register_player_public_route(app: FastAPI, *, db: Any) -> None:

    @app.get("/api/player/public/{uid}")
    def get_player_public(uid: int):
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT username, level, wins, losses, rating, max_hp, current_hp, "
                "strength, endurance, crit, current_class, is_premium, win_streak "
                "FROM players WHERE user_id = ?",
                (uid,),
            )
            row = cursor.fetchone()
            conn.close()
        except Exception as e:
            return {"ok": False, "reason": str(e)}

        if not row:
            return {"ok": False, "reason": "not_found"}

        try:
            eq_raw = db.get_equipment(uid)
        except Exception:
            eq_raw = {}

        items = []
        for slot, it in eq_raw.items():
            rar = it.get("rarity", "common")
            items.append({
                "slot":    slot,
                "item_id": it.get("item_id", ""),
                "name":    it.get("name", ""),
                "rarity":  rar,
                "color":   _RARITY_COLOR.get(rar, "#a0aec0"),
            })

        def _g(key, default=0):
            try:
                v = row[key]
                return v if v is not None else default
            except Exception:
                return default

        return {
            "ok":           True,
            "user_id":      uid,
            "username":     _g("username", ""),
            "level":        int(_g("level", 1)),
            "wins":         int(_g("wins", 0)),
            "losses":       int(_g("losses", 0)),
            "rating":       int(_g("rating", 1000)),
            "max_hp":       int(_g("max_hp", 100)),
            "current_hp":   int(_g("current_hp", 100)),
            "strength":     int(_g("strength", 0)),
            "endurance":    int(_g("endurance", 0)),
            "crit":         int(_g("crit", 0)),
            "warrior_type": _g("current_class", "tank") or "tank",
            "is_premium":   bool(_g("is_premium", 0)),
            "win_streak":   int(_g("win_streak", 0)),
            "items":        items,
        }
