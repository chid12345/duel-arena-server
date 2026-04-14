"""Пакет образов: каталог, бонусы, магазин, элит-билды."""

from __future__ import annotations

from repositories.avatars.bonus import AvatarsBonusMixin
from repositories.avatars.elite_ops import AvatarsEliteMixin
from repositories.avatars.helpers import AvatarsHelpersMixin
from repositories.avatars.migrate_bonus import AvatarsMigrateBonusMixin
from repositories.avatars.schema import AvatarsSchemaMixin
from repositories.avatars.shop import AvatarsShopMixin
from repositories.avatars.state import AvatarsStateMixin


class AvatarsMixin(
    AvatarsHelpersMixin,
    AvatarsSchemaMixin,
    AvatarsBonusMixin,
    AvatarsMigrateBonusMixin,
    AvatarsStateMixin,
    AvatarsShopMixin,
    AvatarsEliteMixin,
):
    """Mixin: операции по образам (классам) игрока."""
