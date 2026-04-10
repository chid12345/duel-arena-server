"""
Загрузка таблицы прокачки из progression_100_levels_v4/progression.json.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_JSON = os.path.join(_DIR, "progression_100_levels_v4", "progression.json")

logger = logging.getLogger(__name__)

_MAX_LEVEL_FALLBACK = 100
_EXP_NEED_LEGACY = [30, 80, 150, 200]


def _legacy_exp_need(lv: int) -> int:
    if lv >= _MAX_LEVEL_FALLBACK:
        return 0
    if lv < len(_EXP_NEED_LEGACY):
        return _EXP_NEED_LEGACY[lv]
    return 250 + (lv - 4) * 50


def _legacy_gold_on_reach(new_level: int) -> int:
    return 90 + 10 * int(new_level)


def _build_builtin_table() -> Dict[str, Any]:
    xp_full: List[int] = []
    for lv in range(100):
        xp_full.append(_legacy_exp_need(lv))
    xp_to_next = xp_full[1:100]
    xp_per_win = [1] * 100
    steps_per_level = [2] * 99
    stats_on_reach = [0] * 101
    gold_on_reach = [0] * 101
    hp_on_reach = [0] * 101
    for L in range(1, 101):
        stats_on_reach[L] = 5
        gold_on_reach[L] = _legacy_gold_on_reach(L)
        hp_on_reach[L] = 11
    return {
        "version": 5,
        "max_level": 100,
        "xp_to_next": xp_to_next,
        "xp_per_win": xp_per_win,
        "steps_per_level": steps_per_level,
        "stats_on_reach": stats_on_reach,
        "gold_on_reach": gold_on_reach,
        "hp_on_reach": hp_on_reach,
    }


def _validate(data: Dict[str, Any]) -> Tuple[bool, str]:
    try:
        ml = int(data.get("max_level", 100))
        if ml < 1 or ml > 200:
            return False, "max_level должен быть от 1 до 200"

        xp_to_next = data.get("xp_to_next")
        if not isinstance(xp_to_next, list) or len(xp_to_next) != ml - 1:
            return False, f"xp_to_next должен быть list длины {ml - 1} (переходы 1→2 … {ml-1}→{ml})"

        xp_per_win = data.get("xp_per_win")
        if not isinstance(xp_per_win, list) or len(xp_per_win) != ml:
            return False, f"xp_per_win должен быть list длины {ml} (ур. 1…{ml})"

        steps = data.get("steps_per_level")
        if not isinstance(steps, list) or len(steps) != ml - 1:
            return False, f"steps_per_level должен быть list длины {ml - 1}"
        for i, s in enumerate(steps):
            si = int(s)
            if si < 1 or si > 16:
                return False, f"steps_per_level[{i}] должен быть от 1 до 16"

        for key in ("stats_on_reach", "gold_on_reach", "hp_on_reach"):
            arr = data[key]
            if not isinstance(arr, list) or len(arr) != ml + 1:
                return False, f"{key} должен быть list длины {ml + 1} (0..{ml})"

        dia = data.get("diamonds_on_reach")
        if dia is not None and (not isinstance(dia, list) or len(dia) != ml + 1):
            return False, f"diamonds_on_reach должен быть list длины {ml + 1} (0..{ml})"

        for i in range(ml - 1):
            v = int(xp_to_next[i])
            if v < 1:
                return False, f"xp_to_next[{i}] должен быть >= 1"

        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, str(e)


_LOADED_FROM_PATH: Optional[str] = None


def load_progression_table(path: Optional[str] = None) -> Dict[str, Any]:
    """Загрузить таблицу; при ошибке — fallback."""
    global _LOADED_FROM_PATH
    p = path or _DEFAULT_JSON
    if os.path.isfile(p):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            ok, err = _validate(data)
            if ok:
                _LOADED_FROM_PATH = p
                return data
            logger.warning("progression.json: %s — %s", p, err)
            logger.warning("Используется встроенная таблица прокачки (fallback).")
        except OSError as e:
            logger.warning("Не читается %s: %s — fallback.", p, e)
        except json.JSONDecodeError as e:
            logger.warning("JSON в %s: %s — fallback.", p, e)
    else:
        logger.warning("Файл таблицы не найден: %s — fallback.", p)
    _LOADED_FROM_PATH = None
    return _build_builtin_table()


_PROGRESSION: Dict[str, Any] = load_progression_table()
