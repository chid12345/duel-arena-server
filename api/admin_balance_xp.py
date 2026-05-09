"""
api/admin_balance_xp.py — XP-часть админ-панели балансной сетки.

Отделено от admin_balance.py для соблюдения Закона 1 (≤200 строк/файл).
Регистрирует endpoint POST /api/admin/balance/save_xp и предоставляет
функцию build_xp_audit() для общего payload.
"""

from __future__ import annotations

import json
import logging
from typing import Callable

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_ALLOWED_XP_KEYS = {
    "XP_BASE_WIN", "XP_GROWTH_START", "XP_GROWTH_RATE", "XP_GROWTH_POWER",
    "XP_DEFEAT_FRACTION", "XP_TO_NEXT_BASE", "XP_TO_NEXT_LIN",
    "XP_TO_NEXT_BREAK1", "XP_TO_NEXT_BREAK2",
    "XP_TO_NEXT_BREAK1_BONUS", "XP_TO_NEXT_BREAK2_BONUS",
    "PREMIUM_XP_BUFF", "MAX_LEVEL",
}


class XpUpdate(BaseModel):
    init_data: str = ""
    token: str = ""
    anchor: dict | None = None


class SeasonPassUpdate(BaseModel):
    init_data: str = ""
    token: str = ""
    points_for_action: dict | None = None
    rewards_grid: dict | None = None  # {"5": {"free": {...}, "premium": {...}}, ...}


_ALLOWED_POINTS_KEYS = {
    "pvp_win", "pvp_loss", "pve_bot_win",
    "daily_quest", "weekly_quest", "achievement",
    "wb_hit", "wb_top_damage", "wb_last_hit",
    "tower_floor", "endless_wave",
}
_ALLOWED_REWARD_FIELDS = {"gold", "diamond", "item"}


def build_season_pass_audit() -> dict:
    """Сезонный пасс — текущий сезон, конфиг, награды."""
    from repositories.season_pass.config_loader import (
        get_pass_max_level, get_points_per_level,
        get_points_for_action, get_rewards_grid, get_premium_subscription_config,
        get_current_season_config,
    )
    from database import db

    season = None
    try:
        season = db.get_active_bp_season()
    except Exception as e:
        logger.warning("get_active_bp_season failed: %s", e)

    actions = ("pvp_win", "pvp_loss", "pve_bot_win", "daily_quest",
               "weekly_quest", "achievement", "wb_hit", "wb_top_damage",
               "wb_last_hit", "tower_floor", "endless_wave")
    points = {a: get_points_for_action(a) for a in actions}

    grid = get_rewards_grid()
    levels = []
    for k, v in grid.items():
        if k.isdigit():
            levels.append({
                "level": int(k),
                "free": v.get("free", {}),
                "premium": v.get("premium", {}),
            })
    levels.sort(key=lambda x: x["level"])

    return {
        "active_season": season,
        "season_config": get_current_season_config(),
        "pass_config": {
            "max_level": get_pass_max_level(),
            "points_per_level": get_points_per_level(),
        },
        "points_for_action": points,
        "rewards_levels": levels,
        "premium_subscription": get_premium_subscription_config(),
    }


def build_xp_audit() -> dict:
    """Собрать XP-часть payload для общего audit endpoint."""
    from economy.xp_formulas import xp_per_win, xp_to_next, xp_for_task, load_xp_economy
    from reward_calculator import REWARD_TABLE

    xp_levels = []
    try:
        from progression_loader.accessors import _PROGRESSION
        actual_win = _PROGRESSION.get("xp_per_win", [])
        actual_next = _PROGRESSION.get("xp_to_next", [])
        max_level = int(_PROGRESSION.get("max_level", 80))
        show_set = set(range(1, 11))
        show_set.update([15, 20, 25, 30, 40, 50, 60, 70, 80, max_level])
        for lv in sorted(lv for lv in show_set if 1 <= lv <= max_level):
            idx = lv - 1
            xp_levels.append({
                "level": lv,
                "actual_win": actual_win[idx] if idx < len(actual_win) else 0,
                "formula_win": xp_per_win(lv),
                "actual_next": actual_next[idx] if idx < len(actual_next) else 0,
                "formula_next": xp_to_next(lv),
            })
    except Exception as e:
        logger.warning("xp progression audit error: %s", e)

    xp_quests = []
    for (freq, diff), tup in sorted(REWARD_TABLE.items()):
        actual_xp = tup[2] if len(tup) > 2 else 0
        xp_quests.append({
            "freq": freq, "diff": diff,
            "actual": actual_xp,
            "formula": xp_for_task(diff, freq),
        })

    return {
        "xp_levels": xp_levels,
        "xp_quests": xp_quests,
        "xp_anchor": load_xp_economy().get("anchor", {}),
    }


def _save_season_pass_config(payload: SeasonPassUpdate) -> dict:
    """Применить правки к config/season_pass.json. Возвращает обновлённый словарь."""
    from repositories.season_pass.config_loader import (
        _config_path, load_season_pass_config, reset_config_cache,
    )
    current = load_season_pass_config()
    new_data = json.loads(json.dumps(current))

    if payload.points_for_action:
        for k, v in payload.points_for_action.items():
            if k not in _ALLOWED_POINTS_KEYS:
                raise HTTPException(status_code=400, detail=f"Неизвестное действие: {k}")
            if not isinstance(v, (int, float)) or v < 0:
                raise HTTPException(status_code=400, detail=f"points_for_action/{k}: число ≥0")
            new_data.setdefault("points_for_action", {})[k] = int(v)

    if payload.rewards_grid:
        for level_str, cell in payload.rewards_grid.items():
            if not str(level_str).isdigit():
                continue
            for track in ("free", "premium"):
                track_data = cell.get(track)
                if track_data is None:
                    continue
                clean = {}
                for f, val in track_data.items():
                    if f not in _ALLOWED_REWARD_FIELDS:
                        continue
                    if f in ("gold", "diamond"):
                        if not isinstance(val, (int, float)) or val < 0:
                            raise HTTPException(status_code=400, detail=f"reward/{level_str}/{track}/{f}: число ≥0")
                        if int(val) > 0:
                            clean[f] = int(val)
                    elif f == "item":
                        if val:
                            clean[f] = str(val)
                if clean:
                    new_data.setdefault("rewards_grid", {}).setdefault(str(level_str), {})[track] = clean

    with _config_path().open("w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    reset_config_cache()
    return new_data


def register_save_xp(app: FastAPI, auth_check: Callable[[str, str], int]) -> None:
    """Регистрирует:
      POST /api/admin/balance/save_xp
      POST /api/admin/balance/save_season_pass
    auth_check(init_data, token) — функция авторизации из admin_balance."""

    @app.post("/api/admin/balance/save_season_pass", tags=["admin"])
    def save_season_pass(body: SeasonPassUpdate):
        uid = auth_check(body.init_data, body.token)
        if not body.points_for_action and not body.rewards_grid:
            raise HTTPException(status_code=400, detail="Нет данных для сохранения")
        new_data = _save_season_pass_config(body)
        logger.info("admin_balance: season_pass.json обновлён uid=%s", uid)
        return {"ok": True, "version": new_data.get("version", 1)}

    @app.post("/api/admin/balance/save_xp", tags=["admin"])
    def save_xp(body: XpUpdate):
        uid = auth_check(body.init_data, body.token)
        if not body.anchor:
            raise HTTPException(status_code=400, detail="Нет данных для сохранения")
        from economy.xp_formulas import xp_economy_path, reset_xp_cache, load_xp_economy
        current = load_xp_economy()
        new_data = json.loads(json.dumps(current))
        for k, v in body.anchor.items():
            if k not in _ALLOWED_XP_KEYS:
                raise HTTPException(status_code=400, detail=f"Неизвестный ключ XP: {k}")
            if not isinstance(v, (int, float)) or v < 0:
                raise HTTPException(status_code=400, detail=f"XP/{k}: число ≥0")
            new_data["anchor"][k] = float(v)
        with xp_economy_path().open("w", encoding="utf-8") as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        reset_xp_cache()
        logger.info("admin_balance: xp_economy.json обновлён uid=%s", uid)
        return {"ok": True, "version": new_data.get("version", 1)}
