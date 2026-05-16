"""Броня (slot=armor). 16 предметов: 4 common + 4 rare + 4 epic + 4 mythic.

Унификация армора с 5 другими слотами (Вариант В). Каталог построен на тех же
правилах, что и helmets/shields/boots/rings: item_id = '<slot>_<rarity><num>',
поля slot/rarity/name/desc/price_* стандартные, set_id применяется
детерминированным маппером _default_set_id (видит формат '<slot>_<rarity><num>').

Особенности armor:
- Поля `class_strength/class_agility/class_intuition/class_endurance` — это
  базовые статы класса. Применяются delta-моделью в `equip_item('armor', ...)`
  к players.strength/endurance/crit/max_hp. НЕ суммируются через
  get_equipment_stats (там используются стандартные str_bonus и т.п.).
- `armor_mythic4` (legendary_usdt) имеет 0 базовых статов в каталоге; +19
  свободных статов и кастом-имя хранятся per-user в таблице armor_custom_mods.

legacy_class_id — для миграции данных (коммит 2). Старый class_id из
user_inventory → новый item_id брони.
"""
from __future__ import annotations

ARMOR: dict[str, dict] = {
    # ── Обычные (common) ──
    "armor_free1": {
        "slot": "armor", "rarity": "common",
        "name": "Кираса Ополченца", "emoji": "🛡",
        "class_strength": 5, "class_agility": 0, "class_intuition": 0, "class_endurance": 5,
        "special_bonus": "Бронированный: +2% к защите",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free1",
        "desc": "+2% к защите — броня для первых боёв",
        "legacy_class_id": "tank_free",
    },
    "armor_free2": {
        "slot": "armor", "rarity": "common",
        "name": "Жилет Следопыта", "emoji": "🛡",
        "class_strength": 0, "class_agility": 5, "class_intuition": 0, "class_endurance": 5,
        "special_bonus": "Гибкий: +2% уклон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free2",
        "desc": "+2% уклонение — лёгкий доспех для разведчиков",
        "legacy_class_id": "agile_free",
    },
    "armor_free3": {
        "slot": "armor", "rarity": "common",
        "name": "Роба Ученика", "emoji": "🛡",
        "class_strength": 0, "class_agility": 0, "class_intuition": 5, "class_endurance": 5,
        "special_bonus": "Острый глаз: +5% крит. урон",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free3",
        "desc": "+5% крит. урон — мантия начинающего мага",
        "legacy_class_id": "crit_free",
    },
    "armor_free4": {
        "slot": "armor", "rarity": "common",
        "name": "Плащ Странника", "emoji": "🛡",
        "class_strength": 2, "class_agility": 2, "class_intuition": 2, "class_endurance": 2,
        "special_bonus": "Сбалансирован: +1% к макс. HP",
        "price_gold": 800, "tier": "T1", "power_score": 27,
        "recommended_level": 1, "currency": "gold",
        "texture_key": "armor_free4",
        "desc": "+1% к макс. HP — универсальный плащ для новичка",
        "legacy_class_id": "universal_free",
    },
    # ── Редкие (rare) ──
    "armor_gold1": {
        "slot": "armor", "rarity": "rare",
        "name": "Панцирь Берсерка", "emoji": "🛡",
        "class_strength": 7, "class_agility": 0, "class_intuition": 0, "class_endurance": 7,
        "special_bonus": "Берсерк: урон +4% при HP < 30%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold1",
        "desc": "Урон +4% при HP < 30% — ярость выкованной стали",
        "legacy_class_id": "berserker_gold",
    },
    "armor_gold2": {
        "slot": "armor", "rarity": "rare",
        "name": "Кольчуга Теней", "emoji": "🛡",
        "class_strength": 0, "class_agility": 7, "class_intuition": 0, "class_endurance": 7,
        "special_bonus": "Теневой удар: +4% шанс двойного удара",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold2",
        "desc": "+4% шанс двойного удара — бесшумная кольчуга",
        "legacy_class_id": "assassin_gold",
    },
    "armor_gold3": {
        "slot": "armor", "rarity": "rare",
        "name": "Мантия Чародея", "emoji": "🛡",
        "class_strength": 0, "class_agility": 0, "class_intuition": 7, "class_endurance": 7,
        "special_bonus": "Чародей: крит. урон +4%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold3",
        "desc": "Крит. урон +4% — вышита магическими рунами",
        "legacy_class_id": "mage_gold",
    },
    "armor_gold4": {
        "slot": "armor", "rarity": "rare",
        "name": "Броня Стража", "emoji": "🛡",
        "class_strength": 4, "class_agility": 4, "class_intuition": 4, "class_endurance": 4,
        "special_bonus": "Страж: входящий урон -3%",
        "price_gold": 8000, "tier": "T2", "power_score": 59,
        "recommended_level": 20, "currency": "gold",
        "texture_key": "armor_gold4",
        "desc": "Входящий урон -3% — баланс стали и света",
        "legacy_class_id": "paladin_gold",
    },
    # ── Эпические (epic) ──
    "armor_dia1": {
        "slot": "armor", "rarity": "epic",
        "name": "Латы Кровавого Вождя", "emoji": "🛡",
        "class_strength": 9, "class_agility": 0, "class_intuition": 0, "class_endurance": 9,
        "special_bonus": "Ярость Вождя: урон +6% при HP < 40%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia1",
        "desc": "Урон +6% при HP < 40% — закалены в крови дракона",
        "legacy_class_id": "dragonknight_diamonds",
    },
    "armor_dia2": {
        "slot": "armor", "rarity": "epic",
        "name": "Плащ Ночного Клинка", "emoji": "🛡",
        "class_strength": 0, "class_agility": 9, "class_intuition": 0, "class_endurance": 9,
        "special_bonus": "Ночной Клинок: +6% шанс двойного удара",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia2",
        "desc": "+6% шанс двойного удара — сплетён из лунных нитей",
        "legacy_class_id": "shadowdancer_diamonds",
    },
    "armor_dia3": {
        "slot": "armor", "rarity": "epic",
        "name": "Одеяние Архимага", "emoji": "🛡",
        "class_strength": 0, "class_agility": 0, "class_intuition": 9, "class_endurance": 9,
        "special_bonus": "Архимаг: крит. урон +6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia3",
        "desc": "Крит. урон +6% — пропитано эфирным пеплом",
        "legacy_class_id": "archmage_diamonds",
    },
    "armor_dia4": {
        "slot": "armor", "rarity": "epic",
        "name": "Латы Паладина Зари", "emoji": "🛡",
        "class_strength": 6, "class_agility": 6, "class_intuition": 6, "class_endurance": 6,
        "special_bonus": "Заря: входящий урон -6%",
        "price_diamonds": 75, "tier": "T3", "power_score": 3.0,
        "recommended_level": 45, "currency": "diamond",
        "texture_key": "armor_dia4",
        "desc": "Входящий урон -6% — священные латы рассвета",
        "legacy_class_id": "universal_diamonds",
    },
    # ── Мифические (mythic) ──
    "armor_mythic1": {
        "slot": "armor", "rarity": "mythic",
        "name": "Доспех Пламенного Титана", "emoji": "🔥",
        "class_strength": 12, "class_agility": 0, "class_intuition": 0, "class_endurance": 12,
        "special_bonus": "Пламя Ярости: урон +12% при HP < 30%",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic1",
        "desc": "Урон +12% при HP < 30% — выкован в сердце вулкана",
        "legacy_class_id": "berserker_mythic",
    },
    "armor_mythic2": {
        "slot": "armor", "rarity": "mythic",
        "name": "Облачение Призрака Ветров", "emoji": "🔥",
        "class_strength": 0, "class_agility": 12, "class_intuition": 0, "class_endurance": 12,
        "special_bonus": "Ветра: +9% шанс двойного удара",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic2",
        "desc": "+9% шанс двойного удара — сотканы из дыхания бури",
        "legacy_class_id": "assassin_mythic",
    },
    "armor_mythic3": {
        "slot": "armor", "rarity": "mythic",
        "name": "Регалии Повелителя Молний", "emoji": "🔥",
        "class_strength": 0, "class_agility": 0, "class_intuition": 12, "class_endurance": 12,
        "special_bonus": "Повелитель Молний: крит. урон +18%",
        "price_usdt": "11.99", "price_stars": 590,
        "tier": "T4", "power_score": 3.58,
        "recommended_level": 65, "currency": "star",
        "texture_key": "armor_mythic3",
        "desc": "Крит. урон +18% — пронизаны грозовой силой",
        "legacy_class_id": "archmage_mythic",
    },
    "armor_mythic4": {
        # legendary_usdt: 0 базовых статов; +19 свободных и кастом-имя — в armor_custom_mods
        "slot": "armor", "rarity": "mythic",
        "name": "Доспех Светоносного Бога", "emoji": "🔥",
        "class_strength": 0, "class_agility": 0, "class_intuition": 0, "class_endurance": 0,
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
