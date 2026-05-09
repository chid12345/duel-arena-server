"""Загрузчик config/season_pass.json с кэшем."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CACHED: dict[str, Any] | None = None


def _config_path() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "config" / "season_pass.json"


def load_season_pass_config(force: bool = False) -> dict[str, Any]:
    global _CACHED
    if _CACHED is not None and not force:
        return _CACHED
    with _config_path().open("r", encoding="utf-8") as f:
        _CACHED = json.load(f)
    return _CACHED


def reset_config_cache() -> None:
    global _CACHED
    _CACHED = None


def get_current_season_config() -> dict[str, Any]:
    return dict(load_season_pass_config().get("current_season", {}))


def get_pass_max_level() -> int:
    return int(load_season_pass_config().get("pass", {}).get("max_level", 50))


def get_points_per_level() -> int:
    return int(load_season_pass_config().get("pass", {}).get("points_per_level", 100))


def get_points_for_action(action: str) -> int:
    """Сколько BP-очков начисляется за конкретное действие."""
    pts = load_season_pass_config().get("points_for_action", {})
    return int(pts.get(action, 0))


def get_rewards_grid() -> dict[str, dict]:
    """Награды по уровням пасса. Ключи — строки уровней ('1', '5', '10'…)."""
    return dict(load_season_pass_config().get("rewards_grid", {}))


def get_premium_subscription_config() -> dict[str, Any]:
    return dict(load_season_pass_config().get("premium_subscription", {}))


def get_reward_for_level(level: int, track: str) -> dict[str, Any]:
    """Вернуть награду {gold, diamond, item} для уровня и трека ('free' или 'premium')."""
    grid = get_rewards_grid()
    cell = grid.get(str(level), {})
    return dict(cell.get(track, {}))
