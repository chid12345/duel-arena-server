from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.warrior_guard import no_warrior_response, warrior_selected

_TITAN_SESSION_TTL = 60  # секунд — сессия истекает после 1 мин неактивности


class TitanStartBody(BaseModel):
    init_data: str
    floor: int | None = None


class TrainBody(BaseModel):
    init_data: str
    stat: str


STAT_MAP = {
    "strength": "strength",
    "agility": "endurance",
    "intuition": "crit",
    "stamina": "stamina",
}


def register_titan_training_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    battle_system = ctx["battle_system"]
    _battle_state_api = ctx["_battle_state_api"]
    _titan_boss_for_floor = ctx["_titan_boss_for_floor"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    _cache_set = ctx["_cache_set"]
    _rl_check = ctx["_rl_check"]
    stamina_stats_invested = ctx["stamina_stats_invested"]
    _iso_week_key = ctx["_iso_week_key"]
    PLAYER_START_MAX_HP = ctx["PLAYER_START_MAX_HP"]
    PLAYER_START_CRIT = ctx["PLAYER_START_CRIT"]
    HP_MIN_BATTLE_PCT = ctx["HP_MIN_BATTLE_PCT"]

    @router.get("/api/titans/status")
    async def titan_status(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        prog = db.get_titan_progress(uid)
        floor = max(1, int(prog.get("current_floor", 1)))
        return {
            "ok": True,
            "progress": prog,
            "next_boss_preview": _titan_boss_for_floor(floor, db.get_or_create_player(uid, "")),
        }

    @router.post("/api/titans/start")
    async def titan_start(body: TitanStartBody):
        uid = "?"
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            if battle_system.get_battle_status(uid):
                state = _battle_state_api(uid)
                return {"ok": True, "status": "already_in_battle", "battle": state}
            player = db.get_or_create_player(uid, tg_user.get("username") or "")
            if not warrior_selected(player):
                return no_warrior_response()
            mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
            chp = int(player.get("current_hp", mhp))
            if chp < int(mhp * HP_MIN_BATTLE_PCT):
                return {"ok": False, "reason": "low_hp"}
            prog = db.get_titan_progress(uid)
            floor = max(1, int(body.floor or prog.get("current_floor", 1)))
            # 1 сессия Башни = 1 заряд баффа. Сессия истекает при поражении или >1 мин неактивности.
            run_active = int(prog.get("run_active", 0))
            if run_active:
                try:
                    upd = str(prog.get("updated_at") or "")[:19]
                    upd_ts = datetime.strptime(upd, "%Y-%m-%d %H:%M:%S").timestamp()
                    if time.time() - upd_ts > _TITAN_SESSION_TTL:
                        run_active = 0
                        db.titan_set_run_active(uid, 0)
                except Exception:
                    pass
            if not run_active:
                db.consume_charges(uid)
                db.cleanup_expired(uid)
                db.titan_set_run_active(uid, 1)
            boss = _titan_boss_for_floor(floor, player)
            bid = await battle_system.start_battle(player, boss, is_bot2=True, mode="titan", mode_meta={"floor": floor})
            b = battle_system.active_battles.get(bid)
            if b:
                b["_tma_p1"] = True
            return {"ok": True, "status": "titan_started", "floor": floor, "boss": boss, "battle": _battle_state_api(uid)}
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("titan_start error uid=%s: %s", uid, e, exc_info=True)
            return {"ok": False, "reason": str(e)[:200]}

    @router.get("/api/titans/top")
    async def titan_top(limit: int = 30):
        rows = db.get_titan_weekly_top(limit=min(100, max(5, int(limit))))
        rewards = [
            {"rank": 1, "diamonds": 150, "title": "Покоритель Титанов"},
            {"rank": 2, "diamonds": 90, "title": "Гроза Башни"},
            {"rank": 3, "diamonds": 60, "title": "Титаноборец"},
            {"rank": "4-10", "diamonds": 25, "title": "Штурмовик Башни"},
        ]
        return {"ok": True, "week_key": _iso_week_key(), "leaders": rows, "rewards": rewards}

    @router.post("/api/player/train")
    async def train_stat(body: TrainBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "train", max_hits=30, window_sec=10)
        stat = body.stat.lower()
        if stat not in STAT_MAP:
            raise HTTPException(status_code=400, detail=f"Unknown stat: {stat}")

        player = db.get_or_create_player(uid, "")
        free = int(player.get("free_stats", 0))
        if free <= 0:
            return {"ok": False, "reason": "no_free_stats"}

        stats_update: dict = {"free_stats": free - 1}
        result_msg = ""
        if stat == "strength":
            stats_update["strength"] = int(player["strength"]) + 1
            result_msg = f"+1 💪 Сила → {stats_update['strength']}"
        elif stat == "agility":
            stats_update["endurance"] = int(player["endurance"]) + 1
            result_msg = f"+1 🤸 Ловкость → {stats_update['endurance']}"
        elif stat == "intuition":
            stats_update["crit"] = int(player.get("crit", PLAYER_START_CRIT)) + 1
            result_msg = f"+1 💥 Интуиция → {stats_update['crit']}"
        elif stat == "stamina":
            from config import STAMINA_PER_FREE_STAT
            inc = int(STAMINA_PER_FREE_STAT)
            stats_update["max_hp"] = int(player["max_hp"]) + inc
            stats_update["current_hp"] = int(player["current_hp"]) + inc
            result_msg = f"+{inc} ❤️ к пулу HP → {stats_update['max_hp']}"

        db.update_player_stats(uid, stats_update)
        _cache_invalidate(uid)
        fresh = db.get_or_create_player(uid, "")
        inv = stamina_stats_invested(fresh.get("max_hp", PLAYER_START_MAX_HP), fresh.get("level", 1))
        regen = db.apply_hp_regen(uid, inv)
        if regen:
            fresh = dict(fresh)
            fresh["current_hp"] = regen["current_hp"]
        _cache_set(uid, fresh)
        # eq_stats обязательно пробрасываем, иначе после train бонусы экипировки обнуляются
        try:
            eq_stats_fresh = db.get_equipment_stats(uid)
        except Exception:
            eq_stats_fresh = {}
        return {"ok": True, "message": result_msg, "player": _player_api(fresh, eq_stats=eq_stats_fresh)}

    app.include_router(router)
