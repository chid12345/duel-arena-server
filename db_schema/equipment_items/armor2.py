"""Броня (slot=armor2). Чистый перезапуск после сноса старого armor.

16 предметов: 4 common + 4 rare + 4 epic + 4 mythic. Аналогично остальным
слотам (helmet/shield/weapon/boots/ring). Хранение:
- player_owned_armor2 (одна таблица, как player_owned_weapons)
- armor2_custom_mods (только для armor2_mythic4: +19 свободных статов
  и custom_name — без legacy current_class / _mirror sync).

Статы стандартные item-поля (str_bonus/agi_bonus/intu_bonus/hp_bonus),
суммируются автоматически в get_equipment_stats.

armor2_mythic4 (legendary_usdt2) — особый: 0 базовых статов, +19 свободных
через armor2_custom_mods, выбор пассивки. Стоимость $11.99 / ⭐800.

set_id назначается автоматически через _default_set_id по суффиксу _free1..
_mythic4 (тот же, что и у других слотов) — броня участвует в архетипных сетах
(predator/bastion/berserk/ghost/mage/regent) с порогами 2/4/6.

Скины (texture_key) переиспользуют PNG из webapp/ (armor_free1.png и т.д.).
"""
from __future__ import annotations

ARMOR2: dict[str, dict] = {
    # ── Обычные (common) — 800 gold, T1, уровень 1 ──
    "armor2_free1": {
        "slot": "armor2", "rarity": "common",
        "name": "Кираса Ополченца", "emoji": "🛡",
        "str_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Бронированный: +2% к защите",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free1",
        "desc": "+5 силы, +10 HP — броня для первых боёв",
    },
    "armor2_free2": {
        "slot": "armor2", "rarity": "common",
        "name": "Жилет Следопыта", "emoji": "🛡",
        "agi_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Гибкий: +2% уклон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free2",
        "desc": "+5 ловкости, +10 HP — лёгкий доспех для разведчиков",
    },
    "armor2_free3": {
        "slot": "armor2", "rarity": "common",
        "name": "Роба Ученика", "emoji": "🛡",
        "intu_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Острый глаз: +5% крит. урон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free3",
        "desc": "+5 интуиции, +10 HP — мантия начинающего мага",
    },
    "armor2_free4": {
        "slot": "armor2", "rarity": "common",
        "name": "Плащ Странника", "emoji": "🛡",
        "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "hp_bonus": 4,
        "special_bonus": "Сбалансирован: +1% к макс. HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free4",
        "desc": "+2 ко всем статам, +4 HP — универсальный плащ",
    },
    # ── Редкие (rare) — 8000 gold, T2, уровень 20 ──
    "armor2_gold1": {
        "slot": "armor2", "rarity": "rare",
        "name": "Панцирь Берсерка", "emoji": "🛡",
        "str_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Берсерк: урон +4% при HP < 30%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold1",
        "desc": "+7 силы, +14 HP — ярость выкованной стали",
    },
    "armor2_gold2": {
        "slot": "armor2", "rarity": "rare",
        "name": "Кольчуга Теней", "emoji": "🛡",
        "agi_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Теневой удар: +4% шанс двойного удара",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold2",
        "desc": "+7 ловкости, +14 HP — бесшумная кольчуга",
    },
    "armor2_gold3": {
        "slot": "armor2", "rarity": "rare",
        "name": "Мантия Чародея", "emoji": "🛡",
        "intu_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Чародей: крит. урон +4%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold3",
        "desc": "+7 интуиции, +14 HP — вышита магическими рунами",
    },
    "armor2_gold4": {
        "slot": "armor2", "rarity": "rare",
        "name": "Броня Стража", "emoji": "🛡",
        "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "hp_bonus": 8,
        "special_bonus": "Страж: входящий урон -3%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold4",
        "desc": "+4 ко всем статам, +8 HP — баланс стали и света",
    },
    # ── Эпические (epic) — 75 diamonds, T3, уровень 45 ──
    "armor2_dia1": {
        "slot": "armor2", "rarity": "epic",
        "name": "Латы Кровавого Вождя", "emoji": "🛡",
        "str_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Ярость Вождя: урон +6% при HP < 40%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia1",
        "desc": "+9 силы, +18 HP — закалены в крови дракона",
    },
    "armor2_dia2": {
        "slot": "armor2", "rarity": "epic",
        "name": "Плащ Ночного Клинка", "emoji": "🛡",
        "agi_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Ночной Клинок: +6% шанс двойного удара",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia2",
        "desc": "+9 ловкости, +18 HP — сплетён из лунных нитей",
    },
    "armor2_dia3": {
        "slot": "armor2", "rarity": "epic",
        "name": "Одеяние Архимага", "emoji": "🛡",
        "intu_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Архимаг: крит. урон +6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia3",
        "desc": "+9 интуиции, +18 HP — пропитано эфирным пеплом",
    },
    "armor2_dia4": {
        "slot": "armor2", "rarity": "epic",
        "name": "Латы Паладина Зари", "emoji": "🛡",
        "str_bonus": 6, "agi_bonus": 6, "intu_bonus": 6, "hp_bonus": 12,
        "special_bonus": "Заря: входящий урон -6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia4",
        "desc": "+6 ко всем статам, +12 HP — священные латы рассвета",
    },
    # ── Мифические (mythic) — $11.99 / ⭐800, T4, уровень 65 ──
    "armor2_mythic1": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Доспех Пламенного Титана", "emoji": "🔥",
        "str_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Пламя Ярости: урон +12% при HP < 30%",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic1",
        "desc": "+12 силы, +24 HP — выкован в сердце вулкана",
    },
    "armor2_mythic2": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Облачение Призрака Ветров", "emoji": "🔥",
        "agi_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Ветра: +9% шанс двойного удара",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic2",
        "desc": "+12 ловкости, +24 HP — сотканы из дыхания бури",
    },
    "armor2_mythic3": {
        "slot": "armor2", "rarity": "mythic",
        "name": "Регалии Повелителя Молний", "emoji": "🔥",
        "intu_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Повелитель Молний: крит. урон +18%",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic3",
        "desc": "+12 интуиции, +24 HP — пронизаны грозовой силой",
    },
    "armor2_mythic4": {
        # Легендарная USDT-броня: 0 базовых статов, +19 свободных через
        # armor2_custom_mods. Пассивка из 4 на выбор. Сброс $5.99 / ⭐400.
        "slot": "armor2", "rarity": "mythic",
        "name": "Доспех Светоносного Бога", "emoji": "🔥",
        "special_bonus": "+19 свободных статов · пассивка на выбор · сброс 5.99 USDT",
        "price_usdt": "11.99", "price_stars": 800,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "usdt",
        "texture_key": "armor_mythic4",
        "desc": "+19 свободных статов — игрок распределяет сам",
        "free_stats": 19,
        "custom_name_supported": True,
    },
}
