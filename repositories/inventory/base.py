"""Схема user_inventory, чтение текущего класса, вектор статов класса."""

from __future__ import annotations

from typing import Any, Dict, Optional

from config import (
    DIAMONDS_CLASSES,
    FREE_CLASSES,
    GOLD_CLASSES,
    STAMINA_PER_FREE_STAT,
    USDT_CLASS_BASE,
)


class InventoryBaseMixin:
    @staticmethod
    def _row_get(row: Any, key: str, default: Any = None) -> Any:
        if row is None:
            return default
        if isinstance(row, dict):
            return row.get(key, default)
        try:
            return row[key]
        except Exception:
            return default

    def _player_current_class_info(self, cursor, user_id: int) -> Optional[Dict]:
        """Источник истины: players.current_class(+type)."""
        cursor.execute("SELECT current_class, current_class_type FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        class_id = (self._row_get(row, "current_class") or "").strip()
        class_type = (self._row_get(row, "current_class_type") or "").strip()
        if not class_id or not class_type:
            return None
        if class_type == "free" and class_id in FREE_CLASSES:
            return {**FREE_CLASSES[class_id], "class_id": class_id, "class_type": "free"}
        if class_type == "gold" and class_id in GOLD_CLASSES:
            return {**GOLD_CLASSES[class_id], "class_id": class_id, "class_type": "gold"}
        if class_type == "diamonds" and class_id in DIAMONDS_CLASSES:
            return {**DIAMONDS_CLASSES[class_id], "class_id": class_id, "class_type": "diamonds"}
        if class_type == "usdt" and class_id.startswith("usdt_custom_"):
            return {**USDT_CLASS_BASE, "class_id": class_id, "class_type": "usdt"}
        return None

    def _ensure_inventory_schema(self, cursor) -> None:
        """Safety net: гарантирует наличие user_inventory и полей классов в players."""
        is_pg = bool(getattr(self, "_pg", False))
        if is_pg:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS user_inventory (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    class_id TEXT NOT NULL,
                    class_type TEXT NOT NULL,
                    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    equipped BOOLEAN DEFAULT FALSE,
                    custom_name TEXT,
                    strength_saved INTEGER DEFAULT 0,
                    agility_saved INTEGER DEFAULT 0,
                    intuition_saved INTEGER DEFAULT 0,
                    endurance_saved INTEGER DEFAULT 0,
                    stamina_saved INTEGER DEFAULT 0,
                    free_stats_saved INTEGER DEFAULT 0,
                    max_hp_saved INTEGER DEFAULT 0,
                    current_hp_saved INTEGER DEFAULT 0,
                    UNIQUE(user_id, class_id)
                )"""
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory (user_id, class_type)")
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_inventory (user_id, equipped) WHERE equipped = TRUE"
            )
            for col in ("current_class", "current_class_type"):
                cursor.execute(
                    """SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'players' AND column_name = %s LIMIT 1""",
                    (col,),
                )
                if not cursor.fetchone():
                    cursor.execute(f"ALTER TABLE players ADD COLUMN {col} TEXT")

            for col in ("stamina_saved", "max_hp_saved", "current_hp_saved"):
                cursor.execute(
                    """SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'user_inventory' AND column_name = %s LIMIT 1""",
                    (col,),
                )
                if not cursor.fetchone():
                    cursor.execute(f"ALTER TABLE user_inventory ADD COLUMN {col} INTEGER DEFAULT 0")

            cursor.execute(
                """SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_inventory' AND column_name = 'passive_type' LIMIT 1"""
            )
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE user_inventory ADD COLUMN passive_type TEXT")
        else:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS user_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    class_id TEXT NOT NULL,
                    class_type TEXT NOT NULL,
                    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    equipped BOOLEAN DEFAULT FALSE,
                    custom_name TEXT,
                    strength_saved INTEGER DEFAULT 0,
                    agility_saved INTEGER DEFAULT 0,
                    intuition_saved INTEGER DEFAULT 0,
                    endurance_saved INTEGER DEFAULT 0,
                    stamina_saved INTEGER DEFAULT 0,
                    free_stats_saved INTEGER DEFAULT 0,
                    max_hp_saved INTEGER DEFAULT 0,
                    current_hp_saved INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
                    UNIQUE(user_id, class_id)
                )"""
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory (user_id, class_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_inventory (user_id, equipped) WHERE equipped = TRUE")
            cursor.execute("PRAGMA table_info(players)")
            cols = {r[1] for r in cursor.fetchall()}
            if "current_class" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN current_class TEXT")
            if "current_class_type" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN current_class_type TEXT")

            cursor.execute("PRAGMA table_info(user_inventory)")
            inv_cols = {r[1] for r in cursor.fetchall()}
            if "stamina_saved" not in inv_cols:
                cursor.execute("ALTER TABLE user_inventory ADD COLUMN stamina_saved INTEGER DEFAULT 0")
            if "max_hp_saved" not in inv_cols:
                cursor.execute("ALTER TABLE user_inventory ADD COLUMN max_hp_saved INTEGER DEFAULT 0")
            if "current_hp_saved" not in inv_cols:
                cursor.execute("ALTER TABLE user_inventory ADD COLUMN current_hp_saved INTEGER DEFAULT 0")
            if "passive_type" not in inv_cols:
                cursor.execute("ALTER TABLE user_inventory ADD COLUMN passive_type TEXT")

    @staticmethod
    def _class_stat_vector(class_info: Optional[Dict]) -> Dict[str, int]:
        if not class_info:
            return {"strength": 0, "endurance": 0, "crit": 0, "max_hp": 0}
        return {
            "strength": int(class_info.get("bonus_strength", 0) or 0),
            "endurance": int(class_info.get("bonus_agility", 0) or 0),
            "crit": int(class_info.get("bonus_intuition", 0) or 0),
            "max_hp": int(class_info.get("bonus_endurance", 0) or 0) * int(STAMINA_PER_FREE_STAT),
        }

    def _equipped_inventory_class_info(self, cursor, user_id: int) -> Optional[Dict]:
        cur_info = self._player_current_class_info(cursor, user_id)
        if cur_info and cur_info.get("class_type") != "usdt":
            return cur_info
        cursor.execute(
            "SELECT class_id FROM user_inventory WHERE user_id = ? AND equipped = TRUE LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return self.get_class_info(row["class_id"])
