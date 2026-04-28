"""Mixin: регистрация игрока на рейд (до старта).

Таблица world_boss_registrations связана со spawn_id запланированного (scheduled) спавна.
После старта рейда записи остаются — не мешают, не удаляются.
"""
from __future__ import annotations

import logging
from typing import Dict, Any

log = logging.getLogger(__name__)


class WorldBossRegistrationMixin:

    def wb_register(self, spawn_id: int, user_id: int) -> bool:
        """Зарегистрировать игрока на рейд. Возвращает True если запись новая."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        if cur.fetchone():
            conn.close()
            return False
        cur.execute(
            "INSERT OR IGNORE INTO world_boss_registrations (spawn_id, user_id) VALUES (?,?)",
            (int(spawn_id), int(user_id)),
        )
        conn.commit()
        conn.close()
        return True

    def wb_unregister(self, spawn_id: int, user_id: int) -> bool:
        """Отменить регистрацию. Возвращает True если запись была."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        changed = cur.rowcount > 0
        conn.commit()
        conn.close()
        return changed

    def wb_is_registered(self, spawn_id: int, user_id: int) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        found = cur.fetchone() is not None
        conn.close()
        return found

    def wb_create_auto_bot_states(self, spawn_id: int) -> int:
        """При старте рейда создаёт player_state для всех зарегистрированных
        игроков с флагом wb_auto_bot_pending=1. Помечает их auto_bot=1.
        Сбрасывает wb_auto_bot_pending. Возвращает число созданных ботов."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT r.user_id, p.max_hp, p.endurance, p.crit "
            "FROM world_boss_registrations r "
            "JOIN players p ON p.user_id = r.user_id "
            "WHERE r.spawn_id=? AND COALESCE(p.wb_auto_bot_pending, 0)=1",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        created = 0
        for r in rows:
            # sqlite3.Row не поддерживает .get() — обращаемся через [].
            # На Postgres (dict_row) тоже работает.
            uid = int(r["user_id"])
            try: mhp = int(r["max_hp"] or 100)
            except (KeyError, TypeError): mhp = 100
            try: end_ = int(r["endurance"] or 3)
            except (KeyError, TypeError): end_ = 3
            try: crt = int(r["crit"] or 3)
            except (KeyError, TypeError): crt = 3
            # Идемпотентно — если уже есть player_state, не дублируем.
            cur.execute(
                "SELECT 1 FROM world_boss_player_state WHERE spawn_id=? AND user_id=?",
                (int(spawn_id), uid),
            )
            if cur.fetchone():
                continue
            cur.execute(
                """INSERT INTO world_boss_player_state
                      (spawn_id, user_id, current_hp, max_hp, endurance, crit, auto_bot)
                      VALUES (?,?,?,?,?,?,1)""",
                (int(spawn_id), uid, mhp, mhp, end_, crt),
            )
            created += 1
        # Сбрасываем флаг у всех зарегистрированных на этот спавн.
        cur.execute(
            "UPDATE players SET wb_auto_bot_pending=0 WHERE user_id IN ("
            "SELECT user_id FROM world_boss_registrations WHERE spawn_id=?)",
            (int(spawn_id),),
        )
        conn.commit()
        conn.close()
        return created

    def wb_auto_bots_strike(self, spawn_id: int) -> int:
        """Тик авто-ботов: каждый живой бот наносит 30% от своей strength.
        Возвращает суммарный нанесённый урон.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT ps.user_id, p.strength "
            "FROM world_boss_player_state ps "
            "JOIN players p ON p.user_id = ps.user_id "
            "WHERE ps.spawn_id=? AND ps.auto_bot=1 AND ps.is_dead=0",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        conn.close()
        if not rows:
            return 0
        total = 0
        for r in rows:
            uid = int(r["user_id"])
            try: strength = int(r["strength"] or 10)
            except (KeyError, TypeError): strength = 10
            dmg = max(1, int(strength * 0.30))
            try:
                self.log_wb_hit(spawn_id, uid, dmg, is_crit=False)
                self.apply_damage_to_boss(int(spawn_id), int(dmg))
                # Обновляем total_damage в player_state.
                conn2 = self.get_connection()
                cur2 = conn2.cursor()
                cur2.execute(
                    "UPDATE world_boss_player_state SET total_damage = total_damage + ?, "
                    "hits_count = hits_count + 1 WHERE spawn_id=? AND user_id=?",
                    (int(dmg), int(spawn_id), uid),
                )
                conn2.commit()
                conn2.close()
                total += dmg
            except Exception as e:
                log.warning("wb_auto_bots_strike: ошибка удара uid=%s: %s", uid, e)
        return total

    def wb_registration_count(self, spawn_id: int) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        # AS c — иначе на Postgres (dict_row) row['count'], на SQLite row[0].
        # С алиасом обе БД отдают строку с ключом 'c'.
        cur.execute(
            "SELECT COUNT(*) AS c FROM world_boss_registrations WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return 0
        try:
            return int(row["c"])
        except (KeyError, TypeError):
            return int(row[0])  # fallback для SQLite если row — tuple

    def wb_list_registered_with_info(self, spawn_id: int, limit: int = 100) -> list:
        """Список зарегистрированных юзеров с ник/уровень/эмодзи для комнаты
        ожидания. Сортировка по дате регистрации (кто раньше — первый)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT r.user_id, NULLIF(p.username,'') AS username, "
            "COALESCE(p.level,1) AS level, COALESCE(p.strength,10) AS strength, "
            "COALESCE(p.max_hp,100) AS max_hp "
            "FROM world_boss_registrations r "
            "LEFT JOIN players p ON p.user_id = r.user_id "
            "WHERE r.spawn_id=? "
            "ORDER BY r.created_at ASC LIMIT ?",
            (int(spawn_id), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]
