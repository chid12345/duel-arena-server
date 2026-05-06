"""Mixin: core — task_progress/task_claims CRUD + трекинг покупок/использования."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Set

log = logging.getLogger(__name__)

_ISO_WEEK = lambda: (lambda d: f"{d[0]}-W{d[1]:02d}")(datetime.utcnow().isocalendar())
_TODAY = lambda: datetime.now().date().isoformat()


class ProgressCoreMixin:
    # ── Базовые методы task_progress / task_claims ─────────────────────

    def get_task_progress(self, user_id: int, task_key: str) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT value FROM task_progress WHERE user_id=? AND task_key=?",
                    (user_id, task_key))
        row = cur.fetchone()
        conn.close()
        return int(row["value"]) if row else 0

    def add_task_progress(self, user_id: int, task_key: str, amount: int = 1) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        if getattr(self, "_pg", False):
            cur.execute(
                "INSERT INTO task_progress (user_id, task_key, value) VALUES (%s,%s,%s) "
                "ON CONFLICT (user_id, task_key) DO UPDATE SET value=task_progress.value+%s, updated_at=CURRENT_TIMESTAMP",
                (user_id, task_key, amount, amount),
            )
            cur.execute("SELECT value FROM task_progress WHERE user_id=%s AND task_key=%s",
                        (user_id, task_key))
        else:
            cur.execute(
                "INSERT OR IGNORE INTO task_progress (user_id, task_key, value) VALUES (?,?,0)",
                (user_id, task_key),
            )
            cur.execute(
                "UPDATE task_progress SET value=value+?, updated_at=CURRENT_TIMESTAMP "
                "WHERE user_id=? AND task_key=?",
                (amount, user_id, task_key),
            )
            cur.execute("SELECT value FROM task_progress WHERE user_id=? AND task_key=?",
                        (user_id, task_key))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return int(row["value"]) if row else amount

    def _add_task_progress_batch(self, user_id: int, items: list) -> None:
        """Батч-обновление прогресса в одном connection.
        items = [(task_key, amount), ...].  Используется track_purchase,
        иначе одна покупка = 5 open/close."""
        if not items:
            return
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            if getattr(self, "_pg", False):
                for task_key, amount in items:
                    cur.execute(
                        "INSERT INTO task_progress (user_id, task_key, value) VALUES (%s,%s,%s) "
                        "ON CONFLICT (user_id, task_key) DO UPDATE SET value=task_progress.value+%s, updated_at=CURRENT_TIMESTAMP",
                        (user_id, task_key, amount, amount),
                    )
            else:
                for task_key, amount in items:
                    cur.execute(
                        "INSERT OR IGNORE INTO task_progress (user_id, task_key, value) VALUES (?,?,0)",
                        (user_id, task_key),
                    )
                    cur.execute(
                        "UPDATE task_progress SET value=value+?, updated_at=CURRENT_TIMESTAMP "
                        "WHERE user_id=? AND task_key=?",
                        (amount, user_id, task_key),
                    )
            conn.commit()
        finally:
            conn.close()

    def has_task_claim(self, user_id: int, claim_key: str) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM task_claims WHERE user_id=? AND claim_key=?",
                    (user_id, claim_key))
        result = cur.fetchone() is not None
        conn.close()
        return result

    def add_task_claim(self, user_id: int, claim_key: str) -> bool:
        """Атомарно «застолбить» клейм. True только если реально ВСТАВИЛИ —
        второй параллельный запрос получит False, иначе одна награда
        выдавалась бы дважды (race check-then-act в claim_daily_task)."""
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            if getattr(self, "_pg", False):
                cur.execute(
                    "INSERT INTO task_claims (user_id, claim_key) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                    (user_id, claim_key))
            else:
                cur.execute("INSERT OR IGNORE INTO task_claims (user_id, claim_key) VALUES (?,?)",
                            (user_id, claim_key))
            inserted = cur.rowcount > 0
            conn.commit()
            return inserted
        except Exception as e:
            log.warning("add_task_claim error: %s", e)
            return False
        finally:
            conn.close()

    # ── Батчевая загрузка всех данных за 2 запроса ────────────────────

    def _fetch_user_tasks_batch(self, user_id: int):
        """Вернуть (progress_dict, claims_set) одним подключением."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT task_key, value FROM task_progress WHERE user_id=?", (user_id,))
        progress = {r["task_key"]: int(r["value"]) for r in cur.fetchall()}
        cur.execute("SELECT claim_key FROM task_claims WHERE user_id=?", (user_id,))
        claims: Set[str] = {r["claim_key"] for r in cur.fetchall()}
        conn.close()
        return progress, claims

    # ── Трекинг покупок и использования предметов ──────────────────────

    def track_purchase(self, user_id: int, item_id: str, currency: str, price: int) -> None:
        try:
            batch: list = []
            if currency == "gold" and price > 0:
                w = _ISO_WEEK()
                batch += [("ach_buy_gold", 1), ("ach_spend_gold", price),
                          (f"wq_buy_gold_{w}", 1), (f"wq_spend_gold_{w}", price)]
            elif currency == "diamonds" and price > 0:
                batch += [("ach_buy_diamonds", 1), ("ach_spend_diamonds", price)]
            elif currency in ("stars", "usdt"):
                batch += [("ach_buy_premium", 1)]
            # Коллекция образов — только реальные аватары из каталога,
            # иначе buff/расходник с префиксом (gold_hunt и т.п.) фармит ачивку.
            try:
                from config.avatar_catalog import AVATAR_CATALOG
                _av = next((a for a in AVATAR_CATALOG if a.get("id") == item_id), None)
            except Exception:
                _av = None
            if _av:
                tier = _av.get("tier")
                if tier == "gold":
                    batch.append(("ach_collect_avatar_gold", 1))
                elif tier == "diamond":
                    batch.append(("ach_collect_avatar_dia", 1))
                elif tier in ("premium", "elite"):
                    batch.append(("ach_collect_avatar_premium", 1))
            # Один connection на всю пачку вместо open/close на каждый ключ.
            self._add_task_progress_batch(user_id, batch)
            if currency in ("gold", "diamonds", "stars", "usdt") and (price > 0 or currency in ("stars", "usdt")):
                self._incr_daily_shop_buys(user_id)
        except Exception as e:
            log.warning("track_purchase error: %s", e)

    def track_item_use(self, user_id: int, item_id: str) -> None:
        try:
            if item_id in ("hp_small", "hp_medium", "hp_full"):
                self.add_task_progress(user_id, "ach_use_potions", 1)
                self.add_task_progress(user_id, f"wq_use_potions_{_ISO_WEEK()}", 1)
                if item_id == "hp_small":
                    self.add_task_progress(user_id, "ach_use_hp_small", 1)
            elif item_id.startswith("scroll_"):
                self.add_task_progress(user_id, "ach_use_scrolls", 1)
        except Exception as e:
            log.warning("track_item_use error: %s", e)

    def _incr_daily_shop_buys(self, user_id: int) -> None:
        today = _TODAY()
        conn = self.get_connection()
        cur = conn.cursor()
        if getattr(self, "_pg", False):
            cur.execute(
                "INSERT INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) "
                "VALUES (%s,%s,0,0,0) ON CONFLICT (user_id, quest_date) DO NOTHING",
                (user_id, today),
            )
            cur.execute("UPDATE daily_quests SET shop_buys=shop_buys+1 WHERE user_id=%s AND quest_date=%s",
                        (user_id, today))
        else:
            cur.execute(
                "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?,?,0,0,0)",
                (user_id, today),
            )
            cur.execute("UPDATE daily_quests SET shop_buys=shop_buys+1 WHERE user_id=? AND quest_date=?",
                        (user_id, today))
        conn.commit()
        conn.close()
