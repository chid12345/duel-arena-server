"""Маршруты /api/upgrade/* — попытка апгрейда, разборка, статус (Этап 4D)."""

from __future__ import annotations

import logging
import random

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from database import db
from db_schema.equipment_catalog import get_item
from economy.level_pricing import shop_price
from economy.upgrades_formulas import (
    can_attempt_upgrade,
    cost_to_upgrade_gold,
    dismantle_shards_for,
    shards_cost_for,
    success_chance,
)

_log = logging.getLogger(__name__)


class _UpgradeBody(InitDataHeader):
    item_id: str


def _player_level_and_gold(uid: int) -> tuple[int, int]:
    """(level, gold) одним SELECT."""
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT level, gold FROM players WHERE user_id = ?", (uid,))
        row = cur.fetchone()
        if not row:
            return 1, 0
        return int(row["level"] or 1), int(row["gold"] or 0)
    finally:
        conn.close()


def _charge_gold(uid: int, cost: int) -> bool:
    """Атомарно списать золото. False если недостаточно."""
    if cost <= 0:
        return True
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
            (int(cost), uid, int(cost)),
        )
        ok = cur.rowcount > 0
        conn.commit()
        return ok
    finally:
        conn.close()


def register_upgrade_routes(app: FastAPI) -> None:

    @app.post("/api/upgrade/apply")
    def upgrade_apply(body: _UpgradeBody):
        """Попытка апгрейда предмета. Списывает золото и шарды атомарно.
        При успехе → plus + 1. При провале → потеря денег и шардов, plus не меняется.
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
                return {"ok": False, "reason": "Legacy предмет не поддерживает апгрейды"}

            current_plus = db.get_item_plus(uid, body.item_id)
            ok_check, reason = can_attempt_upgrade(item, current_plus)
            if not ok_check:
                return {"ok": False, "reason": reason}

            target_plus = current_plus + 1
            base_gold = shop_price(item, "gold")  # базовая цена предмета в золоте
            gold_cost = cost_to_upgrade_gold(base_gold, target_plus)
            shards_cost = shards_cost_for(target_plus)

            # 1) Списать шарды атомарно (вернёт False если недостаточно)
            if not db.consume_shards(uid, tier, shards_cost):
                have = db.get_shards(uid, tier)
                return {"ok": False, "reason": f"Нужно {shards_cost} шардов {tier}, у вас {have}"}

            # 2) Списать золото атомарно. Если не хватило — вернуть шарды.
            if not _charge_gold(uid, gold_cost):
                db.add_shards(uid, tier, shards_cost)  # рефанд шардов
                _, have_gold = _player_level_and_gold(uid)
                return {"ok": False, "reason": f"Нужно {gold_cost} золота, у вас {have_gold}"}

            # 3) Ролл шанса
            chance = success_chance(target_plus)
            roll_success = random.random() < chance

            # 4) Запись попытки в item_upgrades
            new_plus = db.record_upgrade_attempt(
                uid, body.item_id, gold_cost, shards_cost, roll_success,
            )

            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "success": roll_success,
                "new_plus": new_plus,
                "gold_spent": gold_cost,
                "shards_spent": shards_cost,
                "chance_was": chance,
                "tier": tier,
                "player": _player_api(dict(player)),
                "shards": db.get_all_shards(uid),
            }
        except Exception as e:
            _log.error("upgrade_apply error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.post("/api/upgrade/dismantle")
    def upgrade_dismantle(body: _UpgradeBody):
        """Разобрать предмет на шарды. Снимает (если надет) + удаляет +N + выдаёт шарды."""
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            _rl_check(uid, "upgrade", max_hits=10, window_sec=5)

            item = get_item(body.item_id)
            if not item:
                return {"ok": False, "reason": "Предмет не найден"}
            tier = item.get("tier")
            if not tier:
                return {"ok": False, "reason": "Legacy предмет нельзя разобрать"}

            # Снять если надет (любой слот)
            equipped = db.get_equipment(uid)
            for slot, eq_item in equipped.items():
                if eq_item.get("item_id") == body.item_id:
                    db.unequip_item(uid, slot)
                    break

            shards = dismantle_shards_for(tier)
            db.add_shards(uid, tier, shards)
            db.reset_item_plus(uid, body.item_id)

            _cache_invalidate(uid)
            return {
                "ok": True,
                "shards_gained": shards,
                "tier": tier,
                "shards": db.get_all_shards(uid),
            }
        except Exception as e:
            _log.error("upgrade_dismantle error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.get("/api/upgrade/status")
    def upgrade_status(init_data: str):
        """Сводка: все +N игрока + все шарды."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            return {
                "ok": True,
                "plus": db.get_all_item_plus(uid),
                "shards": db.get_all_shards(uid),
            }
        except Exception as e:
            _log.error("upgrade_status error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}
