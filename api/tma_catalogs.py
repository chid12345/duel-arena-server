"""Каталоги магазина и пакетов монетизации для TMA."""

from config import (
    CRYPTOPAY_TESTNET,
    ELITE_AVATAR_ID,
    ELITE_AVATAR_STARS,
    ELITE_AVATAR_USDT,
    FULL_RESET_CRYPTO_USDT,
    FULL_RESET_STARS,
    PREMIUM_SUBSCRIPTION_STARS,
)

# inventory=True → после покупки предмет идёт в player_inventory (применить вручную)
# inventory=False/отсутствует → эффект применяется немедленно
SHOP_CATALOG = {
    # ── Расходники: применяются сразу ─────────────────────────
    "hp_small":      {"name": "Малое зелье HP",       "price": 12,  "currency": "gold",     "icon": "🧪", "tab": "consumables", "desc": "+30% HP"},
    "hp_medium":     {"name": "Среднее зелье HP",      "price": 25,  "currency": "gold",     "icon": "💊", "tab": "consumables", "desc": "+60% HP"},
    "hp_full":       {"name": "Полное зелье HP",       "price": 50,  "currency": "gold",     "icon": "⚗️", "tab": "consumables", "desc": "Полное HP"},
    "xp_boost_5":    {"name": "XP Буст ×1.5",         "price": 100, "currency": "gold",     "icon": "⚡", "tab": "consumables", "desc": "5 боёв с бонусом XP",   "inventory": True},
    "xp_boost_20":   {"name": "XP Буст ×1.5",         "price": 25,  "currency": "diamonds", "icon": "⚡", "tab": "consumables", "desc": "20 боёв с бонусом XP",  "inventory": True},
    "xp_boost_x2":   {"name": "XP Буст ×2.0",         "price": 40,  "currency": "diamonds", "icon": "🚀", "tab": "consumables", "desc": "10 боёв XP ×2.0",       "inventory": True},
    "gold_hunt":     {"name": "Охота за золотом",      "price": 20,  "currency": "diamonds", "icon": "💰", "tab": "consumables", "desc": "+20% золото за бой, 24 ч", "inventory": True},
    "xp_hunt":       {"name": "Охота за опытом",       "price": 20,  "currency": "diamonds", "icon": "📚", "tab": "consumables", "desc": "+50% опыта за бой, 24 ч",  "inventory": True},
    "stat_reset":    {"name": "Сброс статов",          "price": 200, "currency": "diamonds", "icon": "🔄", "tab": "consumables", "desc": "Сбросить все статы"},

    # ── Свитки воскрешения (для рейда Мирового босса, 10 зарядов в пачке) ───
    "res_30":        {"name": "Свиток воскрешения +30%",  "price": 500, "currency": "gold",     "icon": "🕯️", "tab": "resurrection", "desc": "10 воскрешений с 30% HP (рейд босса)", "inventory": True},
    "res_60":        {"name": "Свиток воскрешения +60%",  "price": 40,  "currency": "diamonds", "icon": "🔮", "tab": "resurrection", "desc": "10 воскрешений с 60% HP (рейд босса)", "inventory": True},
    "res_100":       {"name": "Свиток воскрешения 100%",  "price": 80,  "currency": "diamonds", "icon": "✨", "tab": "resurrection", "desc": "10 воскрешений со 100% HP (рейд босса)", "inventory": True},

    # ── Рейд-свитки (работают ТОЛЬКО в рейде босса, 1 заряд = 1 рейд, макс 2 активных) ──
    "damage_25":     {"name": "Свиток урона +25%",        "price": 60,  "currency": "diamonds", "icon": "⚔️", "tab": "raid_scrolls", "desc": "+25% урона по боссу (1 рейд)",     "inventory": True},
    "power_10":      {"name": "Свиток силы +10%",          "price": 30,  "currency": "diamonds", "icon": "💪", "tab": "raid_scrolls", "desc": "+10% урона (стак с +25%, 1 рейд)", "inventory": True},
    "defense_20":    {"name": "Свиток защиты +20%",        "price": 45,  "currency": "diamonds", "icon": "🛡️", "tab": "raid_scrolls", "desc": "+20% защита от ответки (1 рейд)",  "inventory": True},
    "dodge_10":      {"name": "Свиток уворота +10%",       "price": 35,  "currency": "diamonds", "icon": "💨", "tab": "raid_scrolls", "desc": "+10% уворот от ответки (1 рейд)",   "inventory": True},
    "crit_10":       {"name": "Свиток крита +10%",         "price": 40,  "currency": "diamonds", "icon": "🎯", "tab": "raid_scrolls", "desc": "+10% шанс крита (1 рейд)",           "inventory": True},

    # ── Свитки — золото (1 бой, дёшево) ───────────────────────
    "scroll_str_3":    {"name": "Эликсир силы +3",      "price": 60,  "currency": "gold",     "icon": "⚔️", "tab": "scrolls", "desc": "Сила +3, 1 бой",          "inventory": True},
    "scroll_end_3":    {"name": "Эликсир ловкости +3",  "price": 60,  "currency": "gold",     "icon": "🌀", "tab": "scrolls", "desc": "Ловкость +3, 1 бой",      "inventory": True},
    "scroll_crit_3":   {"name": "Эликсир интуиции +3",  "price": 75,  "currency": "gold",     "icon": "🎯", "tab": "scrolls", "desc": "Интуиция +3, 1 бой",       "inventory": True},
    "scroll_armor_6":  {"name": "Свиток брони 6%",      "price": 80,  "currency": "gold",     "icon": "🛡️", "tab": "scrolls", "desc": "Броня +6%, 1 бой",        "inventory": True},
    "scroll_hp_100":   {"name": "Эликсир HP +100",      "price": 70,  "currency": "gold",     "icon": "❤️", "tab": "scrolls", "desc": "+100 HP, 1 бой",          "inventory": True},
    "scroll_warrior":  {"name": "Комбо Воина",          "price": 110, "currency": "gold",     "icon": "⚔️", "tab": "scrolls", "desc": "Сила+2, Ловк+2, 1 бой",   "inventory": True},
    "scroll_shadow":   {"name": "Комбо Тени",           "price": 100, "currency": "gold",     "icon": "🌑", "tab": "scrolls", "desc": "Ловк+3, Уворот+3%, 1 бой", "inventory": True},
    "scroll_fury":     {"name": "Комбо Ярости",         "price": 120, "currency": "gold",     "icon": "💥", "tab": "scrolls", "desc": "Сила+4, Крит+2, 1 бой",    "inventory": True},

    # ── Свитки — алмазы (3 боя, средние) ─────────────────────
    "scroll_str_6":    {"name": "Эликсир силы +6",      "price": 20,  "currency": "diamonds", "icon": "⚔️", "tab": "scrolls", "desc": "Сила +6, 3 боя",          "inventory": True},
    "scroll_end_6":    {"name": "Эликсир ловкости +6",  "price": 20,  "currency": "diamonds", "icon": "🌀", "tab": "scrolls", "desc": "Ловкость +6, 3 боя",      "inventory": True},
    "scroll_crit_6":   {"name": "Эликсир интуиции +6",  "price": 25,  "currency": "diamonds", "icon": "🎯", "tab": "scrolls", "desc": "Интуиция +6, 3 боя",       "inventory": True},
    "scroll_dodge_5":  {"name": "Свиток уворота 5%",    "price": 25,  "currency": "diamonds", "icon": "💨", "tab": "scrolls", "desc": "Уворот +5%, 3 боя",        "inventory": True},
    "scroll_armor_10": {"name": "Свиток брони 10%",     "price": 30,  "currency": "diamonds", "icon": "🛡️", "tab": "scrolls", "desc": "Броня +10%, 3 боя",       "inventory": True},
    "scroll_hp_200":   {"name": "Эликсир HP +200",      "price": 25,  "currency": "diamonds", "icon": "❤️", "tab": "scrolls", "desc": "+200 HP, 3 боя",          "inventory": True},
    "scroll_double_10":{"name": "Двойной удар +10%",    "price": 35,  "currency": "diamonds", "icon": "⚡", "tab": "scrolls", "desc": "Двойной удар +10%, 3 боя", "inventory": True},
    "scroll_all_4":    {"name": "Все пассивки +4",      "price": 40,  "currency": "diamonds", "icon": "✨", "tab": "scrolls", "desc": "Сила+Ловк+Инт+Вын +4, 1 бой", "inventory": True},
    "scroll_bastion":  {"name": "Бастион",              "price": 35,  "currency": "diamonds", "icon": "🏰", "tab": "scrolls", "desc": "Ловк+5, Броня+8%, 3 боя",  "inventory": True},
    "scroll_predator": {"name": "Хищник",               "price": 35,  "currency": "diamonds", "icon": "🐍", "tab": "scrolls", "desc": "Крит+5, Двойн+8%, 3 боя",  "inventory": True},
    "scroll_berserker":{"name": "Берсерк",              "price": 40,  "currency": "diamonds", "icon": "🔥", "tab": "scrolls", "desc": "Сила+8, Броня-5%, 3 боя",   "inventory": True},
    "scroll_accuracy": {"name": "Свиток точности",      "price": 20,  "currency": "diamonds", "icon": "🎯", "tab": "scrolls", "desc": "Точность +15%, 3 боя",      "inventory": True},
    "scroll_vampire_g":{"name": "Свиток Вампира",      "price": 140, "currency": "gold",     "icon": "🩸", "tab": "scrolls", "desc": "Вампиризм 9%, 1 бой",       "inventory": True},
    "scroll_vampire_d":{"name": "Свиток Вампира+",     "price": 40,  "currency": "diamonds", "icon": "🧛", "tab": "scrolls", "desc": "Вампиризм 15%, 3 боя",      "inventory": True},

    # ── Обмен алмазы → золото ─────────────────────────────────
    "exchange_small":  {"name": "5💎 → 350🪙",          "price": 5,   "currency": "diamonds", "icon": "💱", "tab": "boxes", "desc": "Получить 350 золота"},
    "exchange_medium": {"name": "15💎 → 1100🪙",        "price": 15,  "currency": "diamonds", "icon": "💱", "tab": "boxes", "desc": "Получить 1100 золота"},
    "exchange_large":  {"name": "50💎 → 4000🪙",        "price": 50,  "currency": "diamonds", "icon": "💱", "tab": "boxes", "desc": "Получить 4000 золота"},

    # ── Лут-боксы ─────────────────────────────────────────────
    "box_common":      {"name": "Обычный ящик",         "price": 150, "currency": "gold",     "icon": "📦", "tab": "boxes", "desc": "2–4 свитка · шанс на алмазный", "inventory": True},
    "box_rare":        {"name": "Редкий ящик",          "price": 50,  "currency": "diamonds", "icon": "🟦", "tab": "boxes", "desc": "3–6 алмазных свитков", "inventory": True},
    "box_rare_c":      {"name": "Редкий ящик+",         "price": 80,  "currency": "diamonds", "icon": "🟪", "tab": "boxes", "desc": "2+ алмазных · шанс 300💎 и Premium", "inventory": True},
    "box_epic_e2":     {"name": "Эпический: Удача",     "price": 0,   "currency": "diamonds", "icon": "🔮", "tab": "boxes", "desc": "USDT-свиток + алмазные · шанс Титана", "inventory": True},
    "box_epic_e3":     {"name": "Эпический: Набор воина","price": 0,  "currency": "diamonds", "icon": "⚔️", "tab": "boxes", "desc": "USDT-свиток + XP×2 + свитки", "inventory": True},

    # ── Сундуки Мирового босса (не покупаются, дропают за рейд) ──────────
    "wb_gold_chest":   {"name": "Золотой сундук рейда", "price": 0, "currency": "gold",     "icon": "🏆", "tab": "boxes", "desc": "Награда за последний удар · 2–4 свитка · шанс на алмазы", "inventory": True},
    "wb_diamond_chest":{"name": "Алмазный сундук рейда","price": 0, "currency": "diamonds", "icon": "💠", "tab": "boxes", "desc": "Награда за топ урона · 3–5 премиум свитков · шанс на USDT-свиток и +100💎", "inventory": True},

    # ── USDT-свитки (только для попапов/инвентаря, не в обычном магазине) ───
    "scroll_str_12":   {"name": "Эликсир силы +12",      "price": 0, "currency": "diamonds", "icon": "⚔️", "tab": "scrolls", "desc": "Сила +12, 5 боёв",         "inventory": True},
    "scroll_end_12":   {"name": "Эликсир ловкости +12",  "price": 0, "currency": "diamonds", "icon": "🌀", "tab": "scrolls", "desc": "Ловкость +12, 5 боёв",      "inventory": True},
    "scroll_stam_12":  {"name": "Эликсир выносливости +12","price":0, "currency": "diamonds", "icon": "🛡️", "tab": "scrolls", "desc": "Выносливость +12, 5 боёв", "inventory": True},
    "scroll_crit_12":  {"name": "Эликсир интуиции +12",  "price": 0, "currency": "diamonds", "icon": "🎯", "tab": "scrolls", "desc": "Интуиция +12, 5 боёв",      "inventory": True},
    "scroll_hp_500":   {"name": "Эликсир HP +500",       "price": 0, "currency": "diamonds", "icon": "❤️", "tab": "scrolls", "desc": "+500 HP, 7 боёв",           "inventory": True},
    "scroll_all_12":   {"name": "Все пассивки +12",      "price": 0, "currency": "diamonds", "icon": "✨", "tab": "scrolls", "desc": "Сила+Ловк+Инт+Вын +12, 5 боёв", "inventory": True},
    "scroll_titan":    {"name": "Свиток Титана",         "price": 0, "currency": "diamonds", "icon": "🏔️", "tab": "scrolls", "desc": "Сила+Ловк+Инт+Вын +15, 3 боя", "inventory": True},
}

# Эффекты свитков при apply: [(buff_type, value, charges), ...]
SCROLL_EFFECTS = {
    "scroll_str_3":    [("strength",    3,   1)],
    "scroll_end_3":    [("endurance",   3,   1)],
    "scroll_crit_3":   [("crit",        3,   1)],
    "scroll_armor_6":  [("armor_pct",   6,   1)],
    "scroll_hp_100":   [("hp_bonus",    100, 1)],
    "scroll_warrior":  [("strength",    2,   1), ("endurance",  2,  1)],
    "scroll_shadow":   [("endurance",   3,   1), ("dodge_pct",  3,  1)],
    "scroll_fury":     [("strength",    4,   1), ("crit",       2,  1)],
    "scroll_str_6":    [("strength",    6,   3)],
    "scroll_end_6":    [("endurance",   6,   3)],
    "scroll_crit_6":   [("crit",        6,   3)],
    "scroll_dodge_5":  [("dodge_pct",   5,   3)],
    "scroll_armor_10": [("armor_pct",   10,  3)],
    "scroll_hp_200":   [("hp_bonus",    200, 3)],
    "scroll_double_10":[("double_pct",  10,  3)],
    "scroll_all_4":    [("strength",    4,   1), ("endurance",  4,  1), ("crit", 4, 1), ("stamina", 4, 1)],
    "scroll_bastion":  [("endurance",   5,   3), ("armor_pct",  8,  3)],
    "scroll_predator": [("crit",        5,   3), ("double_pct", 8,  3)],
    "scroll_berserker":[("strength",    8,   3), ("armor_pct",  -5, 3)],
    "scroll_accuracy": [("accuracy",    15,  3)],
    "scroll_vampire_g":[("lifesteal_pct", 9,  1)],
    "scroll_vampire_d":[("lifesteal_pct", 15, 3)],
    # USDT
    "scroll_str_12":   [("strength",    12,  5)],
    "scroll_end_12":   [("endurance",   12,  5)],
    "scroll_stam_12":  [("stamina",     12,  5)],
    "scroll_crit_12":  [("crit",        12,  5)],
    "scroll_hp_500":   [("hp_bonus",    500, 7)],
    "scroll_all_12":   [("strength",    12,  5), ("endurance", 12, 5), ("crit", 12, 5), ("stamina", 12, 5)],
    "scroll_titan":    [("strength",    15,  3), ("endurance", 15, 3), ("crit", 15, 3), ("stamina", 15, 3)],
}

STARS_PACKAGES = [
    {"id": "d100", "diamonds": 100, "stars": 150, "label": "100 💎"},
    {"id": "d300", "diamonds": 300, "stars": 390, "label": "300 💎"},
    {"id": "d500", "diamonds": 500, "stars": 650, "label": "500 💎"},
    {"id": "premium", "diamonds": 0, "stars": PREMIUM_SUBSCRIPTION_STARS, "label": "👑 Premium"},
    {
        "id": "sfullreset",
        "diamonds": 0,
        "stars": FULL_RESET_STARS,
        "label": "🔄 Сброс прогресса",
        "hint": "Уровень и бои с нуля; золото, 💎, клан и рефералка сохраняются",
        "full_reset": True,
        "stars_only": True,
    },
]

# Stars-свитки/ящики — те же предметы что и USDT, но за Telegram Stars
# Цены: ~50 Stars ≈ 1 USDT (150 Stars = $2.99 ≈ 100💎)
STARS_SCROLL_PACKAGES = [
    {"id": "ss_str_12",  "scroll_id": "scroll_str_12",  "label": "⚔️ Эликсир силы +12",        "stars": 65},
    {"id": "ss_end_12",  "scroll_id": "scroll_end_12",  "label": "🌀 Эликсир ловкости +12",     "stars": 65},
    {"id": "ss_stam_12", "scroll_id": "scroll_stam_12", "label": "🛡️ Эликсир выносливости +12", "stars": 65},
    {"id": "ss_crit_12", "scroll_id": "scroll_crit_12", "label": "🎯 Эликсир интуиции +12",     "stars": 65},
    {"id": "ss_hp_500",  "scroll_id": "scroll_hp_500",  "label": "❤️ Эликсир HP +500",          "stars": 65},
    {"id": "ss_all_12",  "scroll_id": "scroll_all_12",  "label": "✨ Все пассивки +12",          "stars": 130},
    {"id": "ss_titan",   "scroll_id": "scroll_titan",   "label": "🏔️ Свиток Титана",            "stars": 200},
    {"id": "ss_box_e2",  "scroll_id": "box_epic_e2",    "label": "🔮 Эпический: Удача",          "stars": 200},
    {"id": "ss_box_e3",  "scroll_id": "box_epic_e3",    "label": "⚔️ Эпический: Набор воина",   "stars": 200},
]

ELITE_AVATAR_STARS_PACKAGE = {
    "id": "elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "stars": int(ELITE_AVATAR_STARS),
}

# USDT-свитки в "Особые" вкладке (дополнительно к обычным пакетам)
USDT_SCROLL_PACKAGES = [
    {"id": "us_str_12",  "scroll_id": "scroll_str_12",  "label": "⚔️ Эликсир силы +12",        "usdt": "1"},
    {"id": "us_end_12",  "scroll_id": "scroll_end_12",  "label": "🌀 Эликсир ловкости +12",     "usdt": "1"},
    {"id": "us_stam_12", "scroll_id": "scroll_stam_12", "label": "🛡️ Эликсир выносливости +12", "usdt": "1"},
    {"id": "us_crit_12", "scroll_id": "scroll_crit_12", "label": "🎯 Эликсир интуиции +12",       "usdt": "1"},
    {"id": "us_hp_500",  "scroll_id": "scroll_hp_500",  "label": "❤️ Эликсир HP +500",          "usdt": "1"},
    {"id": "us_all_12",  "scroll_id": "scroll_all_12",  "label": "✨ Все пассивки +12",          "usdt": "2"},
    {"id": "us_titan",   "scroll_id": "scroll_titan",   "label": "🏔️ Свиток Титана",            "usdt": "3"},
    {"id": "us_box_e2",  "scroll_id": "box_epic_e2",      "label": "🔮 Эпический: Удача",           "usdt": "3"},
    {"id": "us_box_e3",  "scroll_id": "box_epic_e3",      "label": "⚔️ Эпический: Набор воина",    "usdt": "3"},
]

CRYPTO_PACKAGES = [
    {"id": "cd100", "diamonds": 100, "label": "100 💎", "usdt": "2.99"},
    {"id": "cd300", "diamonds": 300, "label": "300 💎", "usdt": "7.99"},
    {"id": "cd500", "diamonds": 500, "label": "500 💎", "usdt": "12.99"},
    {"id": "cdpremium", "diamonds": 0, "label": "👑 Premium", "usdt": "8.00", "premium": True},
    {
        "id": "cdfullreset",
        "diamonds": 0,
        "label": "🔄 Сброс прогресса",
        "hint": "Уровень и бои с нуля; золото, 💎, клан и рефералка сохраняются",
        "usdt": FULL_RESET_CRYPTO_USDT,
        "full_reset": True,
        "usdt_only": True,
    },
]

ELITE_AVATAR_CRYPTO_PACKAGE = {
    "id": "cd_elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "usdt": str(ELITE_AVATAR_USDT),
}

CRYPTOPAY_API_BASE = (
    "https://testnet-pay.crypt.bot/api" if CRYPTOPAY_TESTNET else "https://pay.crypt.bot/api"
)
