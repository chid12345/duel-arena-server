"""Состояние боя и адаптация round_result для TMA API."""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

from api.tma_player_api import _premium_fields

# Строки webapp_log всегда пишутся от лица P1: "Р{n} Вы→{p1_zone} {p1_mark} · Враг→{p2_zone} {p2_mark}".
# Для P2 нужно поменять "Вы" и "Враг" местами.
_RE_WEBAPP_ROUND = re.compile(r"^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$")


def _invert_webapp_log(lines: List[str]) -> List[str]:
    """Инверсия «Вы/Враг» в webapp_log — для показа с перспективы P2."""
    out: List[str] = []
    for line in lines or []:
        m = _RE_WEBAPP_ROUND.match(str(line))
        if not m:
            out.append(line)
            continue
        rn, z1, mark1, z2, mark2 = m.groups()
        out.append(f"Р{rn} Вы→{z2} {mark2.strip()} · Враг→{z1} {mark1.strip()}")
    return out


def _battle_state_api(user_id: int) -> Optional[dict]:
    """Состояние текущего боя для API (перспектива user_id)."""
    from battle_system import battle_system

    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        return None

    bid = battle_system.battle_queue.get(user_id)
    b = battle_system.active_battles.get(bid) if bid else None
    is_p1 = b and b["player1"]["user_id"] == user_id if b else True
    is_pvp = b and not b.get("is_bot2") if b else False

    deadline_sec = None
    if b and b.get("next_turn_deadline"):
        left = (b["next_turn_deadline"] - datetime.now()).total_seconds()
        deadline_sec = max(0, int(left))

    opp_entity = None
    opp_is_bot = True
    if b:
        if is_p1:
            opp_entity = b.get("player2")
            opp_is_bot = b.get("is_bot2", True)
        else:
            opp_entity = b.get("player1")
            opp_is_bot = False
    opp_is_premium = False
    if opp_entity and not opp_is_bot:
        opp_is_premium = bool(_premium_fields(opp_entity).get("is_premium"))

    # Шмот САМОГО игрока (для своей карточки): тащим из БД через get_equipment.
    # Формат — тот же что у opp_items: [{slot, item_id, name, rarity, color}].
    my_items = []
    try:
        from database import db as _db
        from repositories.bots.persona_gear import items_for_ui
        eq_dict = _db.get_equipment(int(user_id)) or {}
        items_map = {slot: data.get("item_id") for slot, data in eq_dict.items() if data.get("item_id")}
        my_items = items_for_ui(items_map)
        # Если стат-брони нет — добавляем косметику из гардероба
        if not any(it["slot"] == "armor" for it in my_items):
            equipped_cls = _db.get_equipped_class(int(user_id))
            if equipped_cls:
                cls_id = equipped_cls.get("class_id", "")
                cls_type = equipped_cls.get("class_type", "free")
                _TYPE_RAR = {"free": "common", "gold": "rare", "diamonds": "epic",
                             "mythic": "mythic", "usdt": "mythic"}
                _RAR_COL = {"common": "#9aa0a6", "rare": "#3cc864", "epic": "#b45aff", "mythic": "#ffc83c"}
                _RAR_LBL = {"common": "Обычное", "rare": "Редкое",
                            "epic": "Эпическое", "mythic": "Мифическое"}
                rar = _TYPE_RAR.get(cls_type, "common")
                cls_info = _db.get_class_info(cls_id) if hasattr(_db, "get_class_info") else {}
                name = (cls_info or {}).get("name", "Броня")
                my_items.append({
                    "slot": "armor", "item_id": cls_id, "name": name,
                    "rarity": rar, "rarity_label": _RAR_LBL.get(rar, rar),
                    "color": _RAR_COL.get(rar, "#9aa0a6"),
                })
    except Exception:
        my_items = []

    # Persona-статус и виртуальный шмот соперника (только для PvE-ботов).
    # Фронт показывает «🌱 Новичок» / «👑 Босс-донатер» рядом с ником,
    # блок «Что одето» с суммой бонусов и список предметов по слотам.
    opp_persona = None
    opp_eq = None
    opp_items = None
    opp_skin_id = None
    opp_win_streak = 0
    if opp_entity and opp_is_bot:
        opp_persona = opp_entity.get("persona")
        opp_skin_id = opp_entity.get("skin_id")
        opp_win_streak = int(opp_entity.get("win_streak") or 0)
        opp_eq = {
            "atk":         int(opp_entity.get("_eq_atk_bonus") or 0),
            "def_pct":     float(opp_entity.get("_eq_def_pct") or 0.0),
            "dodge":       int(opp_entity.get("_eq_dodge_bonus") or 0),
            "accuracy":    int(opp_entity.get("_eq_accuracy") or 0),
            "lifesteal":   int(opp_entity.get("_eq_lifesteal_pct") or 0),
            "pen_pct":     float(opp_entity.get("_eq_pen_pct") or 0.0),
            "crit_resist": int(opp_entity.get("_eq_crit_resist_pct") or 0),
        }
        try:
            from repositories.bots.persona_gear import items_for_ui
            raw_items = opp_entity.get("equipment_items") or {}
            opp_items = items_for_ui(raw_items)
        except Exception:
            opp_items = []

    return {
        "battle_id": bid,
        "active": True,
        "is_pvp": is_pvp,
        "is_p1": is_p1,
        "mode": b.get("mode", "normal") if b else "normal",
        "round": ctx.get("round_num", 0),
        "my_hp": ctx.get("your_hp"),
        "my_max_hp": ctx.get("your_max"),
        "opp_hp": ctx.get("opp_hp"),
        "opp_max_hp": ctx.get("opp_max"),
        "opp_name": ctx.get("opponent_name"),
        "opp_level": ctx.get("opponent_level"),
        "opp_strength": ctx.get("opp_strength"),
        "opp_agility": ctx.get("opp_endurance"),
        "opp_intuition": ctx.get("opp_crit"),
        "opp_stamina": ctx.get("opp_stamina_invested", 0),
        "opp_rating": ctx.get("opp_rating", 1000),
        "opp_is_bot": opp_is_bot,
        "opp_is_premium": opp_is_premium,
        "opp_persona": opp_persona,
        "opp_eq": opp_eq,
        "opp_items": opp_items,
        "opp_skin_id": opp_skin_id,
        "opp_win_streak": opp_win_streak,
        "my_items": my_items,
        "pending_attack": ctx.get("pending_attack"),
        "pending_defense": ctx.get("pending_defense"),
        "waiting_opponent": ctx.get("waiting_opponent", False),
        "combat_log": _combat_log_for_user(b, is_p1)[-6:],
        "deadline_sec": deadline_sec,
    }


def _combat_log_for_user(b, is_p1: bool) -> List[str]:
    """webapp_log для игрока: P1 — как есть, P2 — с инверсией Вы/Враг."""
    if not b:
        return []
    log = b.get("webapp_log") or b.get("combat_log_lines", []) or []
    if is_p1:
        return list(log)
    return _invert_webapp_log(log)


def _adapt_battle_result_for_user(result: dict, user_id: int) -> dict:
    """Адаптировать round_result под перспективу user_id (P1/P2)."""
    if not result:
        return {}
    winner_id = result.get("winner_id")
    if winner_id is None:
        return dict(result)
    p1_uid = result.get("pvp_p1_user_id")
    if p1_uid is None or user_id == p1_uid:
        r = dict(result)
        r["human_won"] = winner_id == user_id
        r["opponent_name"] = result.get("loser") if r["human_won"] else result.get("winner")
        return r
    r = dict(result)
    r["human_won"] = winner_id == user_id
    # P2 → инверсия Вы/Враг в webapp_log
    if "webapp_log" in r:
        r["webapp_log"] = _invert_webapp_log(r.get("webapp_log") or [])
    r["damage_to_opponent"] = result.get("damage_to_you")
    r["damage_to_you"] = result.get("damage_to_opponent")
    r["gold_reward"] = result.get("p2_gold_reward", 0)
    r["exp_reward"] = result.get("p2_exp_reward", 0)
    r["xp_boosted"] = result.get("p2_xp_boosted", False)
    r["streak_bonus_gold"] = result.get("p2_streak_bonus_gold", 0)
    r["win_streak"] = result.get("p2_win_streak", 0)
    r["level_up"] = result.get("p2_level_up", False)
    r["level_up_level"] = result.get("p2_level_up_level", None)
    r["opponent_name"] = result.get("loser") if r["human_won"] else result.get("winner")
    return r
