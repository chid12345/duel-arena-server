"""Эндпоинт /api/player/active_session — единая точка для определения,
в каком бою сейчас находится игрок (для анти-эксплойта 'refresh → гулять').

Возвращает один из:
- {ok:true, type:'world_boss', scene:'WorldBoss'} — активный рейд босса
- {ok:true, type:'pvp',        scene:'Battle'}    — 1v1 PvP / бой с ботом
- {ok:true, type:'natisk',     scene:'Natisk'}    — натиск
- {ok:true, type:'titan',      scene:'Stats'}     — башня титанов (открывается из Stats)
- {ok:true, type:null,         scene:null}        — никакой активный бой

Фронт (scene_boot) использует это чтобы при старте/refresh вернуть игрока
в активный бой и не дать сбежать через закрытие приложения.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from fastapi import FastAPI

from api.tma_models import InitDataHeader

log = logging.getLogger(__name__)


def register_active_session_route(
    app: FastAPI,
    *,
    db: Any,
    get_user_from_init_data: Callable[[str], dict],
) -> None:
    @app.post("/api/player/active_session")
    def get_active_session(body: InitDataHeader):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
        except Exception as e:
            return {"ok": False, "reason": str(e)}

        # 1. Мировой Босс — у игрока есть player_state в активном спавне.
        try:
            active = db.get_wb_active_spawn()
            if active:
                ps = db.get_wb_player_state(int(active["spawn_id"]), uid)
                if ps:
                    return {"ok": True, "type": "world_boss", "scene": "WorldBoss"}
        except Exception as e:
            log.warning("active_session WB check: %s", e)

        # 2. PvP / бой с ботом — battle_queue.
        try:
            from battle_system import battle_system
            bid = battle_system.battle_queue.get(uid)
            if bid and bid in battle_system.active_battles:
                b = battle_system.active_battles[bid]
                if b.get("battle_active"):
                    return {"ok": True, "type": "pvp", "scene": "Battle", "battle_id": bid}
        except Exception as e:
            log.warning("active_session PvP check: %s", e)

        # 3. Натиск (endless) — is_active=True в endless_progress_run.
        try:
            from repositories.endless.progress_run import EndlessProgressRunMixin  # noqa: F401
            run = None
            if hasattr(db, "get_endless_run_active"):
                run = db.get_endless_run_active(uid)
            elif hasattr(db, "get_endless_run"):
                r = db.get_endless_run(uid)
                if r and (r.get("is_active") if isinstance(r, dict) else False):
                    run = r
            if run:
                return {"ok": True, "type": "natisk", "scene": "Natisk"}
        except Exception as e:
            log.debug("active_session Natisk check: %s", e)

        # 4. Башня Титанов — run_active=1 в titan_progress.
        try:
            prog = db.get_titan_progress(uid)
            if prog and int((prog.get("run_active") or 0)) == 1:
                # Башня открывается через Stats scene → titan tab.
                return {"ok": True, "type": "titan", "scene": "Stats", "openTab": "titan"}
        except Exception as e:
            log.debug("active_session Titan check: %s", e)

        return {"ok": True, "type": None, "scene": None}
