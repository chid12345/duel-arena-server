"""Броня (slot=armor). 16 предметов: 4 common + 4 rare + 4 epic + 4 mythic.

Унификация armor с другими слотами (Вариант А). Каталог построен на тех же
правилах, что и helmets/shields/boots/rings: item_id = '<slot>_<rarity><num>',
поля slot/rarity/name/desc/price_* стандартные, set_id применяется
детерминированным маппером _default_set_id.

ВАЖНО (этап 7): теперь статы хранятся в СТАНДАРТНЫХ item-полях
(str_bonus/agi_bonus/intu_bonus/hp_bonus), как у остальных 5 слотов.
Они автоматически суммируются в get_equipment_stats и применяются в бою
через battle_system/mixins/start.py (str_bonus→strength, agi_bonus→endurance,
intu_bonus→crit, hp_bonus→max_hp).

Конверсия старых полей класса в стандартные item-поля:
- bonus_strength  → str_bonus  (1:1)
- bonus_agility   → agi_bonus  (1:1, идёт в players.endurance)
- bonus_intuition → intu_bonus (1:1, идёт в players.crit)
- bonus_endurance × STAMINA_PER_FREE_STAT (=2) → hp_bonus

armor_mythic4 (legendary_usdt) даёт 0 базовых статов — +19 свободных и
custom_name хранятся per-user в armor_custom_mods и подмешиваются в
get_equipment_stats.

legacy_class_id — для миграции данных (коммит 2) и для UI-обратной
совместимости (current_class остаётся как UI-маркер до полной выпилки).
"""
from __future__ import annotations

ARMOR: dict[str, dict] = {
    # ── Обычные (common) ──
    "armor_free1": {
        "slot": "armor", "rarity": "common",
        "name": "Кираса Ополченца", "emoji": "🛡",
        "str_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Бронированный: +2% к защите",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free1",
        "desc": "+5 силы, +10 HP — броня для первых боёв",
        "legacy_class_id": "tank_free",
    },
    "armor_free2": {
        "slot": "armor", "rarity": "common",
        "name": "Жилет Следопыта", "emoji": "🛡",
        "agi_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Гибкий: +2% уклон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free2",
        "desc": "+5 ловкости, +10 HP — лёгкий доспех для разведчиков",
        "legacy_class_id": "agile_free",
    },
    "armor_free3": {
        "slot": "armor", "rarity": "common",
        "name": "Роба Ученика", "emoji": "🛡",
        "intu_bonus": 5, "hp_bonus": 10,
        "special_bonus": "Острый глаз: +5% крит. урон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free3",
        "desc": "+5 интуиции, +10 HP — мантия начинающего мага",
        "legacy_class_id": "crit_free",
    },
    "armor_free4": {
        "slot": "armor", "rarity": "common",
        "name": "Плащ Странника", "emoji": "🛡",
        "str_bonus": 2, "agi_bonus": 2, "intu_bonus": 2, "hp_bonus": 4,
        "special_bonus": "Сбалансирован: +1% к макс. HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free4",
        "desc": "+2 ко всем статам, +4 HP — универсальный плащ",
        "legacy_class_id": "universal_free",
    },
    # ── Редкие (rare) ──
    "armor_gold1": {
        "slot": "armor", "rarity": "rare",
        "name": "Панцирь Берсерка", "emoji": "🛡",
        "str_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Берсерк: урон +4% при HP < 30%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold1",
        "desc": "+7 силы, +14 HP — ярость выкованной стали",
        "legacy_class_id": "berserker_gold",
    },
    "armor_gold2": {
        "slot": "armor", "rarity": "rare",
        "name": "Кольчуга Теней", "emoji": "🛡",
        "agi_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Теневой удар: +4% шанс двойного удара",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold2",
        "desc": "+7 ловкости, +14 HP — бесшумная кольчуга",
        "legacy_class_id": "assassin_gold",
    },
    "armor_gold3": {
        "slot": "armor", "rarity": "rare",
        "name": "Мантия Чародея", "emoji": "🛡",
        "intu_bonus": 7, "hp_bonus": 14,
        "special_bonus": "Чародей: крит. урон +4%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold3",
        "desc": "+7 интуиции, +14 HP — вышита магическими рунами",
        "legacy_class_id": "mage_gold",
    },
    "armor_gold4": {
        "slot": "armor", "rarity": "rare",
        "name": "Броня Стража", "emoji": "🛡",
        "str_bonus": 4, "agi_bonus": 4, "intu_bonus": 4, "hp_bonus": 8,
        "special_bonus": "Страж: входящий урон -3%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold4",
        "desc": "+4 ко всем статам, +8 HP — баланс стали и света",
        "legacy_class_id": "paladin_gold",
    },
    # ── Эпические (epic) ──
    "armor_dia1": {
        "slot": "armor", "rarity": "epic",
        "name": "Латы Кровавого Вождя", "emoji": "🛡",
        "str_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Ярость Вождя: урон +6% при HP < 40%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia1",
        "desc": "+9 силы, +18 HP — закалены в крови дракона",
        "legacy_class_id": "dragonknight_diamonds",
    },
    "armor_dia2": {
        "slot": "armor", "rarity": "epic",
        "name": "Плащ Ночного Клинка", "emoji": "🛡",
        "agi_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Ночной Клинок: +6% шанс двойного удара",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia2",
        "desc": "+9 ловкости, +18 HP — сплетён из лунных нитей",
        "legacy_class_id": "shadowdancer_diamonds",
    },
    "armor_dia3": {
        "slot": "armor", "rarity": "epic",
        "name": "Одеяние Архимага", "emoji": "🛡",
        "intu_bonus": 9, "hp_bonus": 18,
        "special_bonus": "Архимаг: крит. урон +6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia3",
        "desc": "+9 интуиции, +18 HP — пропитано эфирным пеплом",
        "legacy_class_id": "archmage_diamonds",
    },
    "armor_dia4": {
        "slot": "armor", "rarity": "epic",
        "name": "Латы Паладина Зари", "emoji": "🛡",
        "str_bonus": 6, "agi_bonus": 6, "intu_bonus": 6, "hp_bonus": 12,
        "special_bonus": "Заря: входящий урон -6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia4",
        "desc": "+6 ко всем статам, +12 HP — священные латы рассвета",
        "legacy_class_id": "universal_diamonds",
    },
    # ── Мифические (mythic) ──
    "armor_mythic1": {
        "slot": "armor", "rarity": "mythic",
        "name": "Доспех Пламенного Титана", "emoji": "🔥",
        "str_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Пламя Ярости: урон +12% при HP < 30%",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic1",
        "desc": "+12 силы, +24 HP — выкован в сердце вулкана",
        "legacy_class_id": "berserker_mythic",
    },
    "armor_mythic2": {
        "slot": "armor", "rarity": "mythic",
        "name": "Облачение Призрака Ветров", "emoji": "🔥",
        "agi_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Ветра: +9% шанс двойного удара",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic2",
        "desc": "+12 ловкости, +24 HP — сотканы из дыхания бури",
        "legacy_class_id": "assassin_mythic",
    },
    "armor_mythic3": {
        "slot": "armor", "rarity": "mythic",
        "name": "Регалии Повелителя Молний", "emoji": "🔥",
        "intu_bonus": 12, "hp_bonus": 24,
        "special_bonus": "Повелитель Молний: крит. урон +18%",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic3",
        "desc": "+12 интуиции, +24 HP — пронизаны грозовой силой",
        "legacy_class_id": "archmage_mythic",
    },
    "armor_mythic4": {
        # legendary_usdt: 0 базовых статов; +19 свободных и custom_name —
        # через armor_custom_mods (подмешиваются в get_equipment_stats для
        # slot='armor' по user_id+item_id).
        "slot": "armor", "rarity": "mythic",
        "name": "Доспех Светоносного Бога", "emoji": "🔥",
        "special_bonus": "+19 свободных статов · пассивка на выбор · сброс 5.99 USDT",
        "price_usdt": "11.99",
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "usdt",
        "texture_key": "armor_mythic4",
        "desc": "+19 свободных статов — игрок распределяет сам",
        "legacy_class_id": "legendary_usdt",
        "free_stats": 19,
        "custom_name_supported": True,
    },
}


# ── Маппинг legacy_class_id → новый item_id (для switch_class/unequip) ────────
_LEGACY_TO_ITEM_ID: dict[str, str] = {
    v["legacy_class_id"]: k for k, v in ARMOR.items() if v.get("legacy_class_id")
}


def legacy_class_to_armor_item_id(class_id: str | None) -> str | None:
    """Маппит legacy class_id → новый item_id брони.

    Для USDT-кастомок (usdt_custom_*) — всегда armor_mythic4 (legendary_usdt).
    """
    if not class_id:
        return None
    if class_id.startswith("usdt_custom_") or class_id == "legendary_usdt":
        return "armor_mythic4"
    return _LEGACY_TO_ITEM_ID.get(class_id)
