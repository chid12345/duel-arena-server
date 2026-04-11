"""Начало _end_battle: чтение боя, параллельные DB-запросы, награды и ELO."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from config import *
from database import db

from battle_system.end_battle_finish import end_battle_rewards_and_finish

logger = logging.getLogger(__name__)


class BattleEndBattleMixin:
    async def _end_battle(
        self, battle_id: str, winner_id: int, exchange_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Завершить бой. DB-записи — в фоне (см. end_battle_finish)."""
        loop = asyncio.get_event_loop()

        battle = self.active_battles[battle_id]
        self.cancel_turn_timer(battle)
        battle["battle_active"] = False
        duration_ms = int((datetime.now() - battle["started_at"]).total_seconds() * 1000)

        player1 = battle["player1"]
        player2 = battle["player2"]

        is_winner_p1 = winner_id == player1["user_id"]
        winner = player1 if is_winner_p1 else player2
        loser = player2 if is_winner_p1 else player1
        winner_user_id = winner.get("user_id")
        loser_user_id = loser.get("user_id")
        is_test = battle.get("is_test_battle", False)
        battle_mode = battle.get("mode", "normal")
        mode_meta = dict(battle.get("mode_meta") or {})

        winner_live = dict(winner)
        loser_live = dict(loser)
        xp_boosted = False
        prem_w_active = False
        prem_l_active = False
        pvp_repeat_factor = 1.0

        if not is_test:
            p1_dmg_snap, p2_dmg_snap = self._battle_damage_totals(battle)
            w_dmg_snap = p1_dmg_snap if is_winner_p1 else p2_dmg_snap
            snap_level = int(winner.get("level", PLAYER_START_LEVEL))
            snap_opp_hp = max(1, int(loser.get("max_hp", PLAYER_START_MAX_HP)))
            snap_dmg_r = min(1.0, max(0.4, w_dmg_snap / snap_opp_hp))
            snap_base_exp = max(1, int(victory_xp_for_player_level(snap_level) * snap_dmg_r))

            futs: dict = {}
            if winner_user_id is not None:
                futs["winner"] = loop.run_in_executor(
                    None, db.get_or_create_player, winner_user_id, winner.get("username") or ""
                )
            if loser_user_id is not None:
                futs["loser"] = loop.run_in_executor(
                    None, db.get_or_create_player, loser_user_id, loser.get("username") or ""
                )
            if winner_user_id is not None:
                futs["prem_w"] = loop.run_in_executor(None, db.get_premium_status, winner_user_id)
            if loser_user_id is not None and not battle.get("is_bot2"):
                futs["prem_l"] = loop.run_in_executor(None, db.get_premium_status, loser_user_id)
            if winner_user_id is not None and snap_base_exp > 0:
                futs["xp_boost"] = loop.run_in_executor(None, db.consume_xp_boost_charge, winner_user_id)
            # Consume scroll charges after battle.
            # Endless/titan: заряды списываются при входе в режим (не за каждый этаж/волну).
            # ВАЖНО: добавляем в futs (не fire-and-forget) — await гарантирует списание
            # ДО отправки результата клиенту, иначе гонка: клиент читает стат и видит
            # устаревший баф с ненулевым зарядом.
            _charge_modes = ("endless", "titan")
            if winner_user_id is not None and battle_mode not in _charge_modes:
                futs["consume_w"] = loop.run_in_executor(None, db.consume_charges, winner_user_id)
                futs["cleanup_w"] = loop.run_in_executor(None, db.cleanup_expired, winner_user_id)
            if loser_user_id is not None and not battle.get("is_bot2") and battle_mode not in _charge_modes:
                futs["consume_l"] = loop.run_in_executor(None, db.consume_charges, loser_user_id)
                futs["cleanup_l"] = loop.run_in_executor(None, db.cleanup_expired, loser_user_id)
            if not battle.get("is_bot2"):
                futs["pvp_cnt"] = loop.run_in_executor(
                    None, db.get_recent_pvp_duel_count, player1["user_id"], player2["user_id"], 24
                )

            if futs:
                vals = await asyncio.gather(*futs.values(), return_exceptions=True)
                done = dict(zip(futs.keys(), vals))
                if "winner" in done and not isinstance(done["winner"], Exception):
                    winner_live = done["winner"]
                if "loser" in done and not isinstance(done["loser"], Exception):
                    loser_live = done["loser"]
                if "prem_w" in done and not isinstance(done["prem_w"], Exception):
                    prem_w_active = bool(done["prem_w"].get("is_active"))
                if "prem_l" in done and not isinstance(done["prem_l"], Exception):
                    prem_l_active = bool(done["prem_l"].get("is_active"))
                if "xp_boost" in done and not isinstance(done["xp_boost"], Exception):
                    xp_boosted = bool(done["xp_boost"])
                if "pvp_cnt" in done and not isinstance(done["pvp_cnt"], Exception):
                    cnt = done["pvp_cnt"]
                    if cnt >= 6:
                        pvp_repeat_factor = 0.2
                    elif cnt >= 3:
                        pvp_repeat_factor = 0.5

        winner_locked = self._is_profile_reset_locked(winner_user_id) or self._is_stale_after_profile_reset(
            winner_live, battle["started_at"]
        )
        loser_locked = self._is_profile_reset_locked(loser_user_id) or self._is_stale_after_profile_reset(
            loser_live, battle["started_at"]
        )

        p1_total_dmg, p2_total_dmg = self._battle_damage_totals(battle)
        winner_dmg = p1_total_dmg if is_winner_p1 else p2_total_dmg
        loser_dmg = p2_total_dmg if is_winner_p1 else p1_total_dmg
        opp_max_hp = max(1, int(loser.get("max_hp", PLAYER_START_MAX_HP)))
        your_max_hp = max(1, int(winner.get("max_hp", PLAYER_START_MAX_HP)))

        gold_reward = 0 if is_test else (VICTORY_GOLD if not battle["is_bot2"] else int(VICTORY_GOLD * 0.8))
        winner_level = int(winner_live.get("level", PLAYER_START_LEVEL))
        loser_level = int(loser_live.get("level", PLAYER_START_LEVEL))
        level_diff = winner_level - loser_level
        level_mult = max(0.3, 1.0 - level_diff * 0.15)
        dmg_ratio = min(1.0, max(0.4, winner_dmg / opp_max_hp))
        base_exp = 0 if is_test else max(1, int(victory_xp_for_player_level(winner_level) * level_mult * dmg_ratio))

        loser_if_won_diff = loser_level - winner_level
        loser_if_won_mult = max(0.3, 1.0 - loser_if_won_diff * 0.15)
        loser_if_won_dmg = min(1.0, max(0.4, loser_dmg / your_max_hp))
        hypothetical_loser_win = 0 if is_test else int(
            victory_xp_for_player_level(loser_level) * loser_if_won_mult * loser_if_won_dmg
        )
        loser_exp = 0 if is_test else int(hypothetical_loser_win * DEFEAT_XP_AS_WIN_FRACTION)

        exp_reward = int(base_exp * 1.5) if xp_boosted else base_exp
        if not is_test and prem_w_active and exp_reward > 0:
            exp_reward = max(1, int(round(exp_reward * PREMIUM_XP_MULTIPLIER)))
        if not is_test and prem_l_active and loser_exp > 0:
            loser_exp = max(0, int(round(loser_exp * PREMIUM_XP_MULTIPLIER)))

        if not is_test and not battle.get("is_bot2"):
            gold_reward = int(round(gold_reward * 1.30 * pvp_repeat_factor))
            exp_reward = int(round(exp_reward * 1.30 * pvp_repeat_factor))
        if battle_mode == "titan":
            floor = max(1, int(mode_meta.get("floor", 1)))
            gold_reward = 0 if is_test else int(12 + floor * 5)
            exp_reward = 0 if is_test else max(1, int(round(base_exp * (1.0 + min(1.0, floor * 0.06)))))
        if battle_mode == "endless":
            wave = max(1, int(mode_meta.get("wave", 1)))
            gold_reward = 0 if is_test else int(8 + wave * 4)
            exp_reward = 0
            loser_exp = 0

        # gold_pct buff (gold_hunt item: +20% gold for 24h)
        if not is_test and gold_reward > 0 and winner_user_id:
            try:
                _gold_pct = db.get_combined_buffs(int(winner_user_id)).get("gold_pct", 0)
                if _gold_pct:
                    gold_reward = int(gold_reward * (1.0 + _gold_pct / 100.0))
            except Exception:
                pass

        combat_log_html = "\n\n".join(battle.get("combat_log_lines", []))

        _is_pvp = not battle.get("is_bot2")
        if not is_test and _is_pvp and battle_mode not in ("titan", "endless"):
            _elo_k = 32
            _r_w = int(winner_live.get("rating", 1000))
            _r_l = int(loser_live.get("rating", 1000))
            _e_w = 1.0 / (1.0 + 10.0 ** ((_r_l - _r_w) / 400.0))
            _e_l = 1.0 - _e_w
            elo_delta_w = max(1, round(_elo_k * (1.0 - _e_w)))
            elo_delta_l = min(-1, round(_elo_k * (0.0 - _e_l)))
        elif not is_test and not _is_pvp and battle_mode not in ("titan", "endless"):
            elo_delta_w = 5
            elo_delta_l = 0
        else:
            elo_delta_w = 0
            elo_delta_l = 0

        ctx: Dict[str, Any] = {
            "loop": loop,
            "battle_id": battle_id,
            "winner_id": winner_id,
            "exchange_text": exchange_text,
            "battle": battle,
            "duration_ms": duration_ms,
            "player1": player1,
            "player2": player2,
            "is_winner_p1": is_winner_p1,
            "winner": winner,
            "loser": loser,
            "winner_user_id": winner_user_id,
            "loser_user_id": loser_user_id,
            "is_test": is_test,
            "battle_mode": battle_mode,
            "mode_meta": mode_meta,
            "winner_live": winner_live,
            "loser_live": loser_live,
            "xp_boosted": xp_boosted,
            "pvp_repeat_factor": pvp_repeat_factor,
            "winner_locked": winner_locked,
            "loser_locked": loser_locked,
            "winner_dmg": winner_dmg,
            "loser_dmg": loser_dmg,
            "gold_reward": gold_reward,
            "exp_reward": exp_reward,
            "loser_exp": loser_exp,
            "combat_log_html": combat_log_html,
            "elo_delta_w": elo_delta_w,
            "elo_delta_l": elo_delta_l,
        }
        return await end_battle_rewards_and_finish(self, ctx)
