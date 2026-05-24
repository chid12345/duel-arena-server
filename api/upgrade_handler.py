"""Маршруты /api/upgrade/* — апгрейд предметов (система v2, без шардов)."""

from __future__ import annotations

import logging
import random

from fastapi import FastAPI, HTTPException

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from database import db
from db_schema.equipment_catalog import get_item
from economy.upgrades_formulas import (
    can_attempt_upgrade,
    free_roll_chance,
    free_roll_eligible,
    free_roll_max_per_item,
    upgrade_cost,
)

_log = logging.getLogger(__name__)


class _UpgradeBody(InitDataHeader):
    item_id: str


def _player_purse(uid: int) -> tuple[int, int, int]:
    """(level, gold, diamonds) одним SELECT."""
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT level, gold, diamonds FROM players WHERE user_id = ?", (uid,))
        row = cur.fetchone()
        if not row:
            return 1, 0, 0
        return int(row["level"] or 1), int(row["gold"] or 0), int(row["diamonds"] or 0)
    finally:
        conn.close()


def _charge(uid: int, amount: int, currency: str) -> bool:
    """Атомарно списать золото или алмазы. False если недостаточно."""
    if amount <= 0:
        return True
    col = "diamonds" if currency == "diamond" else "gold"  # whitelist, без инъекции
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE players SET {col} = {col} - ? WHERE user_id = ? AND {col} >= ?",
            (int(amount), uid, int(amount)),
        )
        ok = cur.rowcount > 0
        conn.commit()
        return ok
    finally:
        conn.close()


def register_upgrade_routes(app: FastAPI) -> None:

    @app.post("/api/upgrade/apply")
    def upgrade_apply(body: _UpgradeBody):
        """Попытка апгрейда. +1 гарантированно. Списывает золото или алмазы по
        уровню. С +61 есть шанс «бесплатного» апа (не больше 3 раз на вещь).
        """
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            _rl_check(uid, "upgrade", max_hits=10, window_sec=5)

            item = get_item(body.item_id)
            if not item:
                return {"ok": False, "reason": "Предмет не найден"}
            tier = item.get("tier")
            if not tier:
                return {"ok": False, "reason": "Legacy предмет не апгрейдится"}

            level, _gold, _diamonds = _player_purse(uid)
            current_plus = db.get_item_plus(uid, body.item_id)
            ok_check, reason = can_attempt_upgrade(item, current_plus, level)
            if not ok_check:
                return {"ok": False, "reason": reason}

            target_plus = current_plus + 1
            amount, currency = upgrade_cost(tier, target_plus)

            # «Доброе казино»: с +61 шанс бесплатного апа, лимит на вещь.
            free_used = db.get_item_free_used(uid, body.item_id)
            is_free = (
                free_roll_eligible(target_plus, free_used)
                and random.random() < free_roll_chance()
            )

            if not is_free and not _charge(uid, amount, currency):
                cur_word = "алмазов" if currency == "diamond" else "золота"
                return {"ok": False, "reason": f"Нужно {amount} {cur_word}"}

            gold_spent = amount if (not is_free and currency == "gold") else 0
            diamonds_spent = amount if (not is_free and currency == "diamond") else 0
            new_plus = db.record_upgrade(
                uid, body.item_id, gold_spent, diamonds_spent, was_free=is_free,
            )

            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "new_plus": new_plus,
                "was_free": is_free,
                "spent": 0 if is_free else amount,
                "currency": currency,
                "free_remaining": max(0, free_roll_max_per_item() - (free_used + (1 if is_free else 0))),
                "tier": tier,
                "player": _player_api(dict(player), eq_stats=db.get_equipment_stats(uid)),
            }
        except HTTPException:
            raise
        except Exception as e:
            _log.error("upgrade_apply error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.get("/api/upgrade/preview")
    def upgrade_preview(init_data: str, item_id: str):
        """Сводка по предмету для UI: текущий +N, цена и валюта следующего шага,
        доступность, инфо о бесплатном апе, кошелёк игрока. Без побочных эффектов.
        """
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            item = get_item(item_id)
            if not item:
                return {"ok": False, "reason": "Предмет не найден"}
            tier = item.get("tier")
            if not tier:
                return {"ok": False, "reason": "Legacy предмет не апгрейдится"}

            level, gold, diamonds = _player_purse(uid)
            current_plus = db.get_item_plus(uid, item_id)
            ok_check, reason = can_attempt_upgrade(item, current_plus, level)
            target_plus = current_plus + 1
            amount, currency = upgrade_cost(tier, target_plus) if ok_check else (0, "gold")
            free_used = db.get_item_free_used(uid, item_id)
            free_eligible = ok_check and free_roll_eligible(target_plus, free_used)
            return {
                "ok": True,
                "tier": tier,
                "current_plus": current_plus,
                "target_plus": target_plus if ok_check else None,
                "cost": amount,
                "currency": currency,
                "can_attempt": ok_check,
                "reason": reason if not ok_check else "",
                "free_chance": free_roll_chance() if free_eligible else 0.0,
                "free_remaining": max(0, free_roll_max_per_item() - free_used),
                "player_gold": gold,
                "player_diamonds": diamonds,
            }
        except Exception as e:
            _log.error("upgrade_preview error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.get("/api/upgrade/status")
    def upgrade_status(init_data: str):
        """Сводка: все +N игрока."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            return {"ok": True, "plus": db.get_all_item_plus(uid)}
        except Exception as e:
            _log.error("upgrade_status error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}
