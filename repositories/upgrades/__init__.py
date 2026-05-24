"""Апгрейды предметов: уровень вещи +N (система v2, без шардов)."""

from repositories.upgrades.upgrade_repo import UpgradeRepoMixin


class UpgradesMixin(UpgradeRepoMixin):
    """Композитный mixin для подключения в Database."""


__all__ = ["UpgradesMixin"]
