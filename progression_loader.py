"""
Р—Р°РіСЂСѓР·РєР° С‚Р°Р±Р»РёС†С‹ РїСЂРѕРєР°С‡РєРё РёР· progression_100_levels_v4/progression.json.
РЈСЂРѕРІРЅРё РІ РёРіСЂРµ 1вЂ¦max_level; xp_to_next вЂ” 99 Р·РЅР°С‡РµРЅРёР№ (РїРµСЂРµС…РѕРґС‹ 1в†’2 вЂ¦ 99в†’100);
xp_per_win вЂ” 100 Р·РЅР°С‡РµРЅРёР№ (РїРѕРєР° РёРіСЂРѕРє РЅР° СѓСЂ. 1вЂ¦100);
steps_per_level вЂ” 99 Р·РЅР°С‡РµРЅРёР№: СЃРєРѕР»СЊРєРѕ В«Р°РїРѕРІВ» (+1 СЃРІРѕР±РѕРґРЅС‹Р№ СЃС‚Р°С‚) РЅР° РїРѕР»РѕСЃРєРµ РґРѕ СЃР»РµРґ. СѓСЂРѕРІРЅСЏ.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

_DIR = os.path.dirname(os.path.abspath(__file__))
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
        if ml < 1 or ml > 100:
            return False, "max_level РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕС‚ 1 РґРѕ 100"

        xp_to_next = data.get("xp_to_next")
        if not isinstance(xp_to_next, list) or len(xp_to_next) != 99:
            return False, "xp_to_next РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ list РґР»РёРЅС‹ 99 (РїРµСЂРµС…РѕРґС‹ 1в†’2 вЂ¦ 99в†’100)"

        xp_per_win = data.get("xp_per_win")
        if not isinstance(xp_per_win, list) or len(xp_per_win) != 100:
            return False, "xp_per_win РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ list РґР»РёРЅС‹ 100 (СѓСЂ. 1вЂ¦100)"

        steps = data.get("steps_per_level")
        if not isinstance(steps, list) or len(steps) != 99:
            return False, "steps_per_level РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ list РґР»РёРЅС‹ 99"
        for i, s in enumerate(steps):
            si = int(s)
            if si < 1 or si > 16:
                return False, f"steps_per_level[{i}] РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕС‚ 1 РґРѕ 8"

        for key in ("stats_on_reach", "gold_on_reach", "hp_on_reach"):
            arr = data[key]
            if not isinstance(arr, list) or len(arr) != 101:
                return False, f"{key} РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ list РґР»РёРЅС‹ 101 (0..100)"

        for i in range(ml - 1):
            v = int(xp_to_next[i])
            if v < 1:
                return False, f"xp_to_next[{i}] РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ >= 1"

        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, str(e)


_LOADED_FROM_PATH: Optional[str] = None


def load_progression_table(path: Optional[str] = None) -> Dict[str, Any]:
    """Р—Р°РіСЂСѓР·РёС‚СЊ С‚Р°Р±Р»РёС†Сѓ; РїСЂРё РѕС€РёР±РєРµ вЂ” fallback."""
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
            logger.warning("progression.json: %s вЂ” %s", p, err)
            logger.warning("РСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РІСЃС‚СЂРѕРµРЅРЅР°СЏ С‚Р°Р±Р»РёС†Р° РїСЂРѕРєР°С‡РєРё (fallback).")
        except OSError as e:
            logger.warning("РќРµ С‡РёС‚Р°РµС‚СЃСЏ %s: %s вЂ” fallback.", p, e)
        except json.JSONDecodeError as e:
            logger.warning("JSON РІ %s: %s вЂ” fallback.", p, e)
    else:
        logger.warning("Р¤Р°Р№Р» С‚Р°Р±Р»РёС†С‹ РЅРµ РЅР°Р№РґРµРЅ: %s вЂ” fallback.", p)
    _LOADED_FROM_PATH = None
    return _build_builtin_table()


_PROGRESSION: Dict[str, Any] = load_progression_table()


def progression_source_path() -> Optional[str]:
    return _LOADED_FROM_PATH


def describe_progression_summary() -> str:
    ml = int(_PROGRESSION.get("max_level", 100))
    v = int(_PROGRESSION.get("version", 0))
    xp1 = int(_PROGRESSION["xp_to_next"][0])
    win1 = int(_PROGRESSION["xp_per_win"][0])
    ap1 = int(_PROGRESSION.get("steps_per_level", [2] * 99)[0])
    src = _LOADED_FROM_PATH or "РІСЃС‚СЂРѕРµРЅРЅР°СЏ С‚Р°Р±Р»РёС†Р°"
    return (
        f"v{v}, max_level={ml}, РёСЃС‚РѕС‡РЅРёРє={src}; "
        f"СѓСЂ.1: +{win1} XP Р·Р° РїРѕР±РµРґСѓ, РґРѕ СѓСЂ.2 РЅСѓР¶РЅРѕ {xp1} XP; Р°РїРѕРІ РЅР° РїРѕР»РѕСЃРєРµ: {ap1}"
    )


def get_table() -> Dict[str, Any]:
    return _PROGRESSION


def exp_needed_for_next_level(current_level: int) -> int:
    """РЎРєРѕР»СЊРєРѕ XP РЅР° С‚РµРєСѓС‰РµР№ РїРѕР»РѕСЃРєРµ РґРѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРІРЅСЏ (С‚РµРєСѓС‰РёР№ СѓСЂ. 1вЂ¦99)."""
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
    """РћРїС‹С‚ Р·Р° РїРѕР±РµРґСѓ, РїРѕРєР° РёРіСЂРѕРє РЅР° СѓСЂРѕРІРЅРµ current_level (1вЂ¦max)."""
    ml = max_level_from_table()
    lv = max(1, min(ml, int(current_level)))
    arr: List[int] = _PROGRESSION["xp_per_win"]
    return int(arr[lv - 1])


def intermediate_ap_steps_for_level(current_level: int) -> int:
    """РЎРєРѕР»СЊРєРѕ РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅС‹С… +1 СЃС‚Р°С‚Р° РЅР° РїРѕР»РѕСЃРєРµ (СѓСЂ. 1вЂ¦99)."""
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


def max_level_from_table() -> int:
    return int(_PROGRESSION.get("max_level", 100))
