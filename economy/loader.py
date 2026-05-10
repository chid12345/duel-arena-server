"""
economy/loader.py — загрузка и валидация config/economy.json.

Кэшируется в памяти. Перезагрузка через `load_economy(force=True)`.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CACHED: dict[str, Any] | None = None
_SOURCE: Path | None = None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def economy_source_path() -> Path:
    return _project_root() / "config" / "economy.json"


def _validate(data: dict[str, Any]) -> None:
    required_top = ("anchor", "difficulty_pu", "frequency_mult",
                    "rarity_mult", "tier_mult", "reward_split")
    for key in required_top:
        if key not in data:
            raise ValueError(f"economy.json: отсутствует раздел {key!r}")

    required_anchor = (
        "PU_TO_GOLD", "GOLD_TO_DIAMOND", "STAR_TO_DIAMOND", "USDT_TO_DIAMOND",
        "PVP_WIN_GOLD", "PVP_DEFEAT_GOLD", "DAILY_BONUS_GOLD",
        "PREMIUM_GOLD_BUFF", "PREMIUM_XP_BUFF",
        "BOX_EV_RATIO", "BOX_JACKPOT_BUDGET",
    )
    anchor = data["anchor"]
    for key in required_anchor:
        if key not in anchor:
            raise ValueError(f"economy.json/anchor: отсутствует {key!r}")
        val = anchor[key]
        if not isinstance(val, (int, float)) or val < 0:
            raise ValueError(f"economy.json/anchor/{key}: ожидалось число ≥0, получено {val!r}")

    for diff in ("easy", "medium", "hard", "epic"):
        if diff not in data["difficulty_pu"]:
            raise ValueError(f"economy.json/difficulty_pu: нет {diff!r}")
    for freq in ("daily", "weekly", "once"):
        if freq not in data["frequency_mult"]:
            raise ValueError(f"economy.json/frequency_mult: нет {freq!r}")
        if freq not in data["reward_split"]:
            raise ValueError(f"economy.json/reward_split: нет {freq!r}")
    for r in ("common", "rare", "epic", "legendary"):
        if r not in data["rarity_mult"]:
            raise ValueError(f"economy.json/rarity_mult: нет {r!r}")
    for t in ("T1", "T2", "T3", "T4"):
        if t not in data["tier_mult"]:
            raise ValueError(f"economy.json/tier_mult: нет {t!r}")


def load_economy(force: bool = False) -> dict[str, Any]:
    """Загрузить economy.json (с кэшем). force=True — перечитать с диска."""
    global _CACHED, _SOURCE
    if _CACHED is not None and not force:
        return _CACHED

    path = economy_source_path()
    if not path.exists():
        raise FileNotFoundError(f"Нет файла {path}")

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    _validate(data)
    _CACHED = data
    _SOURCE = path
    return data


# ── Удобные геттеры ───────────────────────────────────────────────────────────

def get_anchor(key: str) -> float:
    return float(load_economy()["anchor"][key])


def get_difficulty_pu(difficulty: str) -> float:
    return float(load_economy()["difficulty_pu"][difficulty])


def get_frequency_mult(frequency: str) -> float:
    return float(load_economy()["frequency_mult"][frequency])


def get_reward_split(frequency: str) -> dict[str, float]:
    return dict(load_economy()["reward_split"][frequency])


def get_rarity_mult(rarity: str) -> float:
    return float(load_economy()["rarity_mult"][rarity])


def get_tier_mult(tier: str) -> float:
    return float(load_economy()["tier_mult"][tier])


def get_price_factor(currency: str) -> float:
    """Множитель формулы цен для конкретной валюты.
    Default 0.05 для совместимости, если price_factor отсутствует в economy.json."""
    factors = load_economy().get("price_factor")
    if not factors:
        return 0.05
    return float(factors.get(currency, factors.get("gold", 0.05)))


def get_reward_grid_cell(frequency: str, difficulty: str) -> tuple[int, int] | None:
    """Калиброванная награда для существующих квестов (gold, diamonds).
    Возвращает None если клетка не задана — тогда вызывающий считает по формуле."""
    grid = load_economy().get("reward_grid")
    if not grid or frequency not in grid or difficulty not in grid[frequency]:
        return None
    cell = grid[frequency][difficulty]
    return int(cell[0]), int(cell[1])


if __name__ == "__main__":
    data = load_economy()
    print(f"Загружено: {economy_source_path()}")
    print(f"Версия:    {data.get('version')}")
    print(f"Анкер:     {data['anchor']}")
