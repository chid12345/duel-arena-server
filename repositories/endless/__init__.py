"""Натиск (Endless): прогресс, попытки, квесты, топ."""

from __future__ import annotations

from repositories.endless.attempts import EndlessAttemptsMixin
from repositories.endless.progress_run import EndlessProgressRunMixin
from repositories.endless.top_weekly import EndlessTopWeeklyMixin


class EndlessMixin(EndlessProgressRunMixin, EndlessAttemptsMixin, EndlessTopWeeklyMixin):
    """Mixin: Натиск — прогресс волн, попытки, квесты, топ."""
