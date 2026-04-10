"""Игрок: CRUD, HP, бонусы, улучшения, поиск, Premium, wipe."""

from __future__ import annotations

from repositories.users.chat_id import UsersChatMixin
from repositories.users.daily_bonus import UsersDailyBonusMixin
from repositories.users.hp_regen import UsersHpRegenMixin
from repositories.users.improvements import UsersImprovementsMixin
from repositories.users.metrics import UsersMetricsMixin
from repositories.users.player_core import UsersPlayerCoreMixin
from repositories.users.premium import UsersPremiumMixin
from repositories.users.search import UsersSearchMixin
from repositories.users.wipe_leaderboard import UsersWipeLeaderboardMixin


class UsersMixin(
    UsersPlayerCoreMixin,
    UsersHpRegenMixin,
    UsersWipeLeaderboardMixin,
    UsersDailyBonusMixin,
    UsersImprovementsMixin,
    UsersChatMixin,
    UsersSearchMixin,
    UsersMetricsMixin,
    UsersPremiumMixin,
):
    """Mixin: всё про игрока — CRUD, HP, бонусы, улучшения, поиск, Premium."""
