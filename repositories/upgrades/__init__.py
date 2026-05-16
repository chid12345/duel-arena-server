"""Апгрейды предметов: +N, попытки, шарды (Этап 4 редизайна баланса)."""

from repositories.upgrades.materials_repo import MaterialsRepoMixin
from repositories.upgrades.upgrade_repo import UpgradeRepoMixin


class UpgradesMixin(UpgradeRepoMixin, MaterialsRepoMixin):
    """Композитный mixin для подключения в Database."""


__all__ = ["UpgradesMixin"]
