"""Пакет world_boss — каталог типов боссов и справочники.

Старые общие константы остаются в `config/world_boss_constants.py`
(HP-формулы, расписание, коронные пороги). Этот пакет — новый дом
для типов боссов (Фаза 2.2).
"""
from __future__ import annotations

from .types import (
    WB_BOSS_TYPES,
    WB_BOSS_TYPE_BY_KEY,
    WB_DEFAULT_TYPE,
    roll_boss_type,
    get_boss_type,
)

__all__ = [
    "WB_BOSS_TYPES",
    "WB_BOSS_TYPE_BY_KEY",
    "WB_DEFAULT_TYPE",
    "roll_boss_type",
    "get_boss_type",
]
