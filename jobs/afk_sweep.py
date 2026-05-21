"""Свипер зависших боёв мини-аппа (TMA): server-side засчёт пропуска хода.

Зачем: в боях мини-аппа серверный таймер хода (timer.py) не работает — он завязан
на Telegram (ui_message + бот). Если игрок закрыл приложение (особенно в PvP),
раунд некому продвинуть и соперник ждёт вечно. Этот свипер раз в несколько секунд
проходит активные TMA-бои и для просроченных вызывает process_turn_timeout
(наказание за пропуск: 0 урона + чистый удар, 3 пропуска = поражение).

Telegram-бои НЕ трогает (у них свой таймер) — опознаём по ui_message is None.
Босс — отдельная система, здесь не участвует (его боёв нет в active_battles).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Фора сверх дедлайна хода: даём клиенту шанс прислать ход самому,
# прежде чем сервер засчитает пропуск (анти-гонка с клиентским таймером).
AFK_SWEEP_GRACE_SECONDS = 3
AFK_SWEEP_INTERVAL_SECONDS = 3


async def afk_sweep_once(battle_system) -> int:
    """Один проход свипера. Возвращает число обработанных просроченных боёв."""
    now = datetime.now()
    processed = 0
    for battle_id, b in list(battle_system.active_battles.items()):
        try:
            if not b.get("battle_active"):
                continue
            # Telegram-бой ведёт собственный таймер хода — не вмешиваемся.
            if b.get("ui_message") is not None:
                continue
            if b.get("_afk_sweeping"):
                continue
            deadline = b.get("next_turn_deadline")
            if not deadline or now <= deadline + timedelta(seconds=AFK_SWEEP_GRACE_SECONDS):
                continue
            # Должен висеть хотя бы один: оба выставили ход → раунд уже должен был выполниться.
            if b.get("player1_choices") and b.get("player2_choices"):
                continue
            serial = b.get("turn_serial", 0)
            b["_afk_sweeping"] = True
            try:
                res = await battle_system.process_turn_timeout(battle_id, serial)
            finally:
                b["_afk_sweeping"] = False
            if res:
                processed += 1
        except Exception as e:
            logger.warning("afk_sweep_once: бой %s — ошибка: %s", battle_id, e)
    return processed
