"""SQLite migrations chunk 10 — унификация armor.

Этап:
- Создаём новые таблицы:
  - player_owned_armor (user_id, item_id) — что куплено, аналог player_owned_weapons
  - armor_custom_mods (user_id, item_id, str/agi/int/end_bonus, custom_name)
    для legendary_usdt (+19 свободных статов).
- Перенос исторических данных из user_inventory:
  - все купленные class_id → player_owned_armor (с маппингом legacy_id → item_id)
  - USDT custom stats → armor_custom_mods (item_id='armor_mythic4')

В этом коммите НЕ трогаем player_equipment и user_inventory. switch_class
продолжает работать как раньше (через user_inventory + players.current_class).
Dual-write начнётся в коммите 3.
"""
from __future__ import annotations


_LEGACY_TO_NEW = """CASE class_id
    WHEN 'tank_free' THEN 'armor_free1'
    WHEN 'agile_free' THEN 'armor_free2'
    WHEN 'crit_free' THEN 'armor_free3'
    WHEN 'universal_free' THEN 'armor_free4'
    WHEN 'berserker_gold' THEN 'armor_gold1'
    WHEN 'assassin_gold' THEN 'armor_gold2'
    WHEN 'mage_gold' THEN 'armor_gold3'
    WHEN 'paladin_gold' THEN 'armor_gold4'
    WHEN 'dragonknight_diamonds' THEN 'armor_dia1'
    WHEN 'shadowdancer_diamonds' THEN 'armor_dia2'
    WHEN 'archmage_diamonds' THEN 'armor_dia3'
    WHEN 'universal_diamonds' THEN 'armor_dia4'
    WHEN 'berserker_mythic' THEN 'armor_mythic1'
    WHEN 'assassin_mythic' THEN 'armor_mythic2'
    WHEN 'archmage_mythic' THEN 'armor_mythic3'
    WHEN 'legendary_usdt' THEN 'armor_mythic4'
    ELSE NULL
END"""


MIGRATIONS_PART10_ARMOR_UNIFY = [
    ("2026_05_18_001_player_owned_armor", [
        """CREATE TABLE IF NOT EXISTS player_owned_armor (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            owned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_player_owned_armor_user ON player_owned_armor (user_id)",
    ]),
    ("2026_05_18_002_armor_custom_mods", [
        """CREATE TABLE IF NOT EXISTS armor_custom_mods (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            str_bonus INTEGER NOT NULL DEFAULT 0,
            agi_bonus INTEGER NOT NULL DEFAULT 0,
            int_bonus INTEGER NOT NULL DEFAULT 0,
            end_bonus INTEGER NOT NULL DEFAULT 0,
            custom_name TEXT,
            applied INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_armor_custom_mods_user ON armor_custom_mods (user_id)",
    ]),
    ("2026_05_18_003_migrate_owned_armor_from_user_inventory", [
        f"""INSERT OR IGNORE INTO player_owned_armor (user_id, item_id, owned_at)
            SELECT user_id, {_LEGACY_TO_NEW} AS item_id, COALESCE(purchased_at, CURRENT_TIMESTAMP)
            FROM user_inventory
            WHERE {_LEGACY_TO_NEW} IS NOT NULL""",
    ]),
    ("2026_05_18_004_migrate_usdt_custom_mods", [
        """INSERT OR IGNORE INTO armor_custom_mods
            (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus, custom_name, applied)
            SELECT
                user_id,
                'armor_mythic4' AS item_id,
                COALESCE(strength_saved, 0),
                COALESCE(agility_saved, 0),
                COALESCE(intuition_saved, 0),
                COALESCE(endurance_saved, 0),
                custom_name,
                COALESCE(stats_applied, 0)
            FROM user_inventory
            WHERE class_type = 'usdt'""",
    ]),
    # Этап «снос legacy class-системы»: расширяем armor_custom_mods,
    # чтобы он полностью заменил user_inventory для USDT-кастомки.
    # Новые поля: free_stats_left (счётчик неразложенных очков, по умолчанию 19),
    # passive_type (боевая пассивка: damage_pct/double_hit/crit_dmg_pct/armor_pct).
    ("2026_05_18_005_armor_custom_mods_free_stats", [
        "ALTER TABLE armor_custom_mods ADD COLUMN free_stats_left INTEGER NOT NULL DEFAULT 19",
    ]),
    ("2026_05_18_006_armor_custom_mods_passive", [
        "ALTER TABLE armor_custom_mods ADD COLUMN passive_type TEXT",
    ]),
    ("2026_05_18_007_migrate_free_stats_passive_from_inventory", [
        """UPDATE armor_custom_mods
            SET free_stats_left = COALESCE(
                (SELECT free_stats_saved FROM user_inventory
                 WHERE user_inventory.user_id = armor_custom_mods.user_id
                   AND user_inventory.class_type = 'usdt' LIMIT 1),
                19),
                passive_type = (SELECT passive_type FROM user_inventory
                                WHERE user_inventory.user_id = armor_custom_mods.user_id
                                  AND user_inventory.class_type = 'usdt' LIMIT 1)
            WHERE item_id = 'armor_mythic4'""",
    ]),
]
