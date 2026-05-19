"""DEBUG endpoint — посмотреть сырые данные аренд игрока.

Используется только для отладки. После решения проблемы аренды armor —
удалить (или закрыть admin-токеном).
"""
from __future__ import annotations

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from config.battle_constants import ADMIN_USER_IDS
from database import db


def register_debug_rentals_route(app: FastAPI) -> None:

    @app.get("/api/debug/my_rentals")
    async def my_rentals(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        if uid not in ADMIN_USER_IDS:
            return {"ok": False, "reason": "forbidden"}

        # 1. Метод который использует UI/API
        api_rentals = db.list_active_rentals(uid)

        # 2. Сырые строки из equipment_rentals (включая истёкшие)
        conn = db.get_connection()
        try:
            rows = conn.execute(
                "SELECT user_id, item_id, expires_at, rented_at, stars_paid FROM equipment_rentals WHERE user_id = ?",
                (uid,),
            ).fetchall()
            raw_rows = [dict(r) for r in rows]
        finally:
            conn.close()

        # 3. Сырые строки player_equipment (что надето)
        conn = db.get_connection()
        try:
            rows = conn.execute(
                "SELECT slot, item_id, equipped_at FROM player_equipment WHERE user_id = ?",
                (uid,),
            ).fetchall()
            equipment_rows = [dict(r) for r in rows]
        finally:
            conn.close()

        # 4. Что get_equipment возвращает
        try:
            eq = db.get_equipment(uid)
            eq_repr = {s: it.get("item_id") for s, it in eq.items()}
        except Exception as e:
            eq_repr = {"error": str(e)}

        # Старая таблица player_owned_armor снесена вместе с armor.

        return {
            "ok": True,
            "uid": uid,
            "api_active_rentals_count": len(api_rentals),
            "api_active_rentals": api_rentals,
            "raw_equipment_rentals_count": len(raw_rows),
            "raw_equipment_rentals": raw_rows,
            "player_equipment_rows": equipment_rows,
            "get_equipment_result": eq_repr,
        }

    @app.post("/api/debug/wipe_my_rentals")
    async def wipe_my_rentals(init_data: str):
        """Debug: ПОЛНЫЙ сброс брони и аренд игрока для теста авто-снятия.

        Удаляется (для теста — игрок теряет ВСЁ что покупал/арендовал):
        - equipment_rentals (все аренды любых слотов).
        - player_owned_weapons (купленные мифик-шлемы/мечи/щиты/ноги/кольца).
        - player_equipment ВСЕ слоты (иначе после удаления owned-таблицы
          в слотах останутся «мёртвые ссылки» на удалённые предметы).

        Старый armor (player_owned_armor, armor_custom_mods, current_class кэш)
        снесён под корень — таблиц больше нет.
        """
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        if uid not in ADMIN_USER_IDS:
            return {"ok": False, "reason": "forbidden"}
        conn = db.get_connection()
        try:
            cur = conn.cursor()

            def _count(sql: str) -> int:
                cur.execute(sql, (uid,))
                row = cur.fetchone()
                return int((row["n"] if isinstance(row, dict) else row[0]) or 0)

            deleted_rentals       = _count("SELECT COUNT(*) AS n FROM equipment_rentals    WHERE user_id = ?")
            deleted_owned_weapons = _count("SELECT COUNT(*) AS n FROM player_owned_weapons WHERE user_id = ?")
            cleared_slots         = _count("SELECT COUNT(*) AS n FROM player_equipment     WHERE user_id = ?")

            cur.execute("DELETE FROM equipment_rentals    WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM player_owned_weapons WHERE user_id = ?", (uid,))
            cur.execute("DELETE FROM player_equipment     WHERE user_id = ?", (uid,))
            conn.commit()
        finally:
            conn.close()
        return {
            "ok": True, "uid": uid,
            "deleted_rentals": deleted_rentals,
            "deleted_owned_weapons": deleted_owned_weapons,
            "cleared_slots": cleared_slots,
        }
