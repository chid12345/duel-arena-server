"""Каталог образов (аватарок) и связанные константы."""

# Масштабирование бонусов к базовым статам.
AVATAR_SCALE_EVERY_LEVELS = 20
AVATAR_SCALE_MAX_BONUS = 3

# Элитный образ (Stars/USDT).
ELITE_AVATAR_ID = "elite_emperor"
ELITE_AVATAR_STARS = 590
ELITE_AVATAR_USDT = "11.99"

# Премиум-аватарки ($1 USDT / 50 Stars каждый).
PREMIUM_AVATAR_STARS = 50
PREMIUM_AVATAR_USDT = "1.00"

# Подписочный образ.
SUB_AVATAR_ID = "sub_celestial"
SUB_STAT_PENALTY = 0.30  # -30% к статам при истекшей подписке

# Реферальный образ.
REF_AVATAR_ID = "ref_guardian"
REF_AVATAR_THRESHOLD = 5  # сколько рефералов нужно

# В проекте "agility" = endurance, "intuition" = crit.
AVATAR_CATALOG = [
    # ── СТАРТОВЫЙ (нулевой, только визуал) ───────────────────────────
    {"id": "default_start", "name": "🗡️ Боец",              "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 0, "endurance": 0, "crit": 0, "hp_flat": 0,  "badge": "🗡️", "description": "Стартовый образ. Без бонусов к характеристикам."},

    # ── БЕСПЛАТНЫЕ (base, common, ~10 очков) ─────────────────────────
    {"id": "base_tank",      "name": "🛡️ Страж Бастиона",   "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 5, "endurance": 5, "crit": 0, "hp_flat": 0,  "badge": "🛡️", "description": "Танк: +5 Сила и +5 Ловкость."},
    {"id": "base_rogue",     "name": "🌪️ Теневой Ловкач",   "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 0, "hp_flat": 0,  "badge": "🌪️", "description": "Ловкач: +5 Ловкость."},
    {"id": "base_crit",      "name": "⚡ Охотник Критов",    "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 5, "hp_flat": 0,  "badge": "⚡",  "description": "Критовик: +5 Интуиция и +5 Ловкость."},
    {"id": "base_neutral",   "name": "🎯 Универсал",         "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 2, "endurance": 2, "crit": 2, "hp_flat": 4,  "badge": "🎯", "description": "Нейтральный: +2 ко всем."},
    {"id": "base_berserker", "name": "🔥 Берсерк",           "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 7, "endurance": 3, "crit": 0, "hp_flat": 0,  "badge": "🔥", "description": "Чистая сила — бьёт как бешеный."},
    {"id": "base_monk",      "name": "🧘 Монах",             "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 0, "endurance": 7, "crit": 0, "hp_flat": 4,  "badge": "🧘", "description": "Стойкий воин — выносливость и HP."},
    {"id": "base_shooter",   "name": "🏹 Стрелок",           "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 0, "endurance": 3, "crit": 7, "hp_flat": 0,  "badge": "🏹", "description": "Точные удары — крит и ловкость."},
    {"id": "base_gladiator", "name": "⚔️ Гладиатор",         "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 4, "endurance": 4, "crit": 2, "hp_flat": 0,  "badge": "⚔️", "description": "Боец арены — сбалансированная атака."},
    {"id": "base_shadow",    "name": "🌑 Тень",              "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 2, "endurance": 2, "crit": 5, "hp_flat": 2,  "badge": "🌑", "description": "Незаметный — крит из тени."},
    {"id": "base_viking",    "name": "🪓 Викинг",            "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 6, "endurance": 4, "crit": 0, "hp_flat": 0,  "badge": "🪓", "description": "Северный воин — сила и стойкость."},
    {"id": "base_samurai",   "name": "⛩️ Самурай",           "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 3, "endurance": 3, "crit": 4, "hp_flat": 0,  "badge": "⛩️", "description": "Путь меча — сила и точность."},
    {"id": "base_paladin",   "name": "✨ Паладин",            "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 3, "endurance": 5, "crit": 0, "hp_flat": 4,  "badge": "✨",  "description": "Светлый защитник — живучий."},
    {"id": "base_ranger",    "name": "🏹 Рейнджер",          "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 2, "endurance": 4, "crit": 4, "hp_flat": 0,  "badge": "🏹", "description": "Дальний бой — ловкий и точный."},
    {"id": "base_nomad",     "name": "🌍 Кочевник",           "tier": "base", "rarity": "common",    "currency": "free", "price": 0, "strength": 3, "endurance": 3, "crit": 1, "hp_flat": 4,  "badge": "🌍", "description": "Странник — выживает везде."},

    # ── ЗОЛОТО (gold, rare, ~21 очко, 4200-5200g) ────────────────────
    {"id": "gold_vanguard",   "name": "🛡️ Железный Авангард",   "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 6,  "endurance": 8, "crit": 0, "hp_flat": 12, "badge": "🛡️", "description": "Mid-tier танк."},
    {"id": "gold_blade",      "name": "🗡️ Танцор Клинка",       "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 3,  "endurance": 8, "crit": 3, "hp_flat": 6,  "badge": "🗡️", "description": "Mid-tier дуэлянт."},
    {"id": "gold_hunter",     "name": "🎯 Охотник за Слабостями","tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 5,  "endurance": 4, "crit": 6, "hp_flat": 4,  "badge": "🎯", "description": "Mid-tier крит-давление."},
    {"id": "gold_tactician",  "name": "📘 Полевой Тактик",      "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4600, "strength": 4,  "endurance": 4, "crit": 4, "hp_flat": 8,  "badge": "📘", "description": "Гибкий mid-tier образ."},
    {"id": "gold_warlord",    "name": "⚔️ Полководец",          "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4400, "strength": 7,  "endurance": 6, "crit": 2, "hp_flat": 6,  "badge": "⚔️", "description": "Сила + запас прочности."},
    {"id": "gold_assassin",   "name": "🗡️ Ассасин",             "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4600, "strength": 4,  "endurance": 5, "crit": 8, "hp_flat": 4,  "badge": "🗡️", "description": "Смертельный крит-монстр."},
    {"id": "gold_sentinel",   "name": "🔰 Страж Порядка",       "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 3,  "endurance": 8, "crit": 0, "hp_flat": 10, "badge": "🔰", "description": "Неубиваемый — максимум стойкости."},
    {"id": "gold_brawler",    "name": "👊 Драчун",              "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4800, "strength": 9,  "endurance": 5, "crit": 2, "hp_flat": 4,  "badge": "👊", "description": "Тяжёлые кулаки."},
    {"id": "gold_shaman",     "name": "🔮 Шаман",               "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4400, "strength": 2,  "endurance": 6, "crit": 5, "hp_flat": 8,  "badge": "🔮", "description": "Мистик — выносливость и крит."},
    {"id": "gold_knight",     "name": "🏇 Рыцарь",              "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4600, "strength": 5,  "endurance": 7, "crit": 3, "hp_flat": 6,  "badge": "🏇", "description": "Благородный воин."},
    {"id": "gold_mercenary",  "name": "💣 Наёмник",             "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 6,  "endurance": 4, "crit": 6, "hp_flat": 4,  "badge": "💣", "description": "Сила и крит за золото."},
    {"id": "gold_defender",   "name": "🛡️ Защитник Крепости",   "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4800, "strength": 2,  "endurance": 8, "crit": 2, "hp_flat": 10, "badge": "🛡️", "description": "Несгибаемая стена."},
    {"id": "gold_lightning",  "name": "⚡ Молниеносный",        "tier": "gold", "rarity": "rare", "currency": "gold", "price": 5000, "strength": 5,  "endurance": 5, "crit": 5, "hp_flat": 6,  "badge": "⚡",  "description": "Быстрый как молния."},
    {"id": "gold_champion",   "name": "🏆 Чемпион Арены",       "tier": "gold", "rarity": "rare", "currency": "gold", "price": 5200, "strength": 7,  "endurance": 6, "crit": 4, "hp_flat": 4,  "badge": "🏆", "description": "Лучший за золото."},

    # ── АЛМАЗЫ (diamond, epic, ~24 очка, 240-300💎) ──────────────────
    {"id": "dia_duelist",    "name": "💎 Кровавый Дуэлянт",  "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 6,  "endurance": 3, "crit": 7, "hp_flat": 4,  "badge": "💎", "description": "Высокий риск/урон."},
    {"id": "dia_fortress",   "name": "💎 Стальная Крепость", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 4,  "endurance": 9, "crit": 2, "hp_flat": 14, "badge": "💎", "description": "Максимальная стойкость."},
    {"id": "dia_phantom",    "name": "💎 Призрачный Шаг",    "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 240, "strength": 4,  "endurance": 7, "crit": 5, "hp_flat": 6,  "badge": "💎", "description": "Контроль темпа."},
    {"id": "dia_reaper",     "name": "💀 Жнец Душ",          "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 250, "strength": 8,  "endurance": 4, "crit": 6, "hp_flat": 6,  "badge": "💀", "description": "Жуткий крит."},
    {"id": "dia_titan",      "name": "🗿 Титан",             "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 260, "strength": 5,  "endurance": 8, "crit": 0, "hp_flat": 14, "badge": "🗿", "description": "Гигант — максимум HP."},
    {"id": "dia_specter",    "name": "👻 Призрак",            "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 260, "strength": 3,  "endurance": 8, "crit": 8, "hp_flat": 4,  "badge": "👻", "description": "Неуловимый — ловкость + крит."},
    {"id": "dia_warden",     "name": "⚖️ Надзиратель",       "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 270, "strength": 6,  "endurance": 7, "crit": 4, "hp_flat": 8,  "badge": "⚖️", "description": "Контроль поля боя."},
    {"id": "dia_ravager",    "name": "🌋 Разоритель",         "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 240, "strength": 9,  "endurance": 3, "crit": 8, "hp_flat": 2,  "badge": "🌋", "description": "Стекло-пушка."},
    {"id": "dia_oracle",     "name": "🔮 Оракул",            "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 280, "strength": 2,  "endurance": 9, "crit": 6, "hp_flat": 8,  "badge": "🔮", "description": "Видит будущее."},
    {"id": "dia_stormzerker","name": "⛈️ Берсерк Бури",      "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 280, "strength": 10, "endurance": 5, "crit": 3, "hp_flat": 6,  "badge": "⛈️", "description": "Ярость шторма."},
    {"id": "dia_shadow_monk","name": "🧘 Теневой Монах",     "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 260, "strength": 4,  "endurance": 8, "crit": 5, "hp_flat": 8,  "badge": "🧘", "description": "Дзен и тьма."},
    {"id": "dia_juggernaut", "name": "🦾 Джаггернаут",       "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 280, "strength": 7,  "endurance": 6, "crit": 2, "hp_flat": 12, "badge": "🦾", "description": "Тяжёлая машина."},
    {"id": "dia_liquidator", "name": "🎭 Ликвидатор",        "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 300, "strength": 5,  "endurance": 5, "crit": 9, "hp_flat": 4,  "badge": "🎭", "description": "Максимум крита."},

    # ── PREMIUM (stars/usdt, legendary, ~29 очков, $1 / 50⭐) ────────
    {"id": "prem_dragon",  "name": "🐉 Дракон Хаоса", "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 8, "endurance": 7, "crit": 5, "hp_flat": 10, "badge": "🐉", "description": "Древний зверь."},
    {"id": "prem_phoenix", "name": "🔥 Феникс",       "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 6, "endurance": 8, "crit": 6, "hp_flat": 8,  "badge": "🔥", "description": "Возрождение."},
    {"id": "prem_kraken",  "name": "🦑 Кракен",       "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 5, "endurance": 9, "crit": 3, "hp_flat": 14, "badge": "🦑", "description": "Монстр глубин."},
    {"id": "prem_wolf",    "name": "🐺 Альфа Волк",   "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 7, "endurance": 6, "crit": 7, "hp_flat": 8,  "badge": "🐺", "description": "Вожак стаи."},
    {"id": "prem_lion",    "name": "🦁 Лев Арены",    "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 9, "endurance": 7, "crit": 4, "hp_flat": 10, "badge": "🦁", "description": "Царь зверей."},
    {"id": "prem_serpent", "name": "🐍 Змей Тьмы",    "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 4, "endurance": 8, "crit": 9, "hp_flat": 8,  "badge": "🐍", "description": "Ядовитый — крит из засады."},
    {"id": "prem_eagle",   "name": "🦅 Орёл Небес",   "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 6, "endurance": 7, "crit": 8, "hp_flat": 8,  "badge": "🦅", "description": "Удар с высоты."},
    {"id": "prem_bear",    "name": "🐻 Медведь",      "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 8, "endurance": 8, "crit": 2, "hp_flat": 12, "badge": "🐻", "description": "Неудержимая мощь."},
    {"id": "prem_panther", "name": "🐆 Пантера",      "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 7, "endurance": 6, "crit": 8, "hp_flat": 8,  "badge": "🐆", "description": "Молниеносный хищник."},
    {"id": "prem_hydra",   "name": "🐲 Гидра",        "tier": "premium", "rarity": "legendary", "currency": "stars", "price": 50, "usdt_price": "1.00", "strength": 6, "endurance": 8, "crit": 5, "hp_flat": 12, "badge": "🐲", "description": "Многоглавый зверь."},

    # ── ПОДПИСКА (sub, legendary, 39 очков) ──────────────────────────
    {"id": "sub_celestial", "name": "👑 Небесный Страж", "tier": "sub", "rarity": "legendary", "currency": "subscription", "price": 0, "strength": 9, "endurance": 9, "crit": 7, "hp_flat": 14, "badge": "👑", "description": "Эксклюзив для Premium подписчиков."},

    # ── РЕФЕРАЛЬНЫЙ (referral, legendary, 30 очков) ──────────────────
    {"id": "ref_guardian", "name": "🤝 Страж Братства", "tier": "referral", "rarity": "common", "currency": "referral", "price": 0, "strength": 1, "endurance": 1, "crit": 1, "hp_flat": 1, "badge": "🤝", "description": "Пригласи 5+ друзей. Коллекционный."},

    # ── ЭЛИТНЫЙ (elite, legendary, 42 базовых + 19 свободных) ───────
    {"id": "elite_emperor", "name": "👑 Император Арены", "tier": "elite", "rarity": "legendary", "currency": "usdt_stars", "price": 0, "strength": 8, "endurance": 8, "crit": 8, "hp_flat": 18, "badge": "👑", "description": "Элитный образ с максимальным статусом."},
]

PREMIUM_AVATAR_IDS = [a["id"] for a in AVATAR_CATALOG if a["tier"] == "premium"]
