"""Экономика, боты, тексты, CryptoPay, каталог образов."""

import os

# Улучшения
IMPROVEMENT_LEVELS = 5
IMPROVEMENT_COST_MULTIPLIER = 1.5

# Боты: целевая численность по уровням (дополняется при старте БД до этих значений).
# Этап 9 редизайна (запуск-готовность): по 100 ботов на каждый уровень 2..80,
# 50 на 1-й (там игроки задерживаются недолго). Итого ~7950 ботов.
# При старте БД create_initial_bots дозаливает недостающих → если БД пустая,
# сразу появляется ~8000 ботов разных уровней с виртуальной экипировкой.
# Это нужно для запуска: даже при 0 живых игроков PvP-лист и матчмейкинг
# работают полноценно во всех 4 брекетах (1-10, 11-25, 26-50, 51-80).
def _bot_target_distribution() -> dict[int, int]:
    out = {1: 50}
    for lv in range(2, 81):
        out[lv] = 100
    return out

BOT_COUNT_BY_LEVEL = _bot_target_distribution()
# Раньше использовалось для рандомного «дозаполнения» выше 10-го уровня.
# Теперь не нужно: BOT_COUNT_BY_LEVEL сам покрывает 1..80.
BOT_EXTRA_POPULATION_ABOVE_10 = 0

TARGET_BOT_POPULATION = sum(BOT_COUNT_BY_LEVEL.values()) + BOT_EXTRA_POPULATION_ABOVE_10
INITIAL_BOTS_COUNT = TARGET_BOT_POPULATION  # совместимость со старыми упоминаниями
# Этап 9 редизайна: английские игровые ники в Telegram-стиле (как у живых игроков).
# Раньше были русские длинные «Жестокий_Тор» — палево, длинно. Теперь короткие
# nick-style: Flykiller, DarkRaven, IronFist. Префиксы по уровневой группе
# дополняют ник (необязательно), чтобы донатеры выглядели грознее новичков.
BOT_NAMES = [
    # Solo nicks (game-handle style)
    "Flykiller", "Vortex", "Raven", "Blaze", "Frost", "Shadow", "Storm",
    "Wraith", "Hunter", "Slayer", "Reaper", "Ghost", "Razor", "Viper",
    "Falcon", "Drake", "Wolf", "Tiger", "Eagle", "Cobra", "Lynx",
    "Maverick", "Joker", "Striker", "Sniper", "Ranger", "Rogue", "Saint",
    "Demon", "Onyx", "Crimson", "Steel", "Iron", "Fury", "Rage", "Zero",
    # Compound nicks (popular Telegram/Steam style)
    "DarkWolf", "IronFist", "ShadowBlade", "NightCrow", "SkullKing",
    "BloodHawk", "FireDrake", "IceFury", "SteelRain", "BlackOps",
    "RedViper", "GoldFang", "SilverArc", "BrokenAxe", "WildBoar",
    "DeadEye", "LoneWolf", "SilentFox", "FrozenSky", "BurnedSoul",
    # Short power nicks
    "Kage", "Riot", "Pyro", "Hexx", "Nyx", "Lex", "Krov", "Skyfall",
    "Phantom", "Specter", "Hydra", "Atlas", "Titan", "Ronin", "Saber",
    "Mox", "Vex", "Zane", "Vox", "Ryze",
]

BOT_PREFIXES = {
    # Префикс — необязателен. Если выбран — добавляется перед ником: «Wild_Vortex».
    # Помогает донатеру выглядеть мощнее, новичку — проще.
    "novice": [
        "", "", "", "Lil",  # часто без префикса
    ],
    "warrior": [
        "", "Iron", "Wild", "Cold", "Night",
    ],
    "master": [
        "Dark", "Cruel", "Reaper", "Crimson", "Black",
    ],
    "legend": [
        "Lord", "King", "God", "Eternal", "Apex", "Mythic", "Boss",
    ],
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
CRYPTOPAY_TESTNET = os.getenv("CRYPTOPAY_TESTNET", "0") == "1"
# Полный сброс аккаунта через CryptoPay Mini App (только USDT)
FULL_RESET_CRYPTO_USDT = (os.getenv("FULL_RESET_CRYPTO_USDT") or "11.99").strip()
FULL_RESET_STARS = int(os.getenv("FULL_RESET_STARS") or "600")

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
