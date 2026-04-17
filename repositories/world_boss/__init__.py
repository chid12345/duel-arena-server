"""Мировой босс — репозитории (рейды, удары, состояние игрока, награды).

Смотри docs/WORLD_BOSS.md для правил фичи.
"""
from __future__ import annotations

from .spawns import WorldBossSpawnsMixin
from .battle_state import WorldBossBattleStateMixin
from .hits import WorldBossHitsMixin
from .player_state import WorldBossPlayerStateMixin
from .player_state_aoe import WorldBossPlayerStateAoeMixin
from .rewards import WorldBossRewardsMixin


class WorldBossMixin(
    WorldBossSpawnsMixin,
    WorldBossBattleStateMixin,
    WorldBossHitsMixin,
    WorldBossPlayerStateMixin,
    WorldBossPlayerStateAoeMixin,
    WorldBossRewardsMixin,
):
    """Объединённый Mixin для всей системы Мирового босса."""


__all__ = ["WorldBossMixin"]
