"""Эффективные бонусы образа с учётом уровня и элит-билда."""

from __future__ import annotations

from typing import Dict, Optional

from datetime import datetime

from config import (
    AVATAR_SCALE_EVERY_LEVELS, AVATAR_SCALE_MAX_BONUS,
    ELITE_AVATAR_ID, STAMINA_PER_FREE_STAT, SUB_STAT_PENALTY,
)


class AvatarsBonusMixin:
    def _effective_avatar_bonus(self, avatar_id: Optional[str], level: int) -> Dict[str, int]:
        avatars = self._avatar_map()
        avatar = avatars.get(avatar_id or "")
        if not avatar:
            return {"strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0}

        scale = self._scale_bonus(level)
        tier = (avatar.get("tier") or "").lower()
        # base даёт статы но не масштабируется с уровнем
        scale_allowed = tier in {"gold", "diamond", "elite", "premium", "sub", "referral"}

        b_str = int(avatar.get("strength", 0))
        b_end = int(avatar.get("endurance", 0))
        b_crit = int(avatar.get("crit", 0))
        b_hp = int(avatar.get("hp_flat", 0))

        if scale_allowed:
            b_str += scale
            b_end += scale
            b_crit += scale

        return {"strength": b_str, "endurance": b_end, "crit": b_crit, "hp_flat": b_hp}

    @staticmethod
    def _is_premium_active(cursor, user_id: int) -> bool:
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return False
            val = row["premium_until"] if isinstance(row, dict) else row[0]
            if not val:
                return False
            return datetime.fromisoformat(str(val)) > datetime.utcnow()
        except Exception:
            return False

    def _effective_avatar_bonus_for_user(
        self, cursor, user_id: int, avatar_id: Optional[str], level: int
    ) -> Dict[str, int]:
        if (avatar_id or "") != ELITE_AVATAR_ID:
            bonus = self._effective_avatar_bonus(avatar_id, level)
            # Штраф за истекшую подписку для sub-tier
            avatars = self._avatar_map()
            av = avatars.get(avatar_id or "")
            if av and (av.get("tier") or "").lower() == "sub":
                if not self._is_premium_active(cursor, user_id):
                    factor = 1.0 - SUB_STAT_PENALTY
                    bonus = {k: max(0, int(v * factor)) for k, v in bonus.items()}
            return bonus
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
