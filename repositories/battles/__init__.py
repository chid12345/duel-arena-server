"""Бои, ежедневные квесты, PvP очередь и вызовы по нику."""

from __future__ import annotations

from repositories.battles.daily_quests import BattlesDailyQuestsMixin
from repositories.battles.pvp_challenges import BattlesPvpChallengesMixin
from repositories.battles.pvp_queue import BattlesPvpQueueMixin
from repositories.battles.read import BattlesReadMixin
from repositories.battles.save import BattlesSaveMixin


class BattlesMixin(
    BattlesSaveMixin,
    BattlesReadMixin,
    BattlesDailyQuestsMixin,
    BattlesPvpQueueMixin,
    BattlesPvpChallengesMixin,
):
    """Mixin: сохранение/чтение боёв, квесты, PvP очередь/вызовы."""
