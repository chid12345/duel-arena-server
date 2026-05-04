"""Публичный профиль игрока /api/player/public/{uid} — без авторизации.

Возвращает данные для карточки игрока в рейтинге (аналог BotBattleCard).
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from config.battle_constants import stamina_stats_invested

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
            cursor.execute("SELECT * FROM players WHERE user_id = ?", (uid,))
            row = cursor.fetchone()
            conn.close()
        except Exception as e:
            return {"ok": False, "reason": str(e)}

        if not row:
            return {"ok": False, "reason": "not_found"}

        player = dict(row)

        try:
            eq_raw = db.get_equipment(uid)
        except Exception:
            eq_raw = {}

        try:
            eq_stats = db.get_equipment_stats(uid)
        except Exception:
            eq_stats = {}

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

        def _i(key, default=0):
            try:
                v = player.get(key)
                return int(v) if v is not None else default
            except Exception:
                return default

        lv     = _i("level", 1)
        mhp    = _i("max_hp", 100)
        stamina = stamina_stats_invested(mhp, lv)

        # Финальные статы = база из БД + бонус от экипировки (как в боевой системе)
        strength  = _i("strength",  3) + int(eq_stats.get("str_bonus",  0))
        endurance = _i("endurance", 3) + int(eq_stats.get("agi_bonus",  0))
        crit      = _i("crit",      3) + int(eq_stats.get("intu_bonus", 0))

        # Premium: is_premium в PG — boolean, в SQLite — 0/1
        is_prem = player.get("is_premium")
        is_premium = bool(is_prem) if is_prem is not None else False

        return {
            "ok":           True,
            "user_id":      uid,
            "username":     player.get("username") or "",
            "level":        lv,
            "wins":         _i("wins"),
            "losses":       _i("losses"),
            "rating":       _i("rating", 1000),
            "max_hp":       mhp,
            "current_hp":   _i("current_hp", mhp),
            "strength":     strength,
            "endurance":    endurance,
            "crit":         crit,
            "stamina":      stamina,
            "warrior_type": player.get("warrior_type") or player.get("current_class") or "tank",
            "is_premium":   is_premium,
            "win_streak":   _i("win_streak"),
            "items":        items,
        }
