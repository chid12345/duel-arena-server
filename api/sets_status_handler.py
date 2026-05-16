"""Маршрут /api/sets/status — сводка по архетипным сетам игрока (Этап 5E)."""

from __future__ import annotations

import logging

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from config.sets_catalog_v2 import SETS_V2
from config.set_bonuses import bonuses_human
from database import db
from repositories.sets import resolve_active_sets

_log = logging.getLogger(__name__)


def _player_class(uid: int) -> str | None:
    """current_class игрока (или warrior_type как fallback)."""
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT current_class, warrior_type FROM players WHERE user_id = ?", (uid,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return (row["current_class"] or row["warrior_type"]) if row else None
    finally:
        conn.close()


def _count_set_ids(equipped: dict, current_class: str | None) -> dict[str, int]:
    """Сколько предметов каждого set_id у игрока (включая виртуальный armor-слот)."""
    from config.class_set_mapping import class_id_to_set_id
    counts: dict[str, int] = {}
    for slot, item in (equipped or {}).items():
        if slot == "ring2":
            continue
        sid = (item or {}).get("set_id") if isinstance(item, dict) else None
        if sid:
            counts[str(sid)] = counts.get(str(sid), 0) + 1
    armor_sid = class_id_to_set_id(current_class)
    if armor_sid:
        counts[armor_sid] = counts.get(armor_sid, 0) + 1
    return counts


def register_sets_status_route(app: FastAPI) -> None:

    @app.get("/api/sets/status")
    def sets_status(init_data: str):
        """Сводка по 6 архетипам: count, пороги (reached/нет), активные бонусы.

        Возвращает {ok, active: [...], archetypes: [...]}:
        - active: список активных сетов с агрегированным описанием бонусов
        - archetypes: ВСЕ 6 архетипов с прогрессом по порогам 2/4/6
        """
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            equipped = db.get_equipment(uid)
            cur_class = _player_class(uid)
            counts = _count_set_ids(equipped, cur_class)

            archetypes_payload = []
            for sid, meta in SETS_V2.items():
                count = int(counts.get(sid, 0))
                thresholds = []
                for t in (2, 4, 6):
                    b = meta["thresholds"][t]
                    thresholds.append({
                        "n": t,
                        "reached": count >= t,
                        "bonuses_human": bonuses_human(b),
                        "perk_id": b.get("perk_id"),
                        "perk_desc": b.get("perk_desc"),
                    })
                archetypes_payload.append({
                    "set_id": sid,
                    "name": meta["name"],
                    "emoji": meta["emoji"],
                    "desc": meta.get("desc", ""),
                    "count": count,
                    "thresholds": thresholds,
                })

            active_payload = []
            for s in resolve_active_sets(equipped, current_class=cur_class):
                active_payload.append({
                    "set_id": s["set_id"],
                    "name": s["name"],
                    "emoji": s["emoji"],
                    "count": s["count"],
                    "threshold": s["threshold"],
                    "bonuses_human": bonuses_human(s["bonuses"]),
                    "perk_id": s["bonuses"].get("perk_id"),
                    "perk_desc": s["bonuses"].get("perk_desc"),
                })

            return {
                "ok": True,
                "max_pieces": 6,
                "active": active_payload,
                "archetypes": archetypes_payload,
            }
        except Exception as e:
            _log.error("sets_status error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}
