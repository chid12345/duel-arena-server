"""Действия игрока в рейде: применить свиток, воскрешение, забрать награду, напоминалка."""
from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel

from api.tma_infra import get_user_lock

log = logging.getLogger(__name__)

# hp_pct для свитков воскрешения (должен совпадать с SHOP_CATALOG).
RESURRECTION_HP_PCT = {
    "res_30": 0.30,
    "res_60": 0.60,
    "res_100": 1.00,
}


class UseScrollBody(BaseModel):
    init_data: str
    scroll_name: str
    slot: Optional[int] = None  # 1|2|None(auto)


class ResurrectBody(BaseModel):
    init_data: str
    scroll_id: str  # res_30|res_60|res_100


class ClaimRewardBody(BaseModel):
    init_data: str
    reward_id: int


class ReminderToggleBody(BaseModel):
    init_data: str
    enabled: bool


async def world_boss_use_scroll_inner(body: UseScrollBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    async with get_user_lock(uid):
        return db.wb_apply_raid_scroll(
            user_id=uid, scroll_name=body.scroll_name, slot=body.slot
        )


async def world_boss_resurrect_inner(body: ResurrectBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    hp_pct = RESURRECTION_HP_PCT.get(body.scroll_id)
    if hp_pct is None:
        return {"ok": False, "reason": "Неизвестный свиток воскрешения"}

    async with get_user_lock(uid):
        active = db.get_wb_active_spawn()
        if not active:
            return {"ok": False, "reason": "Нет активного рейда"}
        spawn_id = int(active["spawn_id"])
        ps = db.get_wb_player_state(spawn_id, uid)
        if not ps:
            return {"ok": False, "reason": "Вы не в рейде"}
        if not int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Вы живы — свиток не нужен"}
        if not db.has_item(uid, body.scroll_id):
            return {"ok": False, "reason": "Нет заряда свитка в инвентаре"}

        if not db.remove_from_inventory(uid, body.scroll_id, quantity=1):
            return {"ok": False, "reason": "Не удалось списать свиток"}
        new_hp = db.wb_resurrect_player(spawn_id, uid, hp_pct)
        if new_hp is None:
            # Откат
            db.add_to_inventory(uid, body.scroll_id, quantity=1, bump_unseen=False)
            return {"ok": False, "reason": "Не удалось воскреснуть"}

        return {
            "ok": True,
            "scroll_id": body.scroll_id,
            "hp_pct": hp_pct,
            "new_hp": new_hp,
            "max_hp": int(ps.get("max_hp") or 100),
        }


async def world_boss_claim_reward_inner(body: ClaimRewardBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    async with get_user_lock(uid):
        row = db.claim_wb_reward(reward_id=int(body.reward_id), user_id=uid)
        if not row:
            return {"ok": False, "reason": "Награда уже забрана или недоступна"}
        gold = int(row.get("gold") or 0)
        exp = int(row.get("exp") or 0)
        diamonds = int(row.get("diamonds") or 0)
        if gold or exp or diamonds:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE players SET gold = gold + ?, exp = exp + ?, diamonds = diamonds + ? "
                "WHERE user_id = ?",
                (gold, exp, diamonds, uid),
            )
            conn.commit()
            conn.close()
        chest = row.get("chest_type")
        if chest:
            try:
                db.add_to_inventory(uid, chest, quantity=1)
            except Exception as e:
                log.warning("claim_reward: failed add chest %s to uid=%s: %s", chest, uid, e)
        return {
            "ok": True, "reward_id": int(body.reward_id),
            "gold": gold, "exp": exp, "diamonds": diamonds,
            "chest_type": chest,
            "contribution_pct": float(row.get("contribution_pct") or 0.0),
            "is_victory": bool(row.get("is_victory")),
        }


async def world_boss_reminder_toggle_inner(body: ReminderToggleBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    db.set_wb_reminder_opt_in(uid, bool(body.enabled))
    return {"ok": True, "enabled": bool(body.enabled)}
