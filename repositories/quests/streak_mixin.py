"""Mixin: 7-дневный стрик входа с ротацией наборов призов."""
from __future__ import annotations

import json
import logging
from datetime import datetime, date, timedelta
from typing import Any, Dict

from repositories.quests.definitions_tasks import LOGIN_STREAK_SETS

log = logging.getLogger(__name__)


class QuestsStreakMixin:

    def get_login_streak_status(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM login_streak_v2 WHERE user_id=?", (user_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"streak_day": 0, "week_set": 0, "days_claimed": [],
                    "last_login_date": "", "reward_set": LOGIN_STREAK_SETS[0]}
        day = int(row["streak_day"] or 0)
        ws = int(row["week_set"] or 0) % 4
        claimed = json.loads(row["days_claimed_json"] or "[]")
        return {
            "streak_day": day,
            "week_set": ws,
            "days_claimed": claimed,
            "last_login_date": row["last_login_date"] or "",
            "reward_set": LOGIN_STREAK_SETS[ws],
        }

    def process_login_streak(self, user_id: int) -> Dict[str, Any]:
        """Вызывается при каждом входе. Обновляет streak_day."""
        today = date.today().isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM login_streak_v2 WHERE user_id=?", (user_id,))
        row = cur.fetchone()

        if not row:
            cur.execute(
                "INSERT INTO login_streak_v2 (user_id, streak_day, week_set, last_login_date, days_claimed_json) "
                "VALUES (?,1,0,?,'[]')",
                (user_id, today),
            )
            conn.commit()
            conn.close()
            return {"streak_day": 1, "week_set": 0, "days_claimed": [],
                    "advanced": True, "reward_set": LOGIN_STREAK_SETS[0]}

        sd = int(row["streak_day"] or 0)
        ws = int(row["week_set"] or 0) % 4
        last_date = str(row["last_login_date"] or "")
        claimed = json.loads(row["days_claimed_json"] or "[]")
        advanced = False

        if last_date == today:
            conn.close()
            return {"streak_day": sd, "week_set": ws, "days_claimed": claimed,
                    "advanced": False, "reward_set": LOGIN_STREAK_SETS[ws]}

        if sd == 0:
            # Цикл только что завершён — начать новый
            sd = 1
            claimed = []
            advanced = True
        elif last_date == yesterday:
            prev_day_claimed = (sd in claimed)
            if prev_day_claimed and sd < 7:
                sd += 1
                advanced = True
            # else: день не забран или день=7 (ждём клейм) — не двигаем
        else:
            # Пропущен день → сброс стрика
            sd = 1
            claimed = []
            advanced = True

        cur.execute(
            "UPDATE login_streak_v2 SET streak_day=?, week_set=?, last_login_date=?, "
            "days_claimed_json=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
            (sd, ws, today, json.dumps(claimed), user_id),
        )
        conn.commit()
        conn.close()
        return {"streak_day": sd, "week_set": ws, "days_claimed": claimed,
                "advanced": advanced, "reward_set": LOGIN_STREAK_SETS[ws]}

    def claim_streak_day(self, user_id: int, day_num: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM login_streak_v2 WHERE user_id=?", (user_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Стрик не начат"}

        sd = int(row["streak_day"] or 0)
        ws = int(row["week_set"] or 0) % 4
        claimed = json.loads(row["days_claimed_json"] or "[]")

        if day_num != sd:
            conn.close()
            return {"ok": False, "reason": f"Текущий день стрика: {sd}"}
        if day_num in claimed:
            conn.close()
            return {"ok": False, "reason": "День уже получен"}

        reward = LOGIN_STREAK_SETS[ws][day_num - 1]
        gold = int(reward.get("gold") or 0)
        diamonds = int(reward.get("diamonds") or 0)
        xp = int(reward.get("xp") or 0)
        item = reward.get("item")

        # Выдать награду
        cur.execute(
            "UPDATE players SET gold=gold+?, diamonds=diamonds+?, exp=exp+? WHERE user_id=?",
            (gold, diamonds, xp, user_id),
        )

        # Добавить предмет в инвентарь если есть
        if item:
            try:
                self.add_to_inventory(user_id, item)
            except Exception as e:
                log.warning("streak item add failed uid=%s item=%s: %s", user_id, item, e)

        # Обновить claimed list
        claimed.append(day_num)

        # День 7 завершён — сбросить для нового цикла (week_set++)
        if day_num == 7:
            new_ws = (ws + 1) % 4
            cur.execute(
                "UPDATE login_streak_v2 SET streak_day=0, week_set=?, days_claimed_json=?, "
                "updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                (new_ws, json.dumps(claimed), user_id),
            )
        else:
            cur.execute(
                "UPDATE login_streak_v2 SET days_claimed_json=?, updated_at=CURRENT_TIMESTAMP "
                "WHERE user_id=?",
                (json.dumps(claimed), user_id),
            )

        conn.commit()
        conn.close()

        return {
            "ok": True,
            "day": day_num,
            "gold": gold,
            "diamonds": diamonds,
            "xp": xp,
            "item": item,
            "cycle_complete": day_num == 7,
        }
