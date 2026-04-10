"""Чтение полей таблицы прокачки (после load_validate)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from progression_loader.load_validate import _LOADED_FROM_PATH, _PROGRESSION


def progression_source_path() -> Optional[str]:
    return _LOADED_FROM_PATH


def describe_progression_summary() -> str:
    ml = int(_PROGRESSION.get("max_level", 100))
    v = int(_PROGRESSION.get("version", 0))
    xp1 = int(_PROGRESSION["xp_to_next"][0])
    win1 = int(_PROGRESSION["xp_per_win"][0])
    ap1 = int(_PROGRESSION.get("steps_per_level", [2] * 99)[0])
    src = _LOADED_FROM_PATH or "встроенная таблица"
    return (
        f"v{v}, max_level={ml}, источник={src}; "
        f"ур.1: +{win1} XP за победу, до ур.2 нужно {xp1} XP; апов на полоске: {ap1}"
    )


def get_table() -> Dict[str, Any]:
    return _PROGRESSION


def exp_needed_for_next_level(current_level: int) -> int:
    lv = max(1, int(current_level))
    ml = int(_PROGRESSION.get("max_level", 100))
    if lv >= ml:
        return 0
    arr: List[int] = _PROGRESSION["xp_to_next"]
    idx = lv - 1
    if idx < 0 or idx >= len(arr):
        return 0
    return int(arr[idx])


def victory_xp_for_player_level(current_level: int) -> int:
    ml = max_level_from_table()
    lv = max(1, min(ml, int(current_level)))
    arr: List[int] = _PROGRESSION["xp_per_win"]
    return int(arr[lv - 1])


def intermediate_ap_steps_for_level(current_level: int) -> int:
    ml = max_level_from_table()
    lv = int(current_level)
    if lv < 1 or lv >= ml:
        return 0
    arr: List[int] = _PROGRESSION.get("steps_per_level", [2] * 99)
    idx = lv - 1
    if idx < 0 or idx >= len(arr):
        return 2
    return max(1, min(16, int(arr[idx])))


def stats_when_reaching_level(new_level: int) -> int:
    L = int(new_level)
    ml = max_level_from_table()
    if L < 1 or L > ml:
        return 0
    arr: List[int] = _PROGRESSION["stats_on_reach"]
    return int(arr[L])


def gold_when_reaching_level(new_level: int) -> int:
    L = int(new_level)
    ml = max_level_from_table()
    if L < 1 or L > ml:
        return 0
    arr: List[int] = _PROGRESSION["gold_on_reach"]
    return int(arr[L])


def hp_when_reaching_level(new_level: int) -> int:
    L = int(new_level)
    ml = max_level_from_table()
    if L < 1 or L > ml:
        return 0
    arr: List[int] = _PROGRESSION["hp_on_reach"]
    return int(arr[L])


def diamonds_when_reaching_level(new_level: int) -> int:
    L = int(new_level)
    ml = max_level_from_table()
    if L < 1 or L > ml:
        return 0
    arr: List[int] = _PROGRESSION.get("diamonds_on_reach", [0] * (ml + 1))
    if L >= len(arr):
        return 0
    return int(arr[L])


def max_level_from_table() -> int:
    return int(_PROGRESSION.get("max_level", 100))
