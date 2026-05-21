"""Броня (slot=armor2). Чистый перезапуск после сноса старого armor.

16 предметов: 4 common + 4 rare + 4 epic + 4 mythic. Аналогично остальным
слотам (helmet/shield/weapon/boots/ring). Хранение:
- player_owned_weapons (item_id LIKE 'armor2_%') — что куплено (общая таблица)
- armor2_custom_mods (только для armor2_mythic4: +19 свободных статов
  и custom_name).

РОЛЬ БРОНИ (2026_05_21): «защита тела». В отличие от щита/шлема (глобальная
защита от любого удара) броня даёт ЗОНАЛЬНУЮ защиту — срабатывает только когда
враг бьёт в ТУЛОВИЩЕ (body_def_pct). Зоны боя: ГОЛОВА/ТУЛОВИЩЕ/НОГИ.

Поля статов суммируются в get_equipment_stats:
- str_bonus/agi_bonus/intu_bonus/hp_bonus — обычные статы;
- body_def_pct — зональная защита тела (новое, у ВСЕЙ брони, по редкости 3/6/9/15%);
- crit_resist_pct — у №3 (магическая): режет крит-урон врага;
- def_pct — у №4 (баланс): глобальная защита, как у щита/шлема.
Шкала по редкости: common→rare→epic→mythic.

armor2_mythic4 (Светоносный Бог) — особый: 0 базовых статов, +19 свободных через
armor2_custom_mods, выбор пассивки. Не участвует в зональной схеме (чистый лист).

Скины (texture_key) переиспользуют PNG из webapp/ (armor_free1.png и т.д.).
"""
from __future__ import annotations

ARMOR2: dict[str, dict] = {
    # ── Обычные (common) — 800 gold, T1, уровень 1 · HP +40 · защита тела −3% ──
    "armor2_free1": {
        "slot": "armor2", "rarity": "common",
        "name": "Кираса Ополченца", "emoji": "🛡",
        "str_bonus": 5, "hp_bonus": 40, "body_def_pct": 0.03, "reflect_pct": 4,
        "special_bonus": "Защита тела −3% · 🪞 Шипы 4% · +40 HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free1",
        "desc": "+5 силы, +40 HP, −3% по телу, 🪞 шипы 4% (возврат урона)",
    },
    "armor2_free2": {
        "slot": "armor2", "rarity": "common",
        "name": "Жилет Следопыта", "emoji": "🛡",
        "agi_bonus": 5, "hp_bonus": 40, "body_def_pct": 0.03, "block_chance": 3,
        "special_bonus": "Защита тела −3% · 🛡 Блок 3% · +40 HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free2",
        "desc": "+5 ловкости, +40 HP, −3% по телу, 🛡 блок 3% (шанс погасить удар)",
    },
    "armor2_free3": {
        "slot": "armor2", "rarity": "common",
        "name": "Роба Ученика", "emoji": "🛡",
        "intu_bonus": 5, "hp_bonus": 40, "body_def_pct": 0.03, "crit_resist_pct": 3,
        "special_bonus": "Защита тела −3% · −3% крит врага · +40 HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free3",
        "desc": "+5 интуиции, +40 HP, −3% урона по телу, −3% крит врага",
    },
    "armor2_free4": {
        "slot": "armor2", "rarity": "common",
        "name": "Плащ Странника", "emoji": "🛡",
        "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "hp_bonus": 40,
        "body_def_pct": 0.03, "def_pct": 0.02,
        "special_bonus": "Защита тела −3% · защита −2% от всего · +40 HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free4",
        "desc": "+2 ко всем статам, +40 HP, −3% по телу, −2% от любого урона",
    },
    # ── Редкие (rare) — 8000 gold, T2, уровень 20 · HP +75 · защита тела −6% ──
    "armor2_gold1": {
        "slot": "armor2", "rarity": "rare",
        "name": "Панцирь Берсерка", "emoji": "🛡",
        "str_bonus": 7, "hp_bonus": 75, "body_def_pct": 0.06, "reflect_pct": 7,
        "special_bonus": "Защита тела −6% · 🪞 Шипы 7% · +75 HP",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold1",
        "desc": "+7 силы, +75 HP, −6% по телу, 🪞 шипы 7% (возврат урона)",
    },
    "armor2_gold2": {
        "slot": "armor2", "rarity": "rare",
        "name": "Кольчуга Теней", "emoji": "🛡",
        "agi_bonus": 7, "hp_bonus": 75, "body_def_pct": 0.06, "block_chance": 5,
        "special_bonus": "Защита тела −6% · 🛡 Блок 5% · +75 HP",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold2",
        "desc": "+7 ловкости, +75 HP, −6% по телу, 🛡 блок 5% (шанс погасить удар)",
    },
    "armor2_gold3": {
        "slot": "armor2", "rarity": "rare",
        "name": "Мантия Чародея", "emoji": "🛡",
        "intu_bonus": 7, "hp_bonus": 75, "body_def_pct": 0.06, "crit_resist_pct": 6,
        "special_bonus": "Защита тела −6% · −6% крит врага · +75 HP",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold3",
        "desc": "+7 интуиции, +75 HP, −6% по телу, −6% крит врага",
    },
    "armor2_gold4": {
        "slot": "armor2", "rarity": "rare",
        "name": "Броня Стража", "emoji": "🛡",
        "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "hp_bonus": 75,
        "body_def_pct": 0.06, "def_pct": 0.04,
        "special_bonus": "Защита тела −6% · защита −4% от всего · +75 HP",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold4",
        "desc": "+4 ко всем статам, +75 HP, −6% по телу, −4% от любого урона",
    },
    # ── Эпические (epic) — 75 diamonds, T3, уровень 45 · HP +120 · защита тела −9% ──
    "armor2_dia1": {
        "slot": "armor2", "rarity": "epic",
        "name": "Латы Кровавого Вождя", "emoji": "🛡",
        "str_bonus": 9, "hp_bonus": 120, "body_def_pct": 0.09, "reflect_pct": 10,
        "special_bonus": "Защита тела −9% · 🪞 Шипы 10% · +120 HP",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia1",
        "desc": "+9 силы, +120 HP, −9% по телу, 🪞 шипы 10% (возврат урона)",
    },
    "armor2_dia2": {
        "slot": "armor2", "rarity": "epic",
        "name": "Плащ Ночного Клинка", "emoji": "🛡",
        "agi_bonus": 9, "hp_bonus": 120, "body_def_pct": 0.09, "block_chance": 8,
        "special_bonus": "Защита тела −9% · 🛡 Блок 8% · +120 HP",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia2",
        "desc": "+9 ловкости, +120 HP, −9% по телу, 🛡 блок 8% (шанс погасить удар)",
    },
    "armor2_dia3": {
        "slot": "armor2", "rarity": "epic",
        "name": "Одеяние Архимага", "emoji": "🛡",
        "intu_bonus": 9, "hp_bonus": 120, "body_def_pct": 0.09, "crit_resist_pct": 9,
        "special_bonus": "Защита тела −9% · −9% крит врага · +120 HP",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia3",
        "desc": "+9 интуиции, +120 HP, −9% по телу, −9% крит врага",
    },
    "armor2_dia4": {
        "slot": "armor2", "rarity": "epic",
        "name": "Латы Паладина Зари", "emoji": "🛡",
        "str_bonus": 6, "agi_bonus": 6, "intu_bonus": 6, "hp_bonus": 120,
        "body_def_pct": 0.09, "def_pct": 0.06,
        "special_bonus": "Защита тела −9% · защита −6% от всего · +120 HP",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia4",
        "desc": "+6 ко всем статам, +120 HP, −9% по телу, −6% от любого урона",
    },
    # ── Мифические (mythic) — $11.99 / ⭐800, T4, уровень 65 · HP +180 · защита тела −15% ──
    "armor2_mythic1": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Доспех Пламенного Титана", "emoji": "🔥",
        "str_bonus": 12, "hp_bonus": 180, "body_def_pct": 0.15, "reflect_pct": 15,
        "special_bonus": "Защита тела −15% · 🪞 Шипы 15% · +180 HP",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic1",
        "desc": "+12 силы, +180 HP, −15% по телу, 🪞 шипы 15% (возврат урона)",
    },
    "armor2_mythic2": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Облачение Призрака Ветров", "emoji": "🔥",
        "agi_bonus": 12, "hp_bonus": 180, "body_def_pct": 0.15, "block_chance": 12,
        "special_bonus": "Защита тела −15% · 🛡 Блок 12% · +180 HP",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic2",
        "desc": "+12 ловкости, +180 HP, −15% по телу, 🛡 блок 12% (шанс погасить удар)",
    },
    "armor2_mythic3": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Регалии Повелителя Молний", "emoji": "🔥",
        "intu_bonus": 12, "hp_bonus": 180, "body_def_pct": 0.15, "crit_resist_pct": 15,
        "special_bonus": "Защита тела −15% · −15% крит врага · +180 HP",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic3",
        "desc": "+12 интуиции, +180 HP, −15% по телу, −15% крит врага",
    },
    "armor2_mythic4": {
        # Легендарная USDT-броня: 0 базовых статов, +19 свободных через
        # armor2_custom_mods. Пассивка из 4 на выбор. Сброс $5.99 / ⭐400.
        # Не участвует в зональной схеме — чистый лист под распределение.
        "slot": "armor2", "rarity": "mythic",
        "name": "Доспех Светоносного Бога", "emoji": "🔥",
        "body_def_pct": 0.15,
        "special_bonus": "Защита тела −15% · +19 свободных статов · пассивка на выбор · сброс 5.99 USDT",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "usdt",
        "texture_key": "armor_mythic4",
        "desc": "+19 свободных статов, −15% урона по телу — игрок распределяет сам",
        "free_stats": 19,
        "custom_name_supported": True,
    },
}
