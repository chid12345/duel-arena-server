"""Каталог аватаров и эффективные бонусы для API."""

from __future__ import annotations

from config import AVATAR_CATALOG, AVATAR_SCALE_EVERY_LEVELS, AVATAR_SCALE_MAX_BONUS

AVATAR_BY_ID = {a["id"]: dict(a) for a in AVATAR_CATALOG}


def _avatar_effective_bonus(level: int, avatar_id: str) -> dict:
    avatar = AVATAR_BY_ID.get((avatar_id or "").strip()) or {}
    if not avatar:
        return {"strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0}
    # base даёт статы но не масштабируется с уровнем
    step = max(1, int(AVATAR_SCALE_EVERY_LEVELS))
    cap = max(0, int(AVATAR_SCALE_MAX_BONUS))
    scale = min(cap, max(0, int(level)) // step)
    tier = (avatar.get("tier") or "").lower()
    scale_allowed = tier in {"gold", "diamond", "elite", "premium", "sub", "referral"}
    b_str = int(avatar.get("strength", 0) or 0)
    b_end = int(avatar.get("endurance", 0) or 0)
    b_crit = int(avatar.get("crit", 0) or 0)
    b_hp = int(avatar.get("hp_flat", 0) or 0)
    if scale_allowed:
        b_str += scale
        b_end += scale
        b_crit += scale
    return {"strength": b_str, "endurance": b_end, "crit": b_crit, "hp_flat": b_hp}
