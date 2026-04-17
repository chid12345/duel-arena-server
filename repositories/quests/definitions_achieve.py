"""Определения многоуровневых достижений (achievements)."""
from __future__ import annotations

from repositories.quests.definitions_achieve_wb import WB_ACHIEVEMENT_DEFS

# source: "computed" — значение берётся из существующих колонок БД (wins, level…)
# source: "tracked"  — значение накапливается в task_progress через хуки

ACHIEVEMENT_DEFS: list[dict] = [
    # ── ВЫЧИСЛЯЕМЫЕ ────────────────────────────────────────────────────
    {
        "key": "ach_battles", "label": "⚔️ Ветеран боёв",
        "desc": "Всего проведено боёв", "source": "computed", "compute": "battles",
        "tiers": [
            {"tier": 1, "target": 100,  "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 2, "target": 500,  "gold": 500,  "diamonds": 3,  "xp": 1500},
            {"tier": 3, "target": 1000, "gold": 1000, "diamonds": 7,  "xp": 3000},
            {"tier": 4, "target": 5000, "gold": 2500, "diamonds": 20, "xp": 8000},
        ],
    },
    {
        "key": "ach_wins", "label": "🏆 Победоносный",
        "desc": "Всего одержано побед", "source": "computed", "compute": "wins",
        "tiers": [
            {"tier": 1, "target": 50,   "gold": 150,  "diamonds": 1,  "xp": 400},
            {"tier": 2, "target": 200,  "gold": 400,  "diamonds": 3,  "xp": 1200},
            {"tier": 3, "target": 500,  "gold": 800,  "diamonds": 6,  "xp": 2500},
            {"tier": 4, "target": 2000, "gold": 2000, "diamonds": 15, "xp": 6000},
        ],
    },
    {
        "key": "ach_level", "label": "⭐ Восходящая звезда",
        "desc": "Достигнутый уровень", "source": "computed", "compute": "level",
        "tiers": [
            {"tier": 1, "target": 10,  "gold": 150,  "diamonds": 0,  "xp": 300},
            {"tier": 2, "target": 25,  "gold": 300,  "diamonds": 2,  "xp": 800},
            {"tier": 3, "target": 50,  "gold": 600,  "diamonds": 5,  "xp": 2000},
            {"tier": 4, "target": 75,  "gold": 1000, "diamonds": 8,  "xp": 4000},
            {"tier": 5, "target": 100, "gold": 2000, "diamonds": 15, "xp": 8000},
        ],
    },
    {
        "key": "ach_tower", "label": "🏰 Башнеодолитель",
        "desc": "Лучший этаж Башни Титанов", "source": "computed", "compute": "tower_best",
        "tiers": [
            {"tier": 1, "target": 10, "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 2, "target": 25, "gold": 500,  "diamonds": 3,  "xp": 1500},
            {"tier": 3, "target": 50, "gold": 1000, "diamonds": 8,  "xp": 4000},
        ],
    },
    {
        "key": "ach_endless", "label": "🌊 Легенда Натиска",
        "desc": "Лучшая волна в Натиске", "source": "computed", "compute": "endless_best",
        "tiers": [
            {"tier": 1, "target": 5,  "gold": 150,  "diamonds": 1,  "xp": 400},
            {"tier": 2, "target": 10, "gold": 300,  "diamonds": 2,  "xp": 800},
            {"tier": 3, "target": 20, "gold": 600,  "diamonds": 5,  "xp": 2000},
            {"tier": 4, "target": 50, "gold": 1500, "diamonds": 12, "xp": 5000},
        ],
    },
    {
        "key": "ach_referrals", "label": "👥 Лидер племени",
        "desc": "Приглашено игроков по реферальной ссылке",
        "source": "computed", "compute": "referrals",
        "tiers": [
            {"tier": 1, "target": 1,  "gold": 200,  "diamonds": 2,  "xp": 500},
            {"tier": 2, "target": 3,  "gold": 500,  "diamonds": 5,  "xp": 1500},
            {"tier": 3, "target": 10, "gold": 1000, "diamonds": 15, "xp": 4000},
        ],
    },
    # ── ОТСЛЕЖИВАЕМЫЕ ──────────────────────────────────────────────────
    {
        "key": "ach_buy_gold", "label": "🛒 Покупки за золото",
        "desc": "Покупок за золото в магазине", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 10,   "gold": 100,  "diamonds": 0,  "xp": 200},
            {"tier": 2, "target": 25,   "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 3, "target": 50,   "gold": 400,  "diamonds": 2,  "xp": 1000},
            {"tier": 4, "target": 100,  "gold": 700,  "diamonds": 4,  "xp": 2000},
            {"tier": 5, "target": 200,  "gold": 1000, "diamonds": 6,  "xp": 3500},
            {"tier": 6, "target": 300,  "gold": 1300, "diamonds": 8,  "xp": 5000},
            {"tier": 7, "target": 500,  "gold": 1700, "diamonds": 12, "xp": 7000},
            {"tier": 8, "target": 750,  "gold": 2000, "diamonds": 16, "xp": 9500},
            {"tier": 9, "target": 1000, "gold": 2500, "diamonds": 25, "xp": 12000},
        ],
    },
    {
        "key": "ach_buy_diamonds", "label": "💎 Покупки за алмазы",
        "desc": "Покупок за алмазы в магазине", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 5,   "gold": 150,  "diamonds": 1,  "xp": 300},
            {"tier": 2, "target": 13,  "gold": 280,  "diamonds": 2,  "xp": 700},
            {"tier": 3, "target": 25,  "gold": 500,  "diamonds": 4,  "xp": 1300},
            {"tier": 4, "target": 50,  "gold": 800,  "diamonds": 7,  "xp": 2500},
            {"tier": 5, "target": 100, "gold": 1200, "diamonds": 12, "xp": 4000},
            {"tier": 6, "target": 150, "gold": 1500, "diamonds": 16, "xp": 6000},
            {"tier": 7, "target": 250, "gold": 2000, "diamonds": 25, "xp": 9000},
            {"tier": 8, "target": 375, "gold": 2500, "diamonds": 35, "xp": 12000},
            {"tier": 9, "target": 500, "gold": 3000, "diamonds": 50, "xp": 16000},
        ],
    },
    {
        "key": "ach_buy_premium", "label": "👑 Покупки за USDT/Stars",
        "desc": "Покупок за USDT или Stars", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 3,   "gold": 200,  "diamonds": 2,   "xp": 500},
            {"tier": 2, "target": 6,   "gold": 400,  "diamonds": 4,   "xp": 1000},
            {"tier": 3, "target": 13,  "gold": 700,  "diamonds": 8,   "xp": 2000},
            {"tier": 4, "target": 25,  "gold": 1200, "diamonds": 15,  "xp": 4000},
            {"tier": 5, "target": 50,  "gold": 2000, "diamonds": 25,  "xp": 7000},
            {"tier": 6, "target": 75,  "gold": 2800, "diamonds": 40,  "xp": 10000},
            {"tier": 7, "target": 125, "gold": 3500, "diamonds": 60,  "xp": 15000},
            {"tier": 8, "target": 200, "gold": 4500, "diamonds": 80,  "xp": 20000},
            {"tier": 9, "target": 250, "gold": 5000, "diamonds": 100, "xp": 25000},
        ],
    },
    # ── КОЛЛЕКЦИЯ ОБРАЗОВ ───────────────────────────────────────────
    {
        "key": "ach_collect_avatar_gold", "label": "🛡️ Коллекция золотых образов",
        "desc": "Куплено образов за золото", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 1,  "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 2, "target": 5,  "gold": 500,  "diamonds": 5,  "xp": 2000},
            {"tier": 3, "target": 10, "gold": 1000, "diamonds": 15, "xp": 5000},
        ],
    },
    {
        "key": "ach_collect_avatar_dia", "label": "💎 Коллекция алмазных образов",
        "desc": "Куплено образов за алмазы", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 1,  "gold": 300,  "diamonds": 2,  "xp": 500},
            {"tier": 2, "target": 5,  "gold": 700,  "diamonds": 5,  "xp": 1500},
            {"tier": 3, "target": 10, "gold": 1500, "diamonds": 10, "xp": 4000},
        ],
    },
    {
        "key": "ach_collect_avatar_premium", "label": "🐉 Коллекция премиум образов",
        "desc": "Куплено образов за USDT/Stars", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 1,  "gold": 400,  "diamonds": 3,  "xp": 600},
            {"tier": 2, "target": 5,  "gold": 1000, "diamonds": 8,  "xp": 2000},
            {"tier": 3, "target": 10, "gold": 2000, "diamonds": 15, "xp": 5000},
        ],
    },
    {
        "key": "ach_use_potions", "label": "🧪 Мастер эликсиров",
        "desc": "Использовано эликсиров", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 10,   "gold": 80,   "diamonds": 0,  "xp": 150},
            {"tier": 2, "target": 25,   "gold": 180,  "diamonds": 1,  "xp": 400},
            {"tier": 3, "target": 50,   "gold": 350,  "diamonds": 2,  "xp": 800},
            {"tier": 4, "target": 100,  "gold": 600,  "diamonds": 4,  "xp": 1500},
            {"tier": 5, "target": 200,  "gold": 900,  "diamonds": 6,  "xp": 2500},
            {"tier": 6, "target": 300,  "gold": 1200, "diamonds": 8,  "xp": 4000},
            {"tier": 7, "target": 500,  "gold": 1600, "diamonds": 12, "xp": 6000},
            {"tier": 8, "target": 750,  "gold": 2000, "diamonds": 17, "xp": 8500},
            {"tier": 9, "target": 1000, "gold": 2500, "diamonds": 25, "xp": 12000},
        ],
    },
    {
        "key": "ach_use_scrolls", "label": "📜 Мастер свитков",
        "desc": "Использовано свитков", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 10,   "gold": 100,  "diamonds": 0,  "xp": 200},
            {"tier": 2, "target": 25,   "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 3, "target": 50,   "gold": 400,  "diamonds": 3,  "xp": 1000},
            {"tier": 4, "target": 100,  "gold": 700,  "diamonds": 5,  "xp": 2000},
            {"tier": 5, "target": 200,  "gold": 1000, "diamonds": 8,  "xp": 3500},
            {"tier": 6, "target": 300,  "gold": 1400, "diamonds": 11, "xp": 5000},
            {"tier": 7, "target": 500,  "gold": 1800, "diamonds": 15, "xp": 7000},
            {"tier": 8, "target": 750,  "gold": 2300, "diamonds": 21, "xp": 10000},
            {"tier": 9, "target": 1000, "gold": 3000, "diamonds": 30, "xp": 14000},
        ],
    },
    {
        "key": "ach_use_hp_small", "label": "💊 Зелья здоровья",
        "desc": "Использовано малых зелий здоровья", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 25,  "gold": 100,  "diamonds": 0,  "xp": 200},
            {"tier": 2, "target": 50,  "gold": 200,  "diamonds": 1,  "xp": 400},
            {"tier": 3, "target": 100, "gold": 400,  "diamonds": 2,  "xp": 800},
            {"tier": 4, "target": 300, "gold": 800,  "diamonds": 5,  "xp": 2000},
            {"tier": 5, "target": 500, "gold": 1500, "diamonds": 10, "xp": 4000},
        ],
    },
    {
        "key": "ach_spend_gold", "label": "💰 Транжира золота",
        "desc": "Потрачено золота в магазине", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 500,   "gold": 100,  "diamonds": 0,  "xp": 200},
            {"tier": 2, "target": 1000,  "gold": 200,  "diamonds": 1,  "xp": 500},
            {"tier": 3, "target": 1500,  "gold": 300,  "diamonds": 1,  "xp": 700},
            {"tier": 4, "target": 3000,  "gold": 500,  "diamonds": 2,  "xp": 1200},
            {"tier": 5, "target": 5000,  "gold": 800,  "diamonds": 4,  "xp": 2000},
            {"tier": 6, "target": 15000, "gold": 1500, "diamonds": 10, "xp": 5000},
        ],
    },
    {
        "key": "ach_spend_diamonds", "label": "💎 Транжира алмазов",
        "desc": "Потрачено алмазов в магазине", "source": "tracked",
        "tiers": [
            {"tier": 1, "target": 50,   "gold": 100,  "diamonds": 1,  "xp": 300},
            {"tier": 2, "target": 100,  "gold": 200,  "diamonds": 2,  "xp": 600},
            {"tier": 3, "target": 300,  "gold": 450,  "diamonds": 5,  "xp": 1500},
            {"tier": 4, "target": 600,  "gold": 800,  "diamonds": 8,  "xp": 3000},
            {"tier": 5, "target": 1200, "gold": 1500, "diamonds": 15, "xp": 5500},
            {"tier": 6, "target": 2000, "gold": 2500, "diamonds": 25, "xp": 9000},
        ],
    },
]

# Достижения Мирового босса (отдельный модуль по Закону 9).
ACHIEVEMENT_DEFS.extend(WB_ACHIEVEMENT_DEFS)

# Быстрый поиск по ключу
ACHIEVEMENT_BY_KEY: dict[str, dict] = {a["key"]: a for a in ACHIEVEMENT_DEFS}
