"""POST /api/battle/timeout — игрок не успел сходить за отведённое время.

Честный пропуск (Вариант А): вместо случайного хода клиент сообщает серверу
«я не успел», сервер засчитывает пропуск (0 урона + чистый удар от соперника,
3 пропуска = поражение) и возвращает исход той же формы, что и /choice.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import BattleTimeoutBody
from api.tma_route_battle_flow._battle_outcome import deliver_battle_outcome


def register_battle_timeout_route(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
    _cache_invalidate: Callable[[int], None],
) -> None:
    @app.post("/api/battle/timeout")
    async def battle_timeout(body: BattleTimeoutBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "battle_timeout", max_hits=40, window_sec=60)

        if not manager.validate_session(uid, body.session_key):
            return {"ok": False, "error": "Игра открыта на другом устройстве. Обновите страницу."}

        bid = battle_system.battle_queue.get(uid)
        b = battle_system.active_battles.get(bid) if bid else None
        if not b or not b.get("battle_active"):
            return {"ok": True, "status": "no_battle"}

        serial = b.get("turn_serial", 0)
        result = await battle_system.process_turn_timeout(bid, serial)
        if not result:
            # Ничего не произошло (например, соперник уже сходил и раунд выполнился) — просто ждём.
            return {"ok": True, "status": "waiting_opponent"}

        return await deliver_battle_outcome(
            result, uid,
            db=db,
            battle_system=battle_system,
            _battle_state_api=_battle_state_api,
            _adapt_battle_result_for_user=_adapt_battle_result_for_user,
            _cache_invalidate=_cache_invalidate,
        )
