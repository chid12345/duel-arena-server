"""Экономика, боты, тексты, CryptoPay, каталог образов."""

import os

# Улучшения
IMPROVEMENT_LEVELS = 5
IMPROVEMENT_COST_MULTIPLIER = 1.5

# Боты: целевая численность по уровням (дополняется при старте БД до этих значений).
# Ур.1 — меньше плотность; ур.2–10 — по 100 для тестов матчмейка; все боты с разными сборками (рандом внутри уровня).
BOT_COUNT_BY_LEVEL = {
    1: 50,
    2: 100,
    3: 100,
    4: 100,
    5: 100,
    6: 100,
    7: 100,
    8: 100,
    9: 100,
    10: 100,
}
# Дополнительно: столько ботов с уровнями 11..MAX_LEVEL (случайное распределение вверх по диапазонам).
BOT_EXTRA_POPULATION_ABOVE_10 = 0

TARGET_BOT_POPULATION = sum(BOT_COUNT_BY_LEVEL.values()) + BOT_EXTRA_POPULATION_ABOVE_10
INITIAL_BOTS_COUNT = TARGET_BOT_POPULATION  # совместимость со старыми упоминаниями
BOT_NAMES = [
    "Алекс", "Макс", "Тим", "Рекс", "Дрейк", "Крис", "Шторм", "Вольф", 
    "Омега", "Хантер", "Легион", "Разрушитель", "Титан", "Альфа"
]

BOT_PREFIXES = {
    "novice": ["Новичок", "Боец", "Рекрут"],
    "warrior": ["Гладиатор", "Воин", "Ас"],
    "master": ["Чемпион", "Мастер", "Легенда"],
    "legend": ["Титан", "Бессмертный", "Альфа"]
}

# Зоны атаки/защиты
ATTACK_ZONES = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]

# Сообщения
MESSAGES = {
    'welcome': '⚔️ <b>Добро пожаловать в Дуэль-Арену!</b> ⚔️',
    'victory': '🎉 **Победа!**',
    'defeat': '💀 **Поражение!**',
    'level_up': '🎊 **Новый уровень: {level}!**',
    'afk_warning': '⚠️ Пропуск хода! Следующий пропуск может стоить победы!',
    'afk_final_warning': '🚨 Последнее предупреждение! Еще один пропуск - поражение!',
    'afk_defeat': '💀 Поражение по техническим причинам!'
}

# Эмодзи (endurance в БД = ловкость в UI)
EMOJI = {
    'strength': '💪',
    'endurance': '🤸',
    'hp': '❤️',
    'gold': '💰',
    'exp': '⭐',
    'level': '📊',
    'attack': '👊',
    'defense': '🛡️',
    'intuition': '💥',
    'miss': '❌',
    'dodge': '💨',
    'block': '🛡️',
    'partial_block': '🔹'
}

# HP реген (time-based, вне боя)
HP_REGEN_BASE_SECONDS = 300       # 5 минут — полный реген без вложений в выносливость
HP_REGEN_ENDURANCE_BONUS = 0.05   # +5% скорости за каждое вложение свободного стата в выносливость
HP_MIN_BATTLE_PCT = 0.30          # нельзя начать бой если текущий HP < 30% от макс.

# CryptoPay (https://t.me/CryptoBot)
# Дефолт = тестовый токен (@CryptoTestnetBot). Боевой прописать в CRYPTOPAY_TOKEN на Render.
CRYPTOPAY_TOKEN = os.getenv("CRYPTOPAY_TOKEN", "56515:AAThe6SQhjz10EDpboEUulYqaaQKo47xFLF")
# 1 = тестовая сеть, 0 = боевая. Менять вместе с токеном.
CRYPTOPAY_TESTNET = os.getenv("CRYPTOPAY_TESTNET", "1") == "1"
# Полный сброс аккаунта через CryptoPay Mini App (только USDT)
FULL_RESET_CRYPTO_USDT = (os.getenv("FULL_RESET_CRYPTO_USDT") or "11.99").strip()

# Алмазы (премиум валюта)
DIAMONDS_DAILY_STREAK = 2
DIAMONDS_ACHIEVEMENT_BASE = 10

# Реферальные награды (см. database.process_referral_*)
# N — порядковый номер приглашённого по факту первой оплаты подписки (Stars).
REFERRAL_PCT_SUB_RANK_1_10 = 5
REFERRAL_PCT_SUB_RANK_11_30 = 7
REFERRAL_PCT_SUB_RANK_31_PLUS = 10
REFERRAL_PCT_VIP_ALL_SHOP = 10  # с 31-го платящего: все покупки этого игрока в магазине и Stars-пакеты
# Цена подписки Premium в Telegram Stars (инвойс payload premium_sub)
PREMIUM_SUBSCRIPTION_STARS = 390

# Образы (классы): масштабирование бонусов к базовым статам.
# Раз в N уровней образ усиливается на +1 к основным статам (с потолком),
# чтобы бонусы не теряли смысл на 50+ уровнях.
AVATAR_SCALE_EVERY_LEVELS = 20
AVATAR_SCALE_MAX_BONUS = 3

# Элитный образ продается за Stars/USDT.
ELITE_AVATAR_ID = "elite_emperor"
ELITE_AVATAR_STARS = 590
ELITE_AVATAR_USDT = "11.99"

# Каталог образов.
# В проекте "agility" соответствует endurance, "intuition" соответствует crit.
AVATAR_CATALOG = [
    {"id": "base_tank", "name": "🛡️ Страж Бастиона", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 5, "endurance": 5, "crit": 0, "hp_flat": 0, "badge": "🛡️", "description": "Танк: +5 Сила и +5 Выносливость."},
    {"id": "base_rogue", "name": "🌪️ Теневой Ловкач", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 0, "hp_flat": 0, "badge": "🌪️", "description": "Ловкач: +5 Ловкость и +5 Выносливость."},
    {"id": "base_crit", "name": "⚡ Охотник Критов", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 5, "hp_flat": 0, "badge": "⚡", "description": "Критовик: +5 Интуиция и +5 Выносливость."},
    {"id": "base_neutral", "name": "🎯 Универсал", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 2, "endurance": 2, "crit": 2, "hp_flat": 4, "badge": "🎯", "description": "Нейтральный: +2 ко всем 4 статам (Сила/Ловкость/Интуиция/Выносливость)."},

    {"id": "gold_vanguard", "name": "🛡️ Железный Авангард", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 6, "endurance": 8, "crit": 0, "hp_flat": 12, "badge": "🛡️", "description": "Mid-tier танк: лучше базы, но без имбы."},
    {"id": "gold_blade", "name": "🗡️ Танцор Клинка", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 3, "endurance": 8, "crit": 3, "hp_flat": 6, "badge": "🗡️", "description": "Mid-tier дуэлянт: темп и точность."},
    {"id": "gold_hunter", "name": "🎯 Охотник за Слабостями", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 5, "endurance": 4, "crit": 6, "hp_flat": 4, "badge": "🎯", "description": "Mid-tier крит-давление."},
    {"id": "gold_tactician", "name": "📘 Полевой Тактик", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4600, "strength": 4, "endurance": 4, "crit": 4, "hp_flat": 8, "badge": "📘", "description": "Гибкий mid-tier образ."},

    {"id": "dia_duelist", "name": "💎 Кровавый Дуэлянт", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 6, "endurance": 3, "crit": 7, "hp_flat": 4, "badge": "💎", "description": "Премиум: высокий риск/урон."},
    {"id": "dia_fortress", "name": "💎 Стальная Крепость", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 4, "endurance": 9, "crit": 2, "hp_flat": 14, "badge": "💎", "description": "Премиум: максимальная стойкость."},
    {"id": "dia_phantom", "name": "💎 Призрачный Шаг", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 240, "strength": 4, "endurance": 7, "crit": 5, "hp_flat": 6, "badge": "💎", "description": "Премиум: контроль темпа и точность."},

    {"id": "elite_emperor", "name": "👑 Император Арены", "tier": "elite", "rarity": "legendary", "currency": "usdt_stars", "price": 0, "strength": 8, "endurance": 8, "crit": 8, "hp_flat": 18, "badge": "👑", "description": "Элитный образ с максимальным статусом и визуальным выделением."},
]
