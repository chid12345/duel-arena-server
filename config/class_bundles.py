"""Таблицы классов (free/gold/diamonds/USDT) и цены сброса статов."""

# Бесплатные классы (эксклюзивный выбор - только один)
FREE_CLASSES = {
    "tank_free": {
        "name": "Танк",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 5,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Броня +2%",
    },
    "agile_free": {
        "name": "Ловкач",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 5,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Уклонение +2%",
    },
    "crit_free": {
        "name": "Крит",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 5,
        "bonus_endurance": 5,
        "special_bonus": "Крит. урон +3%",
    },
    "universal_free": {
        "name": "Универсал",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 2,
        "bonus_agility": 2,
        "bonus_intuition": 2,
        "bonus_endurance": 2,
        "special_bonus": "Макс. HP +1%",
    },
}

GOLD_CLASSES = {
    "berserker_gold": {
        "name": "Силач+",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 7,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 7,
        "special_bonus": "Силач: урон +4% при HP < 30%",
    },
    "assassin_gold": {
        "name": "Ловкач+",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 7,
        "bonus_intuition": 0,
        "bonus_endurance": 7,
        "special_bonus": "Ловкач: шанс двойного удара 4%",
    },
    "mage_gold": {
        "name": "Крит+",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 7,
        "bonus_endurance": 7,
        "special_bonus": "Крит: крит. урон +4%",
    },
    "paladin_gold": {
        "name": "Выносливый+",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 4,
        "bonus_agility": 4,
        "bonus_intuition": 4,
        "bonus_endurance": 4,
        "special_bonus": "Выносливость: входящий урон -3%",
    },
}

DIAMONDS_CLASSES = {
    "dragonknight_diamonds": {
        "name": "Силач++",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 9,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 9,
        "special_bonus": "Силач: урон +6% при HP < 40%",
    },
    "shadowdancer_diamonds": {
        "name": "Ловкач++",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 9,
        "bonus_intuition": 0,
        "bonus_endurance": 9,
        "special_bonus": "Ловкач: шанс двойного удара 6%",
    },
    "archmage_diamonds": {
        "name": "Крит++",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 9,
        "bonus_endurance": 9,
        "special_bonus": "Крит: крит. урон +6%",
    },
}

USDT_CLASS_BASE = {
    "name": "Кастомный",
    "price_gold": 0,
    "price_diamonds": 0,
    "price_usdt": "11.99",
    "bonus_strength": 0,
    "bonus_agility": 0,
    "bonus_intuition": 0,
    "bonus_endurance": 0,   # бонусы хранятся в saved-полях, здесь 0
    "free_stats": 19,
    "special_bonus": "Выбор 1 пассивки из списка: эффект +8 к стату",
}

# Стоимость покупки USDT-образа и сброса статов
USDT_SLOT_PRICE = "11.99"
USDT_RESET_PRICE = "5.99"

# Бонус пассивки USDT-образа (в очках стата)
USDT_PASSIVE_BONUS = 8

RESET_STATS_COST_DIAMONDS = 50
RESET_STATS_COST_DIAMONDS_USDT = 25
