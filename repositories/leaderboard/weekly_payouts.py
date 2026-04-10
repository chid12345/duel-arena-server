"""Недельные выплаты PvP, Башня Титанов и Натиск."""

from __future__ import annotations

import logging
from typing import Any, Dict

from db_core import (
    prev_iso_week_bounds_utc,
    weekly_pvp_rank_reward,
    weekly_titan_rank_reward,
    weekly_natisk_rank_reward,
)

_log = logging.getLogger(__name__)


class LeaderboardWeeklyPayoutsMixin:
    def process_weekly_leaderboard_payouts(self) -> Dict[str, Any]:
        week_key, start_dt, end_dt = prev_iso_week_bounds_utc()
        out: Dict[str, Any] = {
            "week_key": week_key,
            "pvp_paid": 0, "titan_paid": 0, "natisk_paid": 0,
            "invalidate_uids": [], "telegram": [],
        }

        # ── PvP ──────────────────────────────────────────────────
        if not self.weekly_payout_already_done(week_key, "pvp"):
            rows = self.get_pvp_weekly_top_for_period(start_dt, end_dt, limit=20)
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                for idx, r in enumerate(rows[:10], 1):
                    d, title = weekly_pvp_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                        (d, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_pvp_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": (
                                f"🏆 <b>Награда за неделю {week_key}</b> (топ PvP)\n\n"
                                f"Место: <b>#{idx}</b>\n+{d} 💎\nТитул: «{title}»"
                            ),
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "pvp"),
                )
                conn.commit()
                out["pvp_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly PvP payout failed: %s", ex)
            finally:
                conn.close()

        # ── Башня Титанов ─────────────────────────────────────────
        if not self.weekly_payout_already_done(week_key, "titan"):
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "SELECT s.user_id, p.username, s.max_floor, s.best_at FROM titan_weekly_scores s "
                    "JOIN players p ON p.user_id = s.user_id "
                    "WHERE s.week_key = ? AND s.max_floor > 0 ORDER BY s.max_floor DESC, s.best_at ASC LIMIT 20",
                    (week_key,),
                )
                rows = [dict(x) for x in cursor.fetchall()]
                for idx, r in enumerate(rows[:10], 1):
                    d, g, title = weekly_titan_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, gold = gold + ?, display_title = ? WHERE user_id = ?",
                        (d, g, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_titan_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": (
                                f"🗿 <b>Награда за неделю {week_key}</b> (Башня Титанов)\n\n"
                                f"Место: <b>#{idx}</b>\n+{g} 💰 +{d} 💎\nТитул: «{title}»"
                            ),
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "titan"),
                )
                conn.commit()
                out["titan_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly Titan payout failed: %s", ex)
            finally:
                conn.close()

        # ── Натиск ────────────────────────────────────────────────
        if not self.weekly_payout_already_done(week_key, "natisk"):
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "SELECT ews.user_id, p.username, ews.best_wave_this_week FROM endless_weekly_scores ews "
                    "JOIN players p ON p.user_id = ews.user_id "
                    "WHERE ews.week_key = ? AND ews.best_wave_this_week > 0 "
                    "ORDER BY ews.best_wave_this_week DESC LIMIT 20",
                    (week_key,),
                )
                rows = [dict(x) for x in cursor.fetchall()]
                for idx, r in enumerate(rows[:10], 1):
                    d, g, title = weekly_natisk_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, gold = gold + ?, display_title = ? WHERE user_id = ?",
                        (d, g, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_natisk_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": (
                                f"🔥 <b>Награда за неделю {week_key}</b> (Натиск)\n\n"
                                f"Место: <b>#{idx}</b>\n+{g} 💰 +{d} 💎\nТитул: «{title}»"
                            ),
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "natisk"),
                )
                conn.commit()
                out["natisk_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly Natisk payout failed: %s", ex)
            finally:
                conn.close()

        out["invalidate_uids"] = list(dict.fromkeys(out["invalidate_uids"]))
        return out
