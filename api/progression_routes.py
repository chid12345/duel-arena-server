from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from reward_calculator import calc_reward


class WeeklyClaimBody(BaseModel):
    init_data: str
    claim_key: str


class BattlePassClaimBody(BaseModel):
    init_data: str
    tier: int


class ClaimQuestBody(BaseModel):
    init_data: str


def _make_endless_bp_tiers() -> list:
    tiers_def = [
        {
            "tier": 1, "needed": 5, "difficulty": "easy", "frequency": "once",
            "label": "🩸 Первая кровь",
            "desc": "Натиск начинается с первого шага. Одержите 5 побед в режиме Натиск.",
        },
        {
            "tier": 2, "needed": 15, "difficulty": "medium", "frequency": "once",
            "label": "🛡️ Ветеран волн",
            "desc": "Пятнадцать побед — это мастерство. Победите 15 раз в Натиске и докажите свой класс.",
        },
        {
            "tier": 3, "needed": 30, "difficulty": "hard", "frequency": "once",
            "label": "👑 Легенда Натиска",
            "desc": "Тридцать побед. Имена таких бойцов вырезают в камне. Победите 30 раз в Натиске.",
        },
    ]
    result = []
    for t in tiers_def:
        gold, diamonds, xp = calc_reward(t["difficulty"], t["frequency"])
        result.append(
            {
                "tier": t["tier"],
                "needed": t["needed"],
                "gold": gold,
                "diamonds": diamonds,
                "xp": xp,
                "label": t["label"],
                "desc": t["desc"],
            }
        )
    return result


ENDLESS_BP_TIERS = _make_endless_bp_tiers()


def register_progression_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _cache_invalidate = ctx["_cache_invalidate"]
    _weekly_quests_status = ctx["_weekly_quests_status"]

    @router.get("/api/season")
    async def get_season_info(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        season = db.get_active_season()
        if not season:
            return {"ok": True, "season": None, "leaderboard": [], "my_stats": None}
        lb = db.get_season_leaderboard(season["id"], limit=20)
        my_pos = next((i + 1 for i, r in enumerate(lb) if r["user_id"] == uid), None)
        my_stat = next((r for r in lb if r["user_id"] == uid), None)
        return {"ok": True, "season": dict(season), "leaderboard": lb, "my_stats": my_stat, "my_pos": my_pos}

    @router.get("/api/battlepass")
    async def get_battlepass(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        bp = db.get_battle_pass(uid)
        tiers = [
            {"tier": i + 1, "battles_needed": t[0], "wins_needed": t[1], "diamonds": t[2], "gold": t[3]}
            for i, t in enumerate(db.BATTLE_PASS_TIERS)
        ]
        return {
            "ok": True,
            "bp": dict(bp),
            "tiers": tiers,
            "endless_tiers": ENDLESS_BP_TIERS,
            "endless_done": int((bp or {}).get("endless_done") or 0),
            "endless_tier_claimed": int((bp or {}).get("endless_tier_claimed") or 0),
        }

    @router.post("/api/battlepass/claim")
    async def claim_battlepass(body: BattlePassClaimBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        return db.claim_battle_pass_tier(uid, body.tier)

    @router.post("/api/battlepass/claim_endless")
    async def claim_battlepass_endless(body: BattlePassClaimBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.claim_battle_pass_endless_tier(uid, body.tier)
        if result.get("ok"):
            _cache_invalidate(uid)
        return result

    @router.get("/api/quests")
    async def get_quests(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        quest = db.get_daily_quest_status(uid)
        daily = db.check_daily_bonus(uid)
        weekly = _weekly_quests_status(uid)
        return {"ok": True, "quest": quest, "daily": daily, "weekly": weekly}

    @router.post("/api/quests/claim")
    async def claim_quest(body: ClaimQuestBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.claim_daily_quest_reward(uid)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = dict(player)
        return result

    @router.post("/api/daily/claim")
    async def claim_daily(body: ClaimQuestBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.check_daily_bonus(uid)
        if not result.get("can_claim"):
            return {"ok": False, "reason": "Бонус уже получен сегодня"}
        player = db.get_or_create_player(uid, "")
        result["ok"] = True
        result["player"] = dict(player)
        return result

    @router.post("/api/quests/weekly_claim")
    async def claim_weekly_quest(body: WeeklyClaimBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        status = _weekly_quests_status(uid)
        q = next((x for x in status["quests"] if x["key"] == body.claim_key), None)
        if not q:
            return {"ok": False, "reason": "quest_not_found"}
        if q.get("reward_claimed"):
            return {"ok": False, "reason": "already_claimed"}
        if not q.get("is_completed"):
            return {"ok": False, "reason": "not_completed"}
        wk = status["week_key"]
        if not db.add_weekly_claim(uid, wk, body.claim_key):
            return {"ok": False, "reason": "already_claimed"}
        pl = db.get_or_create_player(uid, "")
        upd = {
            "gold": int(pl.get("gold", 0)) + int(q.get("reward_gold", 0)),
            "diamonds": int(pl.get("diamonds", 0)) + int(q.get("reward_diamonds", 0)),
            "exp": int(pl.get("exp", 0)) + int(q.get("reward_xp", 0)),
        }
        db.update_player_stats(uid, upd)
        _cache_invalidate(uid)
        fresh = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "gold": int(q.get("reward_gold", 0)),
            "diamonds": int(q.get("reward_diamonds", 0)),
            "xp": int(q.get("reward_xp", 0)),
            "player": dict(fresh),
        }

    app.include_router(router)
