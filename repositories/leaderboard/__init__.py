"""PvP/Titan топы, недельные выплаты, weekly_claims."""

from __future__ import annotations

from repositories.leaderboard.elo_claims import LeaderboardEloClaimsMixin
from repositories.leaderboard.pvp_weekly import LeaderboardPvpWeeklyMixin
from repositories.leaderboard.weekly_payouts import LeaderboardWeeklyPayoutsMixin


class LeaderboardMixin(
    LeaderboardPvpWeeklyMixin,
    LeaderboardEloClaimsMixin,
    LeaderboardWeeklyPayoutsMixin,
):
    """Mixin: PvP/Titan топы, недельные выплаты, weekly_claims."""
