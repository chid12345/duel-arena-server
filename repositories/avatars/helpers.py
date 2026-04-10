"""Каталог образов и утилиты."""

from __future__ import annotations

from typing import Any, Dict

from config import AVATAR_CATALOG, AVATAR_SCALE_EVERY_LEVELS, AVATAR_SCALE_MAX_BONUS


class AvatarsHelpersMixin:
    _BASE_AVATAR_IDS = ("base_tank", "base_rogue", "base_crit", "base_neutral")
    _ELITE_FREE_POINTS = 19
    _ELITE_FIXED_ENDURANCE = 5

    @staticmethod
    def _avatar_map() -> Dict[str, Dict[str, Any]]:
        return {a["id"]: dict(a) for a in AVATAR_CATALOG}

    @staticmethod
    def _row_get(row: Any, key: str, default: Any = None) -> Any:
        if row is None:
            return default
        if isinstance(row, dict):
            return row.get(key, default)
        try:
            return row[key]
        except Exception:
            return default

    @staticmethod
    def _scale_bonus(level: int) -> int:
        step = max(1, int(AVATAR_SCALE_EVERY_LEVELS))
        cap = max(0, int(AVATAR_SCALE_MAX_BONUS))
        return min(cap, max(0, int(level)) // step)
