"""GET /api/world_boss/raid_summary?spawn_id=X — итоги рейда.

Возвращает «красочный итог»: победитель, везунчики со свитком, топ-3.
Используется MVP-экраном для общественного обзора результатов рейда.

Чтение публичных данных рейда; init_data только для авторизации.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from pydantic import BaseModel

log = logging.getLogger(__name__)


def _build_summary(db, spawn_id: int) -> Dict[str, Any]:
    spawn = db.get_wb_spawn(int(spawn_id)) if hasattr(db, "get_wb_spawn") else None
    if not spawn:
        # Fallback: берём напрямую из таблицы
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT spawn_id, boss_name, status, max_hp, current_hp "
            "FROM world_boss_spawns WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"ok": False, "reason": "Рейд не найден"}
        spawn = dict(row)

    is_victory = (spawn.get("status") == "ended") and int(spawn.get("current_hp") or 0) <= 0

    # Топ-3 по урону + имя
    top3 = []
    try:
        raw_top = db.get_wb_top_damagers(int(spawn_id), limit=3)
        for r in raw_top:
            top3.append({
                "user_id": int(r["user_id"]),
                "name": r.get("username") or "Игрок",
                "level": int(r.get("level") or 1),
                "damage": int(r.get("total_damage") or 0),
            })
    except Exception as e:
        log.warning("raid_summary top3 spawn=%s: %s", spawn_id, e)

    # Победитель алмазного сундука + везунчики свитка
    winner = None
    scroll_winners = []
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT r.user_id, p.username, p.level, r.chest_type, r.contribution_pct "
            "FROM world_boss_rewards r "
            "JOIN players p ON p.user_id = r.user_id "
            "WHERE r.spawn_id=? AND r.chest_type IS NOT NULL "
            "ORDER BY r.contribution_pct DESC",
            (int(spawn_id),),
        )
        for r in cur.fetchall():
            entry = {
                "user_id": int(r["user_id"]),
                "name": r["username"] or "Игрок",
                "level": int(r["level"] or 1),
                "contribution_pct": float(r["contribution_pct"] or 0.0),
            }
            if r["chest_type"] == "wb_diamond_chest":
                winner = entry
            elif r["chest_type"] == "scroll_all_12":
                scroll_winners.append(entry)
        conn.close()
    except Exception as e:
        log.warning("raid_summary chest spawn=%s: %s", spawn_id, e)

    return {
        "ok": True,
        "spawn_id": int(spawn_id),
        "boss_name": spawn.get("boss_name"),
        "is_victory": is_victory,
        "max_hp": int(spawn.get("max_hp") or 0),
        "final_hp": int(spawn.get("current_hp") or 0),
        "top3": top3,
        "winner": winner,           # топ-1 (алмазный сундук)
        "scroll_winners": scroll_winners,  # везунчики со свитком
    }


class _Empty(BaseModel):
    init_data: str = ""


def register_world_boss_summary_route(router, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user = ctx["get_user_from_init_data"]

    @router.get("/api/world_boss/raid_summary")
    async def wb_raid_summary(spawn_id: int, init_data: str = ""):
        try:
            if init_data:
                get_user(init_data)
            return _build_summary(db, int(spawn_id))
        except Exception as e:
            log.error("wb_raid_summary spawn=%s: %s", spawn_id, e, exc_info=True)
            return {"ok": False, "reason": str(e)}
