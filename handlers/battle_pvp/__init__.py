"""Поиск боя, PvP очередь, уведомление второго игрока, бой с ботом."""

from __future__ import annotations

import handlers.battle_pvp.bot_start  # noqa: F401 — до cancel_fallback (_start_bot_battle)
import handlers.battle_pvp.cancel_fallback  # noqa: F401
import handlers.battle_pvp.find_queue  # noqa: F401
import handlers.battle_pvp.push_other  # noqa: F401
