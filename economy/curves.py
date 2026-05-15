"""
economy/curves.py — геттеры кривых баланса по уровню игрока.

Читает config/balance_curve.json (генерируется tools/balance_xlsx_export.py).
Кэшируется в памяти. Перезагрузка — load_curves(force=True).

Этап 1 редизайна баланса. Используется этапами 3 (магазин по уровням),
6 (PvP-брекеты), 7 (премиум).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CACHED: dict[str, Any] | None = None
_BY_LEVEL_INDEX: dict[int, dict[str, Any]] | None = None

_TIER_ORDER = ("T1", "T2", "T3", "T4")


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def curves_source_path() -> Path:
    return _project_root() / "config" / "balance_curve.json"


def _validate(data: dict[str, Any]) -> None:
    for key in ("anchor", "tier_thresholds", "pvp_brackets",
                "premium_effects", "upgrades", "sets", "by_level"):
        if key not in data:
            raise ValueError(f"balance_curve.json: нет раздела {key!r}")
    if not isinstance(data["by_level"], list) or not data["by_level"]:
        raise ValueError("balance_curve.json/by_level: ожидался непустой список")
    for t in _TIER_ORDER:
        if t not in data["tier_thresholds"]:
            raise ValueError(f"balance_curve.json/tier_thresholds: нет {t!r}")
    if len(data["pvp_brackets"]) != 4:
        raise ValueError("balance_curve.json/pvp_brackets: ожидалось ровно 4 брекета")


def load_curves(force: bool = False) -> dict[str, Any]:
    """Загрузить balance_curve.json (с кэшем). force=True — перечитать."""
    global _CACHED, _BY_LEVEL_INDEX
    if _CACHED is not None and not force:
        return _CACHED
    path = curves_source_path()
    if not path.exists():
        raise FileNotFoundError(
            f"Нет файла {path}. Запусти `python -m tools.balance_xlsx_export`."
        )
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    _validate(data)
    _CACHED = data
    _BY_LEVEL_INDEX = {row["level"]: row for row in data["by_level"]}
    return data


def _row_for(level: int) -> dict[str, Any]:
    load_curves()
    assert _BY_LEVEL_INDEX is not None
    max_lvl = max(_BY_LEVEL_INDEX)
    lvl = max(1, min(int(level), max_lvl))
    return _BY_LEVEL_INDEX[lvl]


# ── Сила / разблокировка / брекеты ────────────────────────────────────────────

def power_at(level: int) -> int:
    """Кумулятивная мощь персонажа на уровне (сумма stats_on_reach до уровня)."""
    return int(_row_for(level)["power"])


def tier_unlocked_at(level: int) -> str:
    """Самый высокий тир, доступный игроку на этом уровне (T1..T4)."""
    return str(_row_for(level)["tier_unlock"])


def tiers_available_at(level: int) -> list[str]:
    """Все тиры, доступные на этом уровне — список ['T1', 'T2', ...]."""
    return [str(t) for t in _row_for(level)["tiers_available"]]


def is_tier_unlocked(level: int, tier: str) -> bool:
    """Проверить, разблокирован ли указанный тир (T1..T4) на этом уровне."""
    if tier not in _TIER_ORDER:
        return False
    th = load_curves()["tier_thresholds"]
    return int(level) >= int(th[tier])


def pvp_bracket_at(level: int) -> int:
    """ID PvP-брекета (0..3) для уровня. 1-10 → 0, 11-25 → 1, 26-50 → 2, 51-80 → 3."""
    return int(_row_for(level)["pvp_bracket"])


def pvp_bracket_range(bracket_id: int) -> tuple[int, int]:
    """(min, max) уровней внутри брекета."""
    for b in load_curves()["pvp_brackets"]:
        if int(b["id"]) == int(bracket_id):
            return int(b["min"]), int(b["max"])
    raise ValueError(f"Неизвестный брекет {bracket_id!r}")


def pvp_xp_base(bracket_id: int) -> int:
    """База XP за PvP-победу в брекете (без модификаторов)."""
    for b in load_curves()["pvp_brackets"]:
        if int(b["id"]) == int(bracket_id):
            return int(b["xp_base"])
    raise ValueError(f"Неизвестный брекет {bracket_id!r}")


def pvp_gold_base(bracket_id: int) -> int:
    """База золота за PvP-победу в брекете."""
    for b in load_curves()["pvp_brackets"]:
        if int(b["id"]) == int(bracket_id):
            return int(b["gold_base"])
    raise ValueError(f"Неизвестный брекет {bracket_id!r}")


# ── Доход / прогресс ──────────────────────────────────────────────────────────

def gold_per_pu_at(level: int) -> int:
    """Сколько золота даёт 1 PU (≈1 час) фарма на уровне."""
    return int(_row_for(level)["gold_per_pu"])


def days_to_reach(level: int) -> float:
    """Сколько дней активной игры до достижения уровня (средний игрок)."""
    return float(_row_for(level)["days_to_reach"])


def max_level() -> int:
    return int(load_curves()["anchor"]["max_level"])


# ── Премиум / апгрейды / сеты ─────────────────────────────────────────────────

def premium_effects() -> dict[str, Any]:
    """Эффекты премиум-подписки (только время и удобство)."""
    return dict(load_curves()["premium_effects"])


def upgrades_config() -> dict[str, Any]:
    """Конфигурация апгрейдов: max_plus_per_tier, stat_step_pct, fail_chance_start."""
    return dict(load_curves()["upgrades"])


def sets_catalog() -> list[dict[str, Any]]:
    """Каталог сетов экипировки (id, name, emoji)."""
    return [dict(s) for s in load_curves()["sets"]]


if __name__ == "__main__":
    data = load_curves()
    print(f"Загружено: {curves_source_path()}")
    print(f"Версия:    {data.get('version')}")
    print(f"Анкер:     {data['anchor']}")
    print(f"Уровней:   {len(data['by_level'])}")
    print(f"Дней до 80 (расчёт): {days_to_reach(80)}")
