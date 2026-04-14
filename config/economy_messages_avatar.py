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
HP_MIN_BATTLE_PCT = 0.15          # нельзя начать бой если текущий HP < 15% от макс.

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

# Образы, масштабирование, элит — вынесены в config/avatar_catalog.py
