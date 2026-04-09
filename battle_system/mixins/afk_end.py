"""Завершение боя по AFK (миксин)."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from config import *
from database import db

from battle_system.mixins.afk_end_titan import run_titan_progress_afk

logger = logging.getLogger(__name__)

class BattleAfkEndMixin:
    async def _end_battle_by_afk(self, battle_id: str, winner_id: int) -> Dict:
        """Завершить бой по AFK (параллельные читалки + фоновые записи)."""
        loop = asyncio.get_event_loop()

        battle = self.active_battles[battle_id]
        self.cancel_turn_timer(battle)
        battle['battle_active'] = False
        duration_ms = int((datetime.now() - battle['started_at']).total_seconds() * 1000)

        player1 = battle['player1']
        player2 = battle['player2']

        winner = player1 if winner_id == player1['user_id'] else player2
        loser  = player2 if winner_id == player1['user_id'] else player1
        winner_user_id = winner.get('user_id')
        loser_user_id  = loser.get('user_id')
        is_test     = battle.get('is_test_battle', False)
        battle_mode = battle.get("mode", "normal")
        mode_meta   = dict(battle.get("mode_meta") or {})

        winner_live = dict(winner)
        loser_live  = dict(loser)
        if not is_test:
            futs = {}
            if winner_user_id is not None:
                futs['winner'] = loop.run_in_executor(
                    None, db.get_or_create_player, winner_user_id, winner.get("username") or ""
                )
            if loser_user_id is not None:
                futs['loser'] = loop.run_in_executor(
                    None, db.get_or_create_player, loser_user_id, loser.get("username") or ""
                )
            if futs:
                vals = await asyncio.gather(*futs.values(), return_exceptions=True)
                done = dict(zip(futs.keys(), vals))
                if 'winner' in done and not isinstance(done['winner'], Exception):
                    winner_live = done['winner']
                if 'loser' in done and not isinstance(done['loser'], Exception):
                    loser_live = done['loser']

        winner_locked = self._is_profile_reset_locked(winner_user_id) or self._is_stale_after_profile_reset(winner_live, battle["started_at"])
        loser_locked  = self._is_profile_reset_locked(loser_user_id)  or self._is_stale_after_profile_reset(loser_live,  battle["started_at"])

        # Меньшие награды за победу по AFK (в тестовом бою не начисляются)
        gold_reward = 0 if is_test else (VICTORY_GOLD // 2)
        # Половина табличного XP за победу (как обычная победа, но из той же xp_per_win)
        bx = victory_xp_for_player_level(int(winner_live.get('level', PLAYER_START_LEVEL)))
        exp_reward = 0 if is_test else (max(1, bx // 2) if bx else 0)
        did_level_afk = False
        level_up_level = None

        streak_bonus_afk = 0
        new_ws_afk = 0
        winner_stats    = None
        loser_stats     = None
        afk_elo_delta_l = 0
        if not is_test and winner_user_id is not None and not winner_locked:
            new_ws_afk = winner_live.get('win_streak', 0) + 1
            total_g = winner_live.get('gold', 0) + gold_reward
            if new_ws_afk > 0 and new_ws_afk % STREAK_BONUS_EVERY == 0:
                streak_bonus_afk = STREAK_BONUS_GOLD
                total_g += streak_bonus_afk
            pl = dict(winner_live)
            pl['gold'] = total_g
            exp_patch, did_level_afk = self._exp_progression_updates(pl, exp_reward, max_level_ups=1)
            if did_level_afk:
                level_up_level = exp_patch['level']
            _is_pvp_afk = not battle.get("is_bot2")
            if _is_pvp_afk and battle_mode != "titan":
                _elo_k2 = 32
                _r_w2   = int(winner_live.get('rating', 1000))
                _r_l2   = int(loser_live.get('rating', 1000))
                _e_w2   = 1.0 / (1.0 + 10.0 ** ((_r_l2 - _r_w2) / 400.0))
                _e_l2   = 1.0 - _e_w2
                afk_elo_delta_w = max(1, round(_elo_k2 * (1.0 - _e_w2)))
                afk_elo_delta_l = min(-1, round(_elo_k2 * (0.0 - _e_l2)))
            else:
                afk_elo_delta_w = 0 if battle_mode == "titan" else 5
                afk_elo_delta_l = 0
            winner_stats = {
                'wins':           winner_live.get('wins', 0) + 1,
                'gold':           exp_patch['gold'],
                'exp':            exp_patch['exp'],
                'level':          exp_patch['level'],
                'free_stats':     exp_patch['free_stats'],
                'exp_milestones': exp_patch['exp_milestones'],
                'max_hp':         exp_patch['max_hp'],
                'current_hp':     int(exp_patch['max_hp']) if battle.get('is_bot2') else exp_patch['current_hp'],
                'rating':         int(winner_live.get('rating', 1000)) + afk_elo_delta_w,
                'win_streak':     new_ws_afk,
            }

        if not is_test and loser_user_id is not None and not loser_locked:
            loser_stats = {
                'losses': loser_live.get('losses', 0) + 1,
                'win_streak': 0,
                'rating': max(100, int(loser_live.get('rating', 1000)) + (afk_elo_delta_l if not is_test else 0)),
            }
            if battle.get('is_bot2'):
                loser_stats['current_hp'] = int(loser.get('max_hp', PLAYER_START_MAX_HP))

        titan_progress = await run_titan_progress_afk(
            loop,
            is_test=is_test,
            battle_mode=battle_mode,
            mode_meta=mode_meta,
            player1=player1,
            winner_id=winner_id,
            winner_locked=winner_locked,
            loser_locked=loser_locked,
        )

        n_rounds   = len(battle['rounds'])
        battle_data = {
            'player1_id': player1['user_id'],
            'player2_id': player2.get('user_id') or player2.get('bot_id'),
            'is_bot1':   battle['is_bot1'],
            'is_bot2':   battle['is_bot2'],
            'winner_id': winner_id,
            'result':    'afk_defeat',
            'rounds':    n_rounds,
            'details':   {'reason': 'AFK defeat', 'mode': battle_mode, 'mode_meta': mode_meta}
        }

        human_won = winner_id == player1['user_id']
        combat_log_html = '\n\n'.join(battle.get('combat_log_lines', []))
        dmg_to_opp, dmg_to_you = self._battle_damage_totals(battle)
        result = {
            'status': 'battle_ended_afk',
            'winner': self._entity_name(winner),
            'loser': self._entity_name(loser),
            'winner_id': winner_id,
            'human_won': human_won,
            'reason': 'Противник неактивен (3 пропуска)',
            'rounds': len(battle['rounds']),
            'damage_to_opponent': dmg_to_opp,
            'damage_to_you': dmg_to_you,
            'gold_reward': (gold_reward if human_won else DEFEAT_GOLD) if not winner_locked else 0,
            'exp_reward': (exp_reward if human_won else 0) if not winner_locked else 0,
            'level_up': bool(did_level_afk) if not is_test else False,
            'level_up_level': level_up_level if not is_test else None,
            'duration_ms': duration_ms,
            'combat_log_html': combat_log_html,
            'is_test_battle': is_test,
            'p2_gold_reward': DEFEAT_GOLD if human_won else gold_reward,
            'p2_exp_reward': 0 if human_won else exp_reward,
            'p2_xp_boosted': False,
            'p2_streak_bonus_gold': 0,
            'p2_win_streak': 0 if human_won else (winner.get('win_streak', 0) + 1 if not is_test else 0),
            'p2_level_up': (bool(did_level_afk) if not human_won else False) if not is_test else False,
            'p2_level_up_level': (level_up_level if not human_won else None) if not is_test else None,
            'pvp_p1_user_id': player1['user_id'] if not battle['is_bot2'] else None,
            'pvp_p2_user_id': player2.get('user_id') if not battle['is_bot2'] else None,
            'pvp_p1_ui_message': dict(battle['ui_message']) if not battle['is_bot2'] and battle.get('ui_message') else None,
            'pvp_p2_ui_message': dict(battle['ui_message_p2']) if not battle['is_bot2'] and battle.get('ui_message_p2') else None,
            'mode': battle_mode,
            'mode_meta': mode_meta,
            'titan_progress': titan_progress,
        }
        if battle.get('is_bot2') and player1.get('user_id') is not None:
            self.remember_battle_end_ui(player1['user_id'], result)
        elif not battle.get('is_bot2'):
            if player1.get('user_id') is not None:
                self.remember_battle_end_ui(player1['user_id'], result)
            if player2.get('user_id') is not None:
                self.remember_battle_end_ui(player2['user_id'], result)

        if player1['user_id'] in self.battle_queue:
            del self.battle_queue[player1['user_id']]
        if not battle['is_bot2'] and player2.get('user_id') in self.battle_queue:
            del self.battle_queue[player2['user_id']]
        del self.active_battles[battle_id]

        event_name = 'battle_test_ended_afk' if is_test else 'battle_ended_afk'
        logger.info("event=%s winner_id=%s rounds=%s duration_ms=%s", event_name, winner_id, n_rounds, duration_ms)
        asyncio.create_task(self._persist_battle_writes(
            winner_user_id, loser_user_id,
            winner_stats, loser_stats,
            winner_locked, loser_locked,
            battle_data, battle_mode, is_test,
            winner_id, n_rounds, duration_ms,
        ))

        return result
