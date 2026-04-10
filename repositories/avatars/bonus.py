"""Эффективные бонусы образа с учётом уровня и элит-билда."""

from __future__ import annotations

from typing import Dict, Optional

from config import AVATAR_SCALE_EVERY_LEVELS, AVATAR_SCALE_MAX_BONUS, ELITE_AVATAR_ID, STAMINA_PER_FREE_STAT


class AvatarsBonusMixin:
    def _effective_avatar_bonus(self, avatar_id: Optional[str], level: int) -> Dict[str, int]:
        avatars = self._avatar_map()
        avatar = avatars.get(avatar_id or "")
        if not avatar:
            return {"strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0}

        scale = self._scale_bonus(level)
        tier = (avatar.get("tier") or "").lower()
        if tier == "base":
            return {"strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0}
        scale_allowed = tier in {"gold", "diamond", "elite"}

        b_str = int(avatar.get("strength", 0))
        b_end = int(avatar.get("endurance", 0))
        b_crit = int(avatar.get("crit", 0))
        b_hp = int(avatar.get("hp_flat", 0))

        if scale_allowed:
            b_str += scale
            b_end += scale
            b_crit += scale

        return {"strength": b_str, "endurance": b_end, "crit": b_crit, "hp_flat": b_hp}

    def _effective_avatar_bonus_for_user(
        self, cursor, user_id: int, avatar_id: Optional[str], level: int
    ) -> Dict[str, int]:
        if (avatar_id or "") != ELITE_AVATAR_ID:
            return self._effective_avatar_bonus(avatar_id, level)
        active = self._get_active_elite_build(cursor, user_id)
        if not active:
            return self._effective_avatar_bonus(avatar_id, level)
        used = self._elite_build_points_used(active)
        if used > self._ELITE_FREE_POINTS:
            used = self._ELITE_FREE_POINTS
        scale = min(
            max(0, int(AVATAR_SCALE_MAX_BONUS)),
            max(0, int(level)) // max(1, int(AVATAR_SCALE_EVERY_LEVELS)),
        )
        return {
            "strength": int(self._row_get(active, "alloc_strength", 0) or 0) + scale,
            "endurance": self._ELITE_FIXED_ENDURANCE
            + int(self._row_get(active, "alloc_endurance", 0) or 0)
            + scale,
            "crit": int(self._row_get(active, "alloc_crit", 0) or 0) + scale,
            "hp_flat": int(self._row_get(active, "alloc_stamina", 0) or 0) * int(STAMINA_PER_FREE_STAT),
        }
