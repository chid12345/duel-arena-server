"""Логика забора наград батл-пасса."""
from __future__ import annotations

from typing import Any

from repositories.season_pass.config_loader import get_reward_for_level


class SeasonPassClaimMixin:
    def is_bp_reward_claimed(self, user_id: int, season_id: int,
                             level: int, track: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            ph = "%s" if self._pg else "?"
            cursor.execute(
                f"SELECT 1 FROM bp_rewards_claimed "
                f"WHERE user_id = {ph} AND season_id = {ph} "
                f"AND level = {ph} AND track = {ph}",
                (user_id, season_id, level, track),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def claim_bp_reward(self, user_id: int, level: int, track: str) -> dict[str, Any]:
        """Забрать награду уровня. Возвращает {ok, reward, reason}.

        Проверки:
          - есть активный сезон
          - игрок достиг этого уровня (progress.level >= level)
          - track == 'premium' → has_premium == True
          - награда не была забрана раньше
          - на уровне есть награда в конфиге

        При успехе:
          - зачислить gold/diamond игроку
          - выдать item в инвентарь (если есть)
          - записать в bp_rewards_claimed
        """
        if track not in ("free", "premium"):
            return {"ok": False, "reason": "invalid_track"}

        season = self.get_active_bp_season() or self.ensure_bp_season()
        season_id = int(season["id"])

        progress = self.get_bp_progress(user_id, season_id)
        if progress["level"] < level:
            return {"ok": False, "reason": "level_not_reached", "your_level": progress["level"]}

        if track == "premium" and not progress.get("has_premium"):
            return {"ok": False, "reason": "premium_required"}

        if self.is_bp_reward_claimed(user_id, season_id, level, track):
            return {"ok": False, "reason": "already_claimed"}

        reward = get_reward_for_level(level, track)
        if not reward:
            return {"ok": False, "reason": "no_reward_at_level"}

        # Применяем награду
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            ph = "%s" if self._pg else "?"
            gold = int(reward.get("gold", 0))
            diamond = int(reward.get("diamond", 0))
            if gold > 0 or diamond > 0:
                cursor.execute(
                    f"UPDATE players SET gold = gold + {ph}, diamonds = diamonds + {ph} "
                    f"WHERE user_id = {ph}",
                    (gold, diamond, user_id),
                )

            item = reward.get("item")
            if item:
                cursor.execute(
                    f"INSERT INTO user_inventory (user_id, item_name, quantity) "
                    f"VALUES ({ph}, {ph}, 1)",
                    (user_id, item),
                )

            cursor.execute(
                f"INSERT INTO bp_rewards_claimed (user_id, season_id, level, track) "
                f"VALUES ({ph}, {ph}, {ph}, {ph})",
                (user_id, season_id, level, track),
            )
            conn.commit()
        finally:
            conn.close()

        return {"ok": True, "reward": reward, "level": level, "track": track}
