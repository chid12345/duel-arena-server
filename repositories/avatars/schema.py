"""Схемы БД для образов и элит-билдов."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from config import ELITE_AVATAR_ID, ELITE_AVATAR_STARS, ELITE_AVATAR_USDT, SUB_AVATAR_ID, REF_AVATAR_ID, REF_AVATAR_THRESHOLD


class AvatarsSchemaMixin:
    def _ensure_avatar_schema(self, cursor) -> None:
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS user_avatar_unlocks (
                user_id INTEGER NOT NULL,
                avatar_id TEXT NOT NULL,
                source TEXT DEFAULT 'shop',
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, avatar_id)
            )"""
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_avatar_unlocks_user ON user_avatar_unlocks (user_id)"
        )
        is_pg = bool(getattr(self, "_pg", False))
        if is_pg:
            for col_name, col_def in [
                ("equipped_avatar_id", "TEXT"),
                ("avatar_bonus_applied", "INTEGER DEFAULT 0"),
            ]:
                cursor.execute(
                    "SELECT 1 FROM information_schema.columns"
                    " WHERE table_name='players' AND column_name=%s LIMIT 1",
                    (col_name,),
                )
                if not bool(cursor.fetchone()):
                    cursor.execute(f"ALTER TABLE players ADD COLUMN {col_name} {col_def}")
        else:
            cursor.execute("PRAGMA table_info(players)")
            cols = {r[1] for r in cursor.fetchall()}
            if "equipped_avatar_id" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN equipped_avatar_id TEXT")
            if "avatar_bonus_applied" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")

    def _ensure_elite_builds_schema(self, cursor) -> None:
        cursor.execute(
            """CREATE TABLE IF NOT EXISTS user_elite_builds (
                build_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT DEFAULT 'Император',
                alloc_strength INTEGER DEFAULT 0,
                alloc_endurance INTEGER DEFAULT 0,
                alloc_crit INTEGER DEFAULT 0,
                alloc_stamina INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 0,
                resets_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_elite_builds_user ON user_elite_builds (user_id)"
        )

    def _elite_half_price(self) -> Dict[str, Any]:
        try:
            usdt = round(float(str(ELITE_AVATAR_USDT)) * 0.5, 2)
        except Exception:
            usdt = 5.99
        stars = max(1, int(int(ELITE_AVATAR_STARS) * 0.5))
        return {"usdt": f"{usdt:.2f}", "stars": stars}

    def _elite_build_points_used(self, row: Any) -> int:
        return (
            int(self._row_get(row, "alloc_strength", 0) or 0)
            + int(self._row_get(row, "alloc_endurance", 0) or 0)
            + int(self._row_get(row, "alloc_crit", 0) or 0)
            + int(self._row_get(row, "alloc_stamina", 0) or 0)
        )

    def _ensure_default_elite_build(self, cursor, user_id: int) -> None:
        self._ensure_elite_builds_schema(cursor)
        cursor.execute(
            "SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ? LIMIT 1",
            (user_id, ELITE_AVATAR_ID),
        )
        if not cursor.fetchone():
            return
        cursor.execute("SELECT 1 FROM user_elite_builds WHERE user_id = ? LIMIT 1", (user_id,))
        if cursor.fetchone():
            return
        bid = f"elite_{uuid.uuid4().hex[:12]}"
        cursor.execute(
            """INSERT INTO user_elite_builds
               (build_id, user_id, title, alloc_strength, alloc_endurance, alloc_crit, alloc_stamina, is_active, resets_used)
               VALUES (?, ?, 'Император #1', 0, 0, 0, 0, 1, 0)""",
            (bid, user_id),
        )

    def _get_active_elite_build(self, cursor, user_id: int) -> Optional[Any]:
        self._ensure_default_elite_build(cursor, user_id)
        cursor.execute(
            "SELECT * FROM user_elite_builds WHERE user_id = ? AND is_active = 1 LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return row
        cursor.execute(
            "SELECT * FROM user_elite_builds WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE user_elite_builds SET is_active = 0 WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE user_elite_builds SET is_active = 1 WHERE user_id = ? AND build_id = ?",
                (user_id, self._row_get(row, "build_id")),
            )
        return row

    def _ensure_avatar_rows(self, cursor, user_id: int) -> None:
        self._ensure_avatar_schema(cursor)
        self._ensure_elite_builds_schema(cursor)
        for aid in self._BASE_AVATAR_IDS:
            cursor.execute(
                """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                   VALUES (?, ?, 'base')
                   ON CONFLICT (user_id, avatar_id) DO NOTHING""",
                (user_id, aid),
            )
        # Реферальный образ — авто-разблокировка при ≥5 рефералах
        try:
            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id = ?", (user_id,),
            )
            ref_row = cursor.fetchone()
            if ref_row and int(self._row_get(ref_row, "cnt", 0) or 0) >= REF_AVATAR_THRESHOLD:
                cursor.execute(
                    """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                       VALUES (?, ?, 'referral')
                       ON CONFLICT (user_id, avatar_id) DO NOTHING""",
                    (user_id, REF_AVATAR_ID),
                )
        except Exception:
            pass  # таблица referrals может не существовать в тестах

        # Подписочный образ — разблокируется при первой активации Premium
        try:
            cursor.execute(
                "SELECT premium_until FROM players WHERE user_id = ?", (user_id,),
            )
            prem_row = cursor.fetchone()
            if prem_row and self._row_get(prem_row, "premium_until"):
                cursor.execute(
                    """INSERT INTO user_avatar_unlocks (user_id, avatar_id, source)
                       VALUES (?, ?, 'subscription')
                       ON CONFLICT (user_id, avatar_id) DO NOTHING""",
                    (user_id, SUB_AVATAR_ID),
                )
        except Exception:
            pass

        cursor.execute("SELECT equipped_avatar_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and not self._row_get(row, "equipped_avatar_id"):
            cursor.execute(
                "UPDATE players SET equipped_avatar_id = 'base_neutral' WHERE user_id = ?",
                (user_id,),
            )

        # Одноразовое применение бонуса образа к статам
        self._apply_initial_avatar_bonus(cursor, user_id)
