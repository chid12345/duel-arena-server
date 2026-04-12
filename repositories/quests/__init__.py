"""Система заданий и достижений Duel Arena."""
from __future__ import annotations

from .progress_mixin import QuestsProgressMixin
from .streak_mixin import QuestsStreakMixin


class QuestsMixin(QuestsProgressMixin, QuestsStreakMixin):
    """Объединённый Mixin для всей системы заданий."""


__all__ = ["QuestsMixin"]
