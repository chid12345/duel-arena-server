"""Каталог предметов экипировки. Слоты: weapon/shield/armor/belt/boots/ring1/ring2."""
from __future__ import annotations

from db_schema.weapon_catalog import WEAPON_CATALOG

# Редкости
RARITY_COMMON  = "common"
RARITY_RARE    = "rare"
RARITY_EPIC    = "epic"

RARITY_EMOJI = {
    RARITY_COMMON: "⚪",
    RARITY_RARE:   "🔵",
    RARITY_EPIC:   "🟣",
}

RARITY_LABEL = {
    RARITY_COMMON: "Обычный",
    RARITY_RARE:   "Редкий",
    RARITY_EPIC:   "Эпический",
}

# Слоты
SLOT_WEAPON = "weapon"
SLOT_SHIELD = "shield"
SLOT_ARMOR  = "armor"
SLOT_BELT   = "belt"
SLOT_BOOTS  = "boots"
SLOT_RING1  = "ring1"
SLOT_RING2  = "ring2"

ALL_SLOTS = [SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1, SLOT_RING2]

SLOT_LABEL = {
    SLOT_WEAPON: ("🗡️", "Оружие"),
    SLOT_SHIELD: ("🛡️", "Щит"),
    SLOT_ARMOR:  ("🥋", "Броня"),
    SLOT_BELT:   ("🪢", "Пояс"),
    SLOT_BOOTS:  ("👟", "Ботинки"),
    SLOT_RING1:  ("💍", "Кольцо 1"),
    SLOT_RING2:  ("💍", "Кольцо 2"),
}

# Статы предмета:
#   atk_bonus  — плоский бонус к урону
#   def_pct    — % снижения входящего урона (0.03 = 3%)
#   hp_bonus   — плоский бонус к HP
#   crit_bonus — плоский бонус к стату крита

EQUIPMENT_CATALOG: dict[str, dict] = {
    # ── ОРУЖИЕ ──────────────────────────────────────────────
    "sword_iron": {
        "slot": SLOT_WEAPON, "rarity": RARITY_COMMON,
        "name": "Железный меч", "emoji": "🗡️",
        "atk_bonus": 8, "price_gold": 300,
        "desc": "+8 к урону",
    },
    "sword_steel": {
        "slot": SLOT_WEAPON, "rarity": RARITY_RARE,
        "name": "Стальной меч", "emoji": "⚔️",
        "atk_bonus": 20, "price_gold": 1200,
        "desc": "+20 к урону",
    },
    "sword_chaos": {
        "slot": SLOT_WEAPON, "rarity": RARITY_EPIC,
        "name": "Клинок Хаоса", "emoji": "🌀",
        "atk_bonus": 40, "price_gold": 0, "price_diamonds": 25,
        "desc": "+40 к урону",
    },
    # ── БРОНЯ ────────────────────────────────────────────────
    "armor_leather": {
        "slot": SLOT_ARMOR, "rarity": RARITY_COMMON,
        "name": "Кожаная броня", "emoji": "🥋",
        "def_pct": 0.02, "hp_bonus": 30, "price_gold": 350,
        "desc": "-2% урона врага, +30 HP",
    },
    "armor_chain": {
        "slot": SLOT_ARMOR, "rarity": RARITY_RARE,
        "name": "Кольчуга", "emoji": "🥋",
        "def_pct": 0.05, "hp_bonus": 80, "price_gold": 1400,
        "desc": "-5% урона врага, +80 HP",
    },
    "armor_dragon": {
        "slot": SLOT_ARMOR, "rarity": RARITY_EPIC,
        "name": "Броня Дракона", "emoji": "🐉",
        "def_pct": 0.10, "hp_bonus": 180, "price_gold": 0, "price_diamonds": 30,
        "desc": "-10% урона врага, +180 HP",
    },
    # ── ШЛЕМЫ (belt slot) ────────────────────────────────────
    # Бесплатные — каждый = одна роль, чистый стат
    "helmet_free1": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Танка", "emoji": "⛑️",
        "hp_bonus": 60,
        "desc": "+60 HP — чистый запас жизни",
    },
    "helmet_free2": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Стража", "emoji": "⛑️",
        "def_pct": 0.03,
        "desc": "-3% урона врага",
    },
    "helmet_free3": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Охотника", "emoji": "⛑️",
        "atk_bonus": 8,
        "desc": "+8 к урону",
    },
    "helmet_free4": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Дуэлянта", "emoji": "⛑️",
        "crit_bonus": 4,
        "desc": "+4 крит — для крит-билдов",
    },
    # За золото — двойные синергии
    "helmet_gold1": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Берсерка", "emoji": "⛑️",
        "atk_bonus": 18, "crit_bonus": 5, "price_gold": 1200,
        "desc": "+18 урона, +5 крит",
    },
    "helmet_gold2": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Крепости", "emoji": "⛑️",
        "def_pct": 0.06, "hp_bonus": 90, "price_gold": 1500,
        "desc": "-6% урона врага, +90 HP",
    },
    "helmet_gold3": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Снайпера", "emoji": "⛑️",
        "crit_bonus": 9, "atk_bonus": 14, "price_gold": 1800,
        "desc": "+9 крит, +14 урона",
    },
    "helmet_gold4": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Паладина", "emoji": "⛑️",
        "atk_bonus": 10, "def_pct": 0.04, "hp_bonus": 55, "price_gold": 2200,
        "desc": "+10 урона, -4% урона врага, +55 HP",
    },
    # За алмазы — мощные или уникальные комбо
    "helmet_dia1": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Демона", "emoji": "⛑️",
        "atk_bonus": 30, "crit_bonus": 10, "price_gold": 0, "price_diamonds": 25,
        "desc": "+30 урона, +10 крит — чистый урон",
    },
    "helmet_dia2": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Стальная Крепость", "emoji": "⛑️",
        "def_pct": 0.09, "hp_bonus": 150, "price_gold": 0, "price_diamonds": 35,
        "desc": "-9% урона врага, +150 HP — монолит защиты",
    },
    "helmet_dia3": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Арканы", "emoji": "⛑️",
        "crit_bonus": 14, "def_pct": 0.05, "price_gold": 0, "price_diamonds": 50,
        "desc": "+14 крит, -5% урона врага — крит + выживание",
    },
    "helmet_dia4": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Разрушителя", "emoji": "⛑️",
        "atk_bonus": 38, "hp_bonus": 70, "pen_pct": 0.02, "price_gold": 0, "price_diamonds": 70,
        "desc": "+38 урона, +70 HP, +2% пробой брони",
    },
    # Мифические — топ-тир, каждый = уникальный стиль игры
    "helmet_mythic1": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Дракона", "emoji": "🐲",
        "atk_bonus": 42, "def_pct": 0.10, "hp_bonus": 160,
        "price_stars": 590,
        "desc": "+42 урона, -10% урона врага, +160 HP — универсал",
    },
    "helmet_mythic2": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Корона Воителя", "emoji": "👑",
        "atk_bonus": 35, "crit_bonus": 16, "def_pct": 0.06,
        "price_stars": 590,
        "desc": "+35 урона, +16 крит, -6% урона врага — для агрессоров",
    },
    "helmet_mythic3": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Маска Смерти", "emoji": "💀",
        "atk_bonus": 50, "crit_bonus": 14, "pen_pct": 0.03,
        "price_stars": 590,
        "desc": "+50 урона, +14 крит, +3% пробой — максимальный дамаг",
    },
    "helmet_mythic4": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Богов", "emoji": "⚡",
        "def_pct": 0.15, "hp_bonus": 280, "crit_bonus": 12,
        "price_stars": 590,
        "desc": "-15% урона врага, +280 HP, +12 крит — неубиваемый",
    },
    # ── ЩИТЫ (shield slot) ──────────────────────────────────
    "shield_free1": {"slot": SLOT_SHIELD, "rarity": RARITY_COMMON, "name": "Щит Ополченца",     "emoji": "🛡️", "def_pct": 0.03, "str_bonus": 2, "desc": "-3% урона врага, +2 Сила"},
    "shield_free2": {"slot": SLOT_SHIELD, "rarity": RARITY_COMMON, "name": "Щит Стойкости",     "emoji": "🛡️", "hp_bonus": 50,  "agi_bonus": 2, "desc": "+50 HP, +2 Ловкость"},
    "shield_free3": {"slot": SLOT_SHIELD, "rarity": RARITY_COMMON, "name": "Щит Закалённого",   "emoji": "🛡️", "crit_resist_pct": 10, "intu_bonus": 2, "desc": "-10% крит-урон врага, +2 Интуиция"},
    "shield_free4": {"slot": SLOT_SHIELD, "rarity": RARITY_COMMON, "name": "Щит Дружинника",    "emoji": "🛡️", "def_pct": 0.02, "hp_bonus": 30, "str_bonus": 2, "desc": "-2% урона, +30 HP, +2 Сила"},
    "shield_gold1": {"slot": SLOT_SHIELD, "rarity": RARITY_RARE, "name": "Рыцарский Щит",       "emoji": "🛡️", "def_pct": 0.06, "str_bonus": 1, "agi_bonus": 1, "intu_bonus": 1, "price_gold": 1200, "desc": "-6% урона врага, +1 ко всем статам"},
    "shield_gold2": {"slot": SLOT_SHIELD, "rarity": RARITY_RARE, "name": "Щит Великана",        "emoji": "🛡️", "hp_bonus": 110, "str_bonus": 1, "agi_bonus": 1, "intu_bonus": 1, "price_gold": 1400, "desc": "+110 HP, +1 ко всем статам"},
    "shield_gold3": {"slot": SLOT_SHIELD, "rarity": RARITY_RARE, "name": "Щит Паладина",        "emoji": "🛡️", "crit_resist_pct": 18, "str_bonus": 1, "agi_bonus": 1, "intu_bonus": 1, "price_gold": 1700, "desc": "-18% крит-урон врага, +1 ко всем статам"},
    "shield_gold4": {"slot": SLOT_SHIELD, "rarity": RARITY_RARE, "name": "Щит Хранителя",       "emoji": "🛡️", "def_pct": 0.04, "hp_bonus": 60, "crit_resist_pct": 8, "str_bonus": 1, "agi_bonus": 1, "intu_bonus": 1, "price_gold": 2000, "desc": "-4% урона, +60 HP, -8% крит, +1 ко всем статам"},
    "shield_dia1":  {"slot": SLOT_SHIELD, "rarity": RARITY_EPIC, "name": "Щит Дракона",         "emoji": "🛡️", "def_pct": 0.10, "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "price_gold": 0, "price_diamonds": 25, "desc": "-10% урона врага, +2 ко всем статам"},
    "shield_dia2":  {"slot": SLOT_SHIELD, "rarity": RARITY_EPIC, "name": "Щит Колосса",         "emoji": "🛡️", "hp_bonus": 200, "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "price_gold": 0, "price_diamonds": 35, "desc": "+200 HP, +2 ко всем статам"},
    "shield_dia3":  {"slot": SLOT_SHIELD, "rarity": RARITY_EPIC, "name": "Щит Непоколебимого",  "emoji": "🛡️", "crit_resist_pct": 25, "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "price_gold": 0, "price_diamonds": 50, "desc": "-25% крит-урон врага, +2 ко всем статам"},
    "shield_dia4":  {"slot": SLOT_SHIELD, "rarity": RARITY_EPIC, "name": "Щит Арканы",          "emoji": "🛡️", "def_pct": 0.07, "hp_bonus": 90, "crit_resist_pct": 12, "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "price_gold": 0, "price_diamonds": 70, "desc": "-7% урона, +90 HP, -12% крит, +2 ко всем статам"},
    "shield_mythic1": {"slot": SLOT_SHIELD, "rarity": "mythic", "name": "Щит Судьбы",           "emoji": "🛡️", "def_pct": 0.14, "hp_bonus": 160, "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "price_stars": 590, "desc": "-14% урона, +160 HP, +4 ко всем статам"},
    "shield_mythic2": {"slot": SLOT_SHIELD, "rarity": "mythic", "name": "Щит Бессмертного",     "emoji": "🛡️", "hp_bonus": 300, "crit_resist_pct": 20, "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "price_stars": 590, "desc": "+300 HP, -20% крит-урон, +4 ко всем статам"},
    "shield_mythic3": {"slot": SLOT_SHIELD, "rarity": "mythic", "name": "Щит Рока",             "emoji": "🛡️", "def_pct": 0.08, "crit_resist_pct": 30, "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "price_stars": 590, "desc": "-8% урона, -30% крит-урон, +4 ко всем статам"},
    "shield_mythic4": {"slot": SLOT_SHIELD, "rarity": "mythic", "name": "Щит Богов",            "emoji": "🛡️", "def_pct": 0.10, "hp_bonus": 120, "crit_resist_pct": 18, "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "price_stars": 590, "desc": "-10% урона, +120 HP, -18% крит, +4 ко всем статам"},
    # ── КОЛЬЦА (ring1/ring2 slot) ────────────────────────────
    "ring_free1": {"slot": SLOT_RING1, "rarity": RARITY_COMMON, "name": "Кольцо Меткости",      "emoji": "💍", "accuracy": 3,          "desc": "+3% точность"},
    "ring_free2": {"slot": SLOT_RING1, "rarity": RARITY_COMMON, "name": "Кольцо Охотника",      "emoji": "💍", "anti_dodge_pct": 5,    "desc": "-5% уворот врага"},
    "ring_free3": {"slot": SLOT_RING1, "rarity": RARITY_COMMON, "name": "Кольцо Безмолвия",     "emoji": "💍", "silence_pct": 5,       "desc": "5% глушит крит врага"},
    "ring_free4": {"slot": SLOT_RING1, "rarity": RARITY_COMMON, "name": "Кольцо Оков",          "emoji": "💍", "slow_pct": 5,          "desc": "-5% двойной удар врага"},
    "ring_gold1": {"slot": SLOT_RING1, "rarity": RARITY_RARE, "name": "Кольцо Снайпера",        "emoji": "💍", "accuracy": 7,          "price_gold": 1100, "desc": "+7% точность"},
    "ring_gold2": {"slot": SLOT_RING1, "rarity": RARITY_RARE, "name": "Кольцо Преследователя",  "emoji": "💍", "anti_dodge_pct": 12,   "price_gold": 1400, "desc": "-12% уворот врага"},
    "ring_gold3": {"slot": SLOT_RING1, "rarity": RARITY_RARE, "name": "Кольцо Тишины",          "emoji": "💍", "silence_pct": 12,      "price_gold": 1700, "desc": "12% глушит крит врага"},
    "ring_gold4": {"slot": SLOT_RING1, "rarity": RARITY_RARE, "name": "Кольцо Замедления",      "emoji": "💍", "slow_pct": 12,         "price_gold": 2000, "desc": "-12% двойной удар врага"},
    "ring_dia1":  {"slot": SLOT_RING1, "rarity": RARITY_EPIC, "name": "Кольцо Ясновидца",       "emoji": "💍", "accuracy": 12,         "price_gold": 0, "price_diamonds": 25, "desc": "+12% точность"},
    "ring_dia2":  {"slot": SLOT_RING1, "rarity": RARITY_EPIC, "name": "Кольцо Неизбежности",    "emoji": "💍", "anti_dodge_pct": 20,   "price_gold": 0, "price_diamonds": 35, "desc": "-20% уворот врага"},
    "ring_dia3":  {"slot": SLOT_RING1, "rarity": RARITY_EPIC, "name": "Кольцо Молчания",        "emoji": "💍", "silence_pct": 20,      "price_gold": 0, "price_diamonds": 50, "desc": "20% глушит крит врага"},
    "ring_dia4":  {"slot": SLOT_RING1, "rarity": RARITY_EPIC, "name": "Кольцо Оцепенения",      "emoji": "💍", "slow_pct": 20,         "price_gold": 0, "price_diamonds": 70, "desc": "-20% двойной удар врага"},
    "ring_mythic1": {"slot": SLOT_RING1, "rarity": "mythic", "name": "Кольцо Провидца",         "emoji": "💍", "accuracy": 18,         "price_stars": 490, "desc": "+18% точность"},
    "ring_mythic2": {"slot": SLOT_RING1, "rarity": "mythic", "name": "Кольцо Рока",             "emoji": "💍", "anti_dodge_pct": 30,   "price_stars": 490, "desc": "-30% уворот врага"},
    "ring_mythic3": {"slot": SLOT_RING1, "rarity": "mythic", "name": "Кольцо Вечного Безмолвия","emoji": "💍", "silence_pct": 30,      "price_stars": 490, "desc": "30% глушит крит врага"},
    "ring_mythic4": {"slot": SLOT_RING1, "rarity": "mythic", "name": "Кольцо Паралича",         "emoji": "💍", "slow_pct": 30,         "price_stars": 490, "desc": "-30% двойной удар врага"},
    # ── САПОГИ (boots slot) ──────────────────────────────────
    # Бесплатные — уворот и регенерация (новая механика, кардинально отличается от шлемов)
    "boots_free1": {
        "slot": SLOT_BOOTS, "rarity": RARITY_COMMON,
        "name": "Сапоги Скорохода", "emoji": "👟",
        "dodge_bonus": 3,
        "desc": "+3% уворот — быстрые ноги",
    },
    "boots_free2": {
        "slot": SLOT_BOOTS, "rarity": RARITY_COMMON,
        "name": "Сапоги Выносливого", "emoji": "👟",
        "regen_bonus": 12, "regen_speed_pct": 10,
        "desc": "+12 HP/раунд, +10% скорость реген",
    },
    "boots_free3": {
        "slot": SLOT_BOOTS, "rarity": RARITY_COMMON,
        "name": "Сапоги Тени", "emoji": "👟",
        "dodge_bonus": 2, "regen_bonus": 8,
        "desc": "+2% уворот, +8 HP/раунд",
    },
    "boots_free4": {
        "slot": SLOT_BOOTS, "rarity": RARITY_COMMON,
        "name": "Кровавый след", "emoji": "👟",
        "lifesteal_pct": 3,
        "desc": "+3% вампиризм — 3% урона возвращается как HP",
    },
    # За золото — двойные синергии
    "boots_gold1": {
        "slot": SLOT_BOOTS, "rarity": RARITY_RARE,
        "name": "Сапоги Вихря", "emoji": "👟",
        "dodge_bonus": 7, "price_gold": 1100,
        "desc": "+7% уворот — мастер уклонения",
    },
    "boots_gold2": {
        "slot": SLOT_BOOTS, "rarity": RARITY_RARE,
        "name": "Сапоги Живучести", "emoji": "👟",
        "regen_bonus": 28, "regen_speed_pct": 20, "price_gold": 1400,
        "desc": "+28 HP/раунд, +20% скорость реген",
    },
    "boots_gold3": {
        "slot": SLOT_BOOTS, "rarity": RARITY_RARE,
        "name": "Сапоги Ветра", "emoji": "👟",
        "dodge_bonus": 5, "regen_bonus": 16, "regen_speed_pct": 10, "price_gold": 1700,
        "desc": "+5% уворот, +16 HP/раунд, +10% скорость реген",
    },
    "boots_gold4": {
        "slot": SLOT_BOOTS, "rarity": RARITY_RARE,
        "name": "Сапоги Кровопийцы", "emoji": "👟",
        "lifesteal_pct": 5, "price_gold": 2000,
        "desc": "+5% вампиризм — 5% урона возвращается как HP",
    },
    # За алмазы — мощные комбо
    "boots_dia1": {
        "slot": SLOT_BOOTS, "rarity": RARITY_EPIC,
        "name": "Сапоги Призрака", "emoji": "👟",
        "dodge_bonus": 13, "price_gold": 0, "price_diamonds": 25,
        "desc": "+13% уворот — мастер уклонения",
    },
    "boots_dia2": {
        "slot": SLOT_BOOTS, "rarity": RARITY_EPIC,
        "name": "Сапоги Жизненной Силы", "emoji": "👟",
        "regen_bonus": 48, "regen_speed_pct": 25, "price_gold": 0, "price_diamonds": 35,
        "desc": "+48 HP/раунд, +25% скорость реген",
    },
    "boots_dia3": {
        "slot": SLOT_BOOTS, "rarity": RARITY_EPIC,
        "name": "Сапоги Ловчего", "emoji": "👟",
        "dodge_bonus": 9, "regen_bonus": 22, "price_gold": 0, "price_diamonds": 50,
        "desc": "+9% уворот, +22 HP/раунд",
    },
    "boots_dia4": {
        "slot": SLOT_BOOTS, "rarity": RARITY_EPIC,
        "name": "Поступь Вампира", "emoji": "👟",
        "lifesteal_pct": 7, "price_gold": 0, "price_diamonds": 70,
        "desc": "+7% вампиризм — 7% урона возвращается как HP",
    },
    # Мифические — топ-тир
    "boots_mythic1": {
        "slot": SLOT_BOOTS, "rarity": "mythic",
        "name": "Сапоги Дракона", "emoji": "🐲",
        "dodge_bonus": 16, "regen_bonus": 22,
        "price_stars": 590,
        "desc": "+16% уворот, +22 HP/раунд — универсал",
    },
    "boots_mythic2": {
        "slot": SLOT_BOOTS, "rarity": "mythic",
        "name": "Поступь Бессмертия", "emoji": "💎",
        "regen_bonus": 65, "dodge_bonus": 5, "regen_speed_pct": 35,
        "price_stars": 590,
        "desc": "+65 HP/раунд, +5% уворот, +35% скорость реген",
    },
    "boots_mythic3": {
        "slot": SLOT_BOOTS, "rarity": "mythic",
        "name": "Сапоги Призрака Смерти", "emoji": "👻",
        "dodge_bonus": 20, "regen_speed_pct": 20,
        "price_stars": 590,
        "desc": "+20% уворот, +20% скорость реген",
    },
    "boots_mythic4": {
        "slot": SLOT_BOOTS, "rarity": "mythic",
        "name": "Сапоги Владыки Крови", "emoji": "🩸",
        "lifesteal_pct": 10,
        "price_stars": 590,
        "desc": "+10% вампиризм — каждые 100 урона = +10 HP обратно",
    },
}


# Merge weapon catalog (16 items: 4 types × 4 tiers)
EQUIPMENT_CATALOG.update(WEAPON_CATALOG)


def get_item(item_id: str) -> dict | None:
    return EQUIPMENT_CATALOG.get(item_id)


def get_items_for_slot(slot: str) -> list[dict]:
    return [
        {"id": k, **v}
        for k, v in EQUIPMENT_CATALOG.items()
        if v["slot"] == slot or (slot in (SLOT_RING1, SLOT_RING2) and v["slot"] == SLOT_RING1)
    ]


def get_item_stats(item_id: str) -> dict:
    """Возвращает только боевые бонусы предмета."""
    item = EQUIPMENT_CATALOG.get(item_id, {})
    return {
        "atk_bonus":    item.get("atk_bonus", 0),
        "def_pct":      item.get("def_pct", 0.0),
        "hp_bonus":     item.get("hp_bonus", 0),
        "crit_bonus":   item.get("crit_bonus", 0),
        "pen_pct":      item.get("pen_pct", 0.0),
        "dodge_bonus":  item.get("dodge_bonus", 0),
        "regen_bonus":  item.get("regen_bonus", 0),
        "lifesteal_pct": item.get("lifesteal_pct", 0),
        "crit_resist_pct": item.get("crit_resist_pct", 0),
        "str_bonus":  item.get("str_bonus", 0),
        "agi_bonus":  item.get("agi_bonus", 0),
        "intu_bonus": item.get("intu_bonus", 0),
        "double_pct": item.get("double_pct", 0),
        "gold_pct":   item.get("gold_pct", 0),
        "xp_pct":     item.get("xp_pct", 0),
        "accuracy":        item.get("accuracy", 0),
        "anti_dodge_pct":  item.get("anti_dodge_pct", 0),
        "silence_pct":     item.get("silence_pct", 0),
        "slow_pct":        item.get("slow_pct", 0),
        "regen_speed_pct": item.get("regen_speed_pct", 0),
    }
