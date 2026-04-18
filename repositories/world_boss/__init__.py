"""Мировой босс — репозитории (рейды, удары, состояние игрока, награды).

Смотри docs/WORLD_BOSS.md для правил фичи.
"""
from __future__ import annotations

from .spawns import WorldBossSpawnsMixin
from .spawns_lifecycle import WorldBossSpawnsLifecycleMixin
from .battle_state import WorldBossBattleStateMixin
from .hits import WorldBossHitsMixin
from .player_state import WorldBossPlayerStateMixin
from .player_state_aoe import WorldBossPlayerStateAoeMixin
from .raid_scroll_apply import WorldBossRaidScrollApplyMixin
from .rewards import WorldBossRewardsMixin
from .registration import WorldBossRegistrationMixin


class WorldBossMixin(
    WorldBossSpawnsMixin,
    WorldBossSpawnsLifecycleMixin,
    WorldBossBattleStateMixin,
    WorldBossHitsMixin,
    WorldBossPlayerStateMixin,
    WorldBossPlayerStateAoeMixin,
    WorldBossRaidScrollApplyMixin,
    WorldBossRewardsMixin,
    WorldBossRegistrationMixin,
):
    """Объединённый Mixin для всей системы Мирового босса."""


__all__ = ["WorldBossMixin"]
