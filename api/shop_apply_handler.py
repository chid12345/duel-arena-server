"""Логика обработки применения предметов из инвентаря."""

from __future__ import annotations

from api.tma_infra import get_user_lock
from api.shop_helpers import _XP_BOOST_CHARGES
from api.tma_catalogs import SCROLL_EFFECTS
from api.tma_player_api import _player_api


async def shop_apply_inner(body, *, db, get_user_from_init_data, _rl_check, SHOP_CATALOG) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    _rl_check(uid, "shop_apply", max_hits=3, window_sec=5)

    # Per-user lock: два параллельных запроса не дублируют предмет
    async with get_user_lock(uid):
        return _do_apply(db, uid, body.item_id, body, SHOP_CATALOG)


def _do_apply(db, uid: int, iid: str, body, SHOP_CATALOG: dict) -> dict:
    # XP буст: перевести из инвентаря в xp_boost_charges
    if iid in _XP_BOOST_CHARGES:
        if not db.has_item(uid, iid):
            return {"ok": False, "reason": "Предмет не найден в инвентаре"}
        charges, mult = _XP_BOOST_CHARGES[iid]
        db.remove_from_inventory(uid, iid)
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE players SET xp_boost_charges = xp_boost_charges + ? WHERE user_id = ?",
            (charges, uid),
        )
        conn.commit()
        conn.close()
        player = db.get_or_create_player(uid, "")
        return {"ok": True, "msg": f"⚡ XP Буст активирован — {charges} зарядов!", "player": _player_api(dict(player))}

    # gold_hunt: добавить time-based баф (только если нет активного)
    if iid == "gold_hunt":
        if not db.has_item(uid, iid):
            return {"ok": False, "reason": "Предмет не найден в инвентаре"}
        existing_gold = next(
            (b for b in db.get_raw_buffs(uid) if b["buff_type"] == "gold_pct"), None
        )
        if existing_gold:
            return {"ok": False, "reason": "Охота за золотом уже активна! Дождитесь окончания."}
        db.remove_from_inventory(uid, iid)
        db.add_buff(uid, "gold_pct", 20, hours=24)
        player = db.get_or_create_player(uid, "")
        return {"ok": True, "msg": "💰 Охота за золотом активирована на 24 ч!", "player": _player_api(dict(player))}

    # xp_hunt: +50% XP за бой на 24 часа
    if iid == "xp_hunt":
        if not db.has_item(uid, iid):
            return {"ok": False, "reason": "Предмет не найден в инвентаре"}
        existing_xp = next(
            (b for b in db.get_raw_buffs(uid) if b["buff_type"] == "xp_pct"), None
        )
        if existing_xp:
            return {"ok": False, "reason": "Охота за опытом уже активна! Дождитесь окончания."}
        db.remove_from_inventory(uid, iid)
        db.add_buff(uid, "xp_pct", 50, hours=24)
        player = db.get_or_create_player(uid, "")
        return {"ok": True, "msg": "📚 Охота за опытом активирована на 24 ч!", "player": _player_api(dict(player))}

    # Ящики из инвентаря (открываются без списания валюты — уже куплены)
    from api.shop_loot_box import ALL_BOX_IDS
    if iid in ALL_BOX_IDS:
        if not db.has_item(uid, iid):
            return {"ok": False, "reason": "Предмет не найден в инвентаре"}
        db.remove_from_inventory(uid, iid)
        from api.shop_loot_box import _open_box_free as _free_open
        result = _free_open(iid, db, uid)
        result["box_opened"] = True
        return result

    # Свитки
    effects = SCROLL_EFFECTS.get(iid)
    if effects:
        if not db.has_item(uid, iid):
            return {"ok": False, "reason": "Предмет не найден в инвентаре"}
        result = db.apply_scroll_buffs(uid, effects, replace=body.replace)
        if not result["ok"]:
            active = result.get("active_buff", {})
            return {
                "ok": False,
                "conflict": True,
                "active_buff_type": active.get("buff_type"),
                "active_charges": active.get("charges"),
                "reason": f"Уже активен {active.get('buff_type', 'этот тип')}. Заменить?",
            }
        db.remove_from_inventory(uid, iid)
        db.track_item_use(uid, iid)
        from config import STAMINA_PER_FREE_STAT as _SPF
        stam_added = sum(v for (bt, v, _) in effects if bt == "stamina")
        hp_bonus_added = sum(v for (bt, v, _) in effects if bt == "hp_bonus") + stam_added * _SPF
        if hp_bonus_added > 0:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET current_hp = MIN(max_hp + ?, current_hp + ?) WHERE user_id = ?",
                (hp_bonus_added, hp_bonus_added, uid),
            )
            conn.commit()
            conn.close()
        item_info = SHOP_CATALOG.get(iid, {})
        player = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "msg": f"✅ {item_info.get('icon', '')} {item_info.get('name', iid)} применён!",
            "active_buffs": db.get_raw_buffs(uid),
            "player": _player_api(dict(player), combined_buffs=db.get_combined_buffs(uid)),
        }

    return {"ok": False, "reason": "Нельзя применить этот предмет"}
