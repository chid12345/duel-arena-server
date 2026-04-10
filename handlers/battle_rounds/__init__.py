"""Механика ходов: таймер, выбор зоны, автоход, статы соперника."""

from __future__ import annotations

import handlers.battle_rounds.round_submit  # noqa: F401 — до refresh/choice (_handle_round_submitted)
import handlers.battle_rounds.dispatch_job  # noqa: F401
import handlers.battle_rounds.refresh_opponent_auto  # noqa: F401
import handlers.battle_rounds.choice  # noqa: F401
