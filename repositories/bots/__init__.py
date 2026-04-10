"""Боты: генерация, ребаланс, поиск оппонента."""

from __future__ import annotations

from repositories.bots.generate import BotsGenerateMixin
from repositories.bots.lifecycle import BotsLifecycleMixin
from repositories.bots.match import BotsMatchMixin
from repositories.bots.stats import BotsStatsMixin


class BotsMixin(BotsStatsMixin, BotsGenerateMixin, BotsLifecycleMixin, BotsMatchMixin):
    """Mixin: генерация и управление ботами."""
