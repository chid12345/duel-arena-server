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
from db_schema.equipment_catalog import get_item, get_item_stats
from economy.upgrades_formulas import (
    can_attempt_upgrade,
    free_roll_chance,
    free_roll_eligible,
    free_roll_max_per_item,
    max_plus_for_player,
    plus_stats_for,
    upgrade_cost,
)

# Боевые статы для карточки апгрейда: поле → (подпись, %-стат?)
_STAT_LABELS = {
    "atk_bonus": ("Атака", False), "hp_bonus": ("HP", False),
    "crit_bonus": ("Крит", False), "str_bonus": ("Сила", False),
    "agi_bonus": ("Ловкость", False), "intu_bonus": ("Интуиция", False),
    "dodge_bonus": ("Уворот", False), "accuracy": ("Точность", False),
    "def_pct": ("Защита", True), "crit_resist_pct": ("Крит-защита", True),
    "lifesteal_pct": ("Вампиризм", True), "pen_pct": ("Пробитие", True),
}


def _stats_view(stats: dict) -> dict:
    """Только ненулевые боевые статы с подписями — для карточки апгрейда."""
    out = {}
    for field, (label, is_pct) in _STAT_LABELS.items():
        val = stats.get(field)
        if val:
            out[field] = {"label": label, "pct": is_pct,
                          "value": round(float(val) * 100, 1) if is_pct else int(round(float(val)))}
    return out

_log = logging.getLogger(__name__)


class _UpgradeBody(InitDataHeader):
    item_id: str


class _BatchBody(InitDataHeader):
    item_id: str
    count: int = 0  # сколько уровней; <=0 → «макс, что хватает денег/уровня»


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


def _refund(uid: int, amount: int, currency: str) -> None:
    """Вернуть золото/алмазы (откат частично снятого при сбое батча)."""
    if amount <= 0:
        return
    col = "diamonds" if currency == "diamond" else "gold"  # whitelist
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(f"UPDATE players SET {col} = {col} + ? WHERE user_id = ?", (int(amount), uid))
        conn.commit()
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
                uid, body.item_id, gold_spent=gold_spent, diamonds_spent=diamonds_spent,
                free_added=1 if is_free else 0,
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

    @app.post("/api/upgrade/apply_batch")
    def upgrade_apply_batch(body: _BatchBody):
        """Прокачать сразу несколько уровней за один запрос (кнопки +10/+25/Макс).

        count<=0 → «макс, что позволяют уровень и кошелёк». Считает суммарную цену
        по золоту/алмазам отдельно, учитывает бесплатные апы (с +61). Если денег
        хватает не на все — применяет столько, на сколько хватило.
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

            level, gold, diamonds = _player_purse(uid)
            cap = max_plus_for_player(level)
            plus = db.get_item_plus(uid, body.item_id)
            fu = db.get_item_free_used(uid, body.item_id)
            requested = body.count if body.count and body.count > 0 else (cap - plus)

            applied = gold_total = dia_total = free_added = 0
            budget_g, budget_d = gold, diamonds
            while applied < requested and plus < cap:
                target = plus + 1
                amount, currency = upgrade_cost(tier, target)
                if free_roll_eligible(target, fu) and random.random() < free_roll_chance():
                    fu += 1
                    free_added += 1
                elif currency == "gold":
                    if budget_g < amount:
                        break
                    budget_g -= amount
                    gold_total += amount
                else:
                    if budget_d < amount:
                        break
                    budget_d -= amount
                    dia_total += amount
                plus += 1
                applied += 1

            if applied == 0:
                reason = "Достигнут максимум" if db.get_item_plus(uid, body.item_id) >= cap else "Недостаточно средств"
                return {"ok": False, "reason": reason}

            if gold_total and not _charge(uid, gold_total, "gold"):
                return {"ok": False, "reason": "Недостаточно золота"}
            if dia_total and not _charge(uid, dia_total, "diamond"):
                _refund(uid, gold_total, "gold")  # откатить уже снятое золото
                return {"ok": False, "reason": "Недостаточно алмазов"}

            new_plus = db.record_upgrade(
                uid, body.item_id, levels=applied,
                gold_spent=gold_total, diamonds_spent=dia_total, free_added=free_added,
            )
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "new_plus": new_plus,
                "applied": applied,
                "gold_spent": gold_total,
                "diamonds_spent": dia_total,
                "freebies": free_added,
                "tier": tier,
                "player": _player_api(dict(player), eq_stats=db.get_equipment_stats(uid)),
            }
        except HTTPException:
            raise
        except Exception as e:
            _log.error("upgrade_apply_batch error: %s", e, exc_info=True)
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

            base_stats = get_item_stats(item_id)
            stats_now = plus_stats_for(base_stats, current_plus, tier=tier) if current_plus > 0 else base_stats
            stats_next = plus_stats_for(base_stats, target_plus, tier=tier) if ok_check else stats_now
            return {
                "ok": True,
                "tier": tier,
                "current_plus": current_plus,
                "target_plus": target_plus if ok_check else None,
                "max_plus": max_plus_for_player(level),
                "cost": amount,
                "currency": currency,
                "can_attempt": ok_check,
                "reason": reason if not ok_check else "",
                "free_chance": free_roll_chance() if free_eligible else 0.0,
                "free_remaining": max(0, free_roll_max_per_item() - free_used),
                "player_gold": gold,
                "player_diamonds": diamonds,
                "stats_now": _stats_view(stats_now),
                "stats_next": _stats_view(stats_next),
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
