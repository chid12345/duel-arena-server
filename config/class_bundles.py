"""Таблицы классов (free/gold/diamonds/mythic/USDT) и цены сброса статов."""

# Бесплатные классы (эксклюзивный выбор - только один)
FREE_CLASSES = {
    "tank_free": {
        "name": "Кираса Ополченца",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 5,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Бронированный: +2% к защите",
    },
    "agile_free": {
        "name": "Жилет Следопыта",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 5,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Гибкий: +2% уклон",
    },
    "crit_free": {
        "name": "Роба Ученика",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 5,
        "bonus_endurance": 5,
        "special_bonus": "Острый глаз: +5% крит. урон",
    },
    "universal_free": {
        "name": "Плащ Странника",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 2,
        "bonus_agility": 2,
        "bonus_intuition": 2,
        "bonus_endurance": 2,
        "special_bonus": "Сбалансирован: +1% к макс. HP",
    },
}

GOLD_CLASSES = {
    "berserker_gold": {
        "name": "Панцирь Берсерка",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 7,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 7,
        "special_bonus": "Берсерк: урон +4% при HP < 30%",
    },
    "assassin_gold": {
        "name": "Кольчуга Теней",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 7,
        "bonus_intuition": 0,
        "bonus_endurance": 7,
        "special_bonus": "Теневой удар: +4% шанс двойного удара",
    },
    "mage_gold": {
        "name": "Мантия Чародея",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 7,
        "bonus_endurance": 7,
        "special_bonus": "Чародей: крит. урон +4%",
    },
    "paladin_gold": {
        "name": "Броня Стража",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 4,
        "bonus_agility": 4,
        "bonus_intuition": 4,
        "bonus_endurance": 4,
        "special_bonus": "Страж: входящий урон -3%",
    },
}

DIAMONDS_CLASSES = {
    "dragonknight_diamonds": {
        "name": "Латы Кровавого Вождя",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 9,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 9,
        "special_bonus": "Ярость Вождя: урон +6% при HP < 40%",
    },
    "shadowdancer_diamonds": {
        "name": "Плащ Ночного Клинка",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 9,
        "bonus_intuition": 0,
        "bonus_endurance": 9,
        "special_bonus": "Ночной Клинок: +6% шанс двойного удара",
    },
    "archmage_diamonds": {
        "name": "Одеяние Архимага",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 9,
        "bonus_endurance": 9,
        "special_bonus": "Архимаг: крит. урон +6%",
    },
    "universal_diamonds": {
        "name": "Латы Паладина Зари",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 6,
        "bonus_agility": 6,
        "bonus_intuition": 6,
        "bonus_endurance": 6,
        "special_bonus": "Заря: входящий урон -6%",
    },
}

# Мифические классы брони (продаются за USDT/Stars)
# Фиксированные пресеты, в отличие от кастомного USDT-слота (legendary_usdt).
MYTHIC_CLASSES = {
    "berserker_mythic": {
        "name": "Доспех Пламенного Титана",
        "price_gold": 0,
        "price_diamonds": 0,
        "price_usdt": "11.99",
        "price_stars": 590,
        "bonus_strength": 12,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 12,
        "special_bonus": "Пламя Ярости: урон +12% при HP < 30%",
    },
    "assassin_mythic": {
        "name": "Облачение Призрака Ветров",
        "price_gold": 0,
        "price_diamonds": 0,
        "price_usdt": "11.99",
        "price_stars": 590,
        "bonus_strength": 0,
        "bonus_agility": 12,
        "bonus_intuition": 0,
        "bonus_endurance": 12,
        "special_bonus": "Ветра: +9% шанс двойного удара",
    },
    "archmage_mythic": {
        "name": "Регалии Повелителя Молний",
        "price_gold": 0,
        "price_diamonds": 0,
        "price_usdt": "11.99",
        "price_stars": 590,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 12,
        "bonus_endurance": 12,
        "special_bonus": "Повелитель Молний: крит. урон +18%",
    },
}

USDT_CLASS_BASE = {
    "name": "Доспех Светоносного Бога",
    "price_gold": 0,
    "price_diamonds": 0,
    "price_usdt": "11.99",
    "bonus_strength": 0,
    "bonus_agility": 0,
    "bonus_intuition": 0,
    "bonus_endurance": 0,   # бонусы хранятся в saved-полях, здесь 0
    "free_stats": 19,
    "special_bonus": "+5 выносливости · 19 своб. статов · пассивка на выбор",
}

# Стоимость покупки Легендарный образа и сброса статов
USDT_SLOT_PRICE = "11.99"
USDT_RESET_PRICE = "5.99"

# Бонус пассивки Легендарный образа (в очках стата)
USDT_PASSIVE_BONUS = 8

RESET_STATS_COST_DIAMONDS = 200
RESET_STATS_COST_DIAMONDS_USDT = 25
