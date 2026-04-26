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
        # ВАЖНО: если auto_bot=1 (юзер включил «Авто-бой 50%» в лобби),
        # НЕ редиректим — смысл авто-бота как раз в том что игрок не хочет
        # участвовать вручную, бот дерётся за него. Пусть гуляет по игре.
        try:
            active = db.get_wb_active_spawn()
            if active:
                ps = db.get_wb_player_state(int(active["spawn_id"]), uid)
                if ps and not int(ps.get("auto_bot") or 0):
                    return {"ok": True, "type": "world_boss", "scene": "WorldBoss"}
        except Exception as e:
            log.warning("active_session WB check: %s", e)

        # 2. PvP / бой с ботом / Натиск / Башня — все используют battle_system.
        # battle_queue говорит «в каком бою сейчас живой in-memory state».
        # Если он есть — игрока редиректим в Battle scene (тип определяется по mode).
        in_memory_battle = False
        try:
            from battle_system import battle_system
            bid = battle_system.battle_queue.get(uid)
            if bid and bid in battle_system.active_battles:
                b = battle_system.active_battles[bid]
                if b.get("battle_active"):
                    in_memory_battle = True
                    return {"ok": True, "type": "pvp", "scene": "Battle", "battle_id": bid}
        except Exception as e:
            log.warning("active_session battle check: %s", e)

        # 3. Если в памяти боя нет, НО БД говорит active (is_active=1 в endless
        # или run_active=1 в titan) — бой «потерян» (рестарт сервера / зомби-флаг).
        # Авто-проигрыш + cleanup, чтобы игрок не мог через 4 часа вернуться и
        # продолжить.
        try:
            r = db.get_endless_progress(uid) if hasattr(db, "get_endless_progress") else None
            if r and isinstance(r, dict) and r.get("is_active") and int(r.get("current_wave") or 0) > 0:
                if not in_memory_battle:
                    log.info("active_session: closing zombie endless run uid=%s wave=%s",
                             uid, r.get("current_wave"))
                    try: db.endless_on_loss(uid, int(r.get("current_wave") or 0))
                    except Exception as e: log.warning("endless_on_loss zombie: %s", e)
        except Exception as e:
            log.debug("active_session Natisk zombie check: %s", e)

        try:
            prog = db.get_titan_progress(uid)
            if prog and int((prog.get("run_active") or 0)) == 1 and not in_memory_battle:
                log.info("active_session: closing zombie titan run uid=%s", uid)
                try: db.titan_set_run_active(uid, 0)
                except Exception as e: log.warning("titan_set_run_active zombie: %s", e)
        except Exception as e:
            log.debug("active_session Titan zombie check: %s", e)

        return {"ok": True, "type": None, "scene": None}
