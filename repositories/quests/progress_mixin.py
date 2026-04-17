"""Mixin: прогресс заданий — агрегатор.

Распилен на 4 дома (Закон 9):
  - progress_core    — CRUD task_progress/task_claims + трекинг
  - progress_achieve — достижения (_computed_values, claim тиров)
  - progress_daily   — ежедневные задания
  - progress_weekly  — недельные дополнительные задания

Фасад QuestsProgressMixin сохранён для обратной совместимости импорта
из repositories/quests/__init__.py.
"""
from __future__ import annotations

from repositories.quests.progress_core import ProgressCoreMixin
from repositories.quests.progress_achieve import ProgressAchieveMixin
from repositories.quests.progress_daily import ProgressDailyMixin
from repositories.quests.progress_weekly import ProgressWeeklyMixin


class QuestsProgressMixin(
    ProgressCoreMixin,
    ProgressAchieveMixin,
    ProgressDailyMixin,
    ProgressWeeklyMixin,
):
    """Объединённый миксин прогресса заданий."""
