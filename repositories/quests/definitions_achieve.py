"""Определения многоуровневых достижений (achievements).

Награды калиброваны по системе RARITY × TIER (rebalance 2026-05-15).
Базовая шкала по тиру (для common):
    T1:    80g /  0💎 /  200⭐
    T2:   180g /  1💎 /  400⭐
    T3:   350g /  3💎 /  700⭐
    T4:   600g /  5💎 / 1100⭐
    T5:  1000g /  8💎 / 1600⭐
    T6:  1500g / 12💎 / 2200⭐
    T7:  2000g / 16💎 / 3000⭐
    T8:  2700g / 22💎 / 4000⭐
    T9:  3500g / 30💎 / 5000⭐

Множитель редкости:
    common (фарм-действия)         × 1.0
    rare   (прогресс, расходники)  × 1.3
    epic   (алмазы, образы)        × 1.6
    legendary (премиум, рейды)     × 2.0
"""
from __future__ import annotations

from repositories.quests.definitions_achieve_wb import WB_ACHIEVEMENT_DEFS

# source: "computed" — значение берётся из существующих колонок БД (wins, level…)
# source: "tracked"  — значение накапливается в task_progress через хуки

ACHIEVEMENT_DEFS: list[dict] = [
    # ── ВЫЧИСЛЯЕМЫЕ ────────────────────────────────────────────────────
    {
        "key": "ach_battles", "label": "⚔️ Ветеран боёв",
        "desc": "Всего проведено боёв", "source": "computed", "compute": "battles",
        # common × 1.0
        "tiers": [
            {"tier": 1, "target": 100,  "gold":  80, "diamonds":  0, "xp":  200},
            {"tier": 2, "target": 500,  "gold": 180, "diamonds":  1, "xp":  400},
            {"tier": 3, "target": 1000, "gold": 350, "diamonds":  3, "xp":  700},
            {"tier": 4, "target": 5000, "gold": 600, "diamonds":  5, "xp": 1100},
        ],
    },
    {
        "key": "ach_wins", "label": "🏆 Победоносный",
        "desc": "Всего одержано побед", "source": "computed", "compute": "wins",
        # common × 1.0
        "tiers": [
            {"tier": 1, "target": 50,   "gold":  80, "diamonds":  0, "xp":  200},
            {"tier": 2, "target": 200,  "gold": 180, "diamonds":  1, "xp":  400},
            {"tier": 3, "target": 500,  "gold": 350, "diamonds":  3, "xp":  700},
            {"tier": 4, "target": 2000, "gold": 600, "diamonds":  5, "xp": 1100},
        ],
    },
    {
        "key": "ach_level", "label": "⭐ Восходящая звезда",
        "desc": "Достигнутый уровень", "source": "computed", "compute": "level",
        # rare × 1.3 — макс уровень в игре = 80, поэтому tier 5 = 80, не 100
        "tiers": [
            {"tier": 1, "target": 10, "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 25, "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 40, "gold":  455, "diamonds":  4, "xp":  910},
            {"tier": 4, "target": 60, "gold":  780, "diamonds":  7, "xp": 1430},
            {"tier": 5, "target": 80, "gold": 1300, "diamonds": 10, "xp": 2080},
        ],
    },
    {
        "key": "ach_tower", "label": "🏰 Башнеодолитель",
        "desc": "Лучший этаж Башни Титанов", "source": "computed", "compute": "tower_best",
        # rare × 1.3
        "tiers": [
            {"tier": 1, "target": 10, "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 25, "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 50, "gold":  455, "diamonds":  4, "xp":  910},
        ],
    },
    {
        "key": "ach_endless", "label": "🌊 Легенда Натиска",
        "desc": "Лучшая волна в Натиске", "source": "computed", "compute": "endless_best",
        # rare × 1.3
        "tiers": [
            {"tier": 1, "target": 5,  "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 10, "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 20, "gold":  455, "diamonds":  4, "xp":  910},
            {"tier": 4, "target": 50, "gold":  780, "diamonds":  7, "xp": 1430},
        ],
    },
    {
        "key": "ach_referrals", "label": "👥 Лидер племени",
        "desc": "Приглашено игроков по реферальной ссылке",
        "source": "computed", "compute": "referrals",
        # legendary × 2.0 (рефералы — VIP-механика)
        "tiers": [
            {"tier": 1, "target": 1,  "gold":  160, "diamonds":  0, "xp":  400},
            {"tier": 2, "target": 3,  "gold":  360, "diamonds":  2, "xp":  800},
            {"tier": 3, "target": 10, "gold":  700, "diamonds":  6, "xp": 1400},
        ],
    },
    # ── ОТСЛЕЖИВАЕМЫЕ ──────────────────────────────────────────────────
    {
        "key": "ach_buy_gold", "label": "🛒 Покупки за золото",
        "desc": "Покупок за золото в магазине", "source": "tracked",
        # common × 1.0
        "tiers": [
            {"tier": 1, "target": 10,   "gold":   80, "diamonds":  0, "xp":  200},
            {"tier": 2, "target": 25,   "gold":  180, "diamonds":  1, "xp":  400},
            {"tier": 3, "target": 50,   "gold":  350, "diamonds":  3, "xp":  700},
            {"tier": 4, "target": 100,  "gold":  600, "diamonds":  5, "xp": 1100},
            {"tier": 5, "target": 200,  "gold": 1000, "diamonds":  8, "xp": 1600},
            {"tier": 6, "target": 300,  "gold": 1500, "diamonds": 12, "xp": 2200},
            {"tier": 7, "target": 500,  "gold": 2000, "diamonds": 16, "xp": 3000},
            {"tier": 8, "target": 750,  "gold": 2700, "diamonds": 22, "xp": 4000},
            {"tier": 9, "target": 1000, "gold": 3500, "diamonds": 30, "xp": 5000},
        ],
    },
    {
        "key": "ach_buy_diamonds", "label": "💎 Покупки за алмазы",
        "desc": "Покупок за алмазы в магазине", "source": "tracked",
        # epic × 1.6
        "tiers": [
            {"tier": 1, "target": 5,   "gold":  128, "diamonds":  0, "xp":  320},
            {"tier": 2, "target": 13,  "gold":  288, "diamonds":  2, "xp":  640},
            {"tier": 3, "target": 25,  "gold":  560, "diamonds":  5, "xp": 1120},
            {"tier": 4, "target": 50,  "gold":  960, "diamonds":  8, "xp": 1760},
            {"tier": 5, "target": 100, "gold": 1600, "diamonds": 13, "xp": 2560},
            {"tier": 6, "target": 150, "gold": 2400, "diamonds": 19, "xp": 3520},
            {"tier": 7, "target": 250, "gold": 3200, "diamonds": 26, "xp": 4800},
            {"tier": 8, "target": 375, "gold": 4320, "diamonds": 35, "xp": 6400},
            {"tier": 9, "target": 500, "gold": 5600, "diamonds": 48, "xp": 8000},
        ],
    },
    {
        "key": "ach_buy_premium", "label": "👑 Покупки за USDT/Stars",
        "desc": "Покупок за USDT или Stars", "source": "tracked",
        # legendary × 2.0
        "tiers": [
            {"tier": 1, "target": 3,   "gold":  160, "diamonds":  0, "xp":  400},
            {"tier": 2, "target": 6,   "gold":  360, "diamonds":  2, "xp":  800},
            {"tier": 3, "target": 13,  "gold":  700, "diamonds":  6, "xp": 1400},
            {"tier": 4, "target": 25,  "gold": 1200, "diamonds": 10, "xp": 2200},
            {"tier": 5, "target": 50,  "gold": 2000, "diamonds": 16, "xp": 3200},
            {"tier": 6, "target": 75,  "gold": 3000, "diamonds": 24, "xp": 4400},
            {"tier": 7, "target": 125, "gold": 4000, "diamonds": 32, "xp": 6000},
            {"tier": 8, "target": 200, "gold": 5400, "diamonds": 44, "xp": 8000},
            {"tier": 9, "target": 250, "gold":12000, "diamonds":200, "xp":10000},
        ],
    },
    # ── КОЛЛЕКЦИЯ ОБРАЗОВ ───────────────────────────────────────────
    {
        "key": "ach_collect_avatar_gold", "label": "🛡️ Коллекция золотых образов",
        "desc": "Куплено образов за золото", "source": "tracked",
        # epic × 1.6
        "tiers": [
            {"tier": 1, "target": 1,  "gold":  128, "diamonds":  0, "xp":  320},
            {"tier": 2, "target": 5,  "gold":  288, "diamonds":  2, "xp":  640},
            {"tier": 3, "target": 10, "gold":  560, "diamonds":  5, "xp": 1120},
        ],
    },
    {
        "key": "ach_collect_avatar_dia", "label": "💎 Коллекция алмазных образов",
        "desc": "Куплено образов за алмазы", "source": "tracked",
        # epic × 1.6
        "tiers": [
            {"tier": 1, "target": 1,  "gold":  128, "diamonds":  0, "xp":  320},
            {"tier": 2, "target": 5,  "gold":  288, "diamonds":  2, "xp":  640},
            {"tier": 3, "target": 10, "gold":  560, "diamonds":  5, "xp": 1120},
        ],
    },
    {
        "key": "ach_collect_avatar_premium", "label": "🐉 Коллекция премиум образов",
        "desc": "Куплено образов за USDT/Stars", "source": "tracked",
        # epic × 1.6 (премиум-валюта, но коллекция = epic)
        "tiers": [
            {"tier": 1, "target": 1,  "gold":  128, "diamonds":  0, "xp":  320},
            {"tier": 2, "target": 5,  "gold":  288, "diamonds":  2, "xp":  640},
            {"tier": 3, "target": 10, "gold":  560, "diamonds":  5, "xp": 1120},
        ],
    },
    {
        "key": "ach_use_potions", "label": "🧪 Мастер эликсиров",
        "desc": "Использовано эликсиров", "source": "tracked",
        # rare × 1.3
        "tiers": [
            {"tier": 1, "target": 10,   "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 25,   "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 50,   "gold":  455, "diamonds":  4, "xp":  910},
            {"tier": 4, "target": 100,  "gold":  780, "diamonds":  7, "xp": 1430},
            {"tier": 5, "target": 200,  "gold": 1300, "diamonds": 10, "xp": 2080},
            {"tier": 6, "target": 300,  "gold": 1950, "diamonds": 16, "xp": 2860},
            {"tier": 7, "target": 500,  "gold": 2600, "diamonds": 21, "xp": 3900},
            {"tier": 8, "target": 750,  "gold": 3510, "diamonds": 29, "xp": 5200},
            {"tier": 9, "target": 1000, "gold": 4550, "diamonds": 39, "xp": 6500},
        ],
    },
    {
        "key": "ach_use_scrolls", "label": "📜 Мастер свитков",
        "desc": "Использовано свитков", "source": "tracked",
        # rare × 1.3
        "tiers": [
            {"tier": 1, "target": 10,   "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 25,   "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 50,   "gold":  455, "diamonds":  4, "xp":  910},
            {"tier": 4, "target": 100,  "gold":  780, "diamonds":  7, "xp": 1430},
            {"tier": 5, "target": 200,  "gold": 1300, "diamonds": 10, "xp": 2080},
            {"tier": 6, "target": 300,  "gold": 1950, "diamonds": 16, "xp": 2860},
            {"tier": 7, "target": 500,  "gold": 2600, "diamonds": 21, "xp": 3900},
            {"tier": 8, "target": 750,  "gold": 3510, "diamonds": 29, "xp": 5200},
            {"tier": 9, "target": 1000, "gold": 4550, "diamonds": 39, "xp": 6500},
        ],
    },
    {
        "key": "ach_use_hp_small", "label": "💊 Зелья здоровья",
        "desc": "Использовано малых зелий здоровья", "source": "tracked",
        # rare × 1.3
        "tiers": [
            {"tier": 1, "target": 25,  "gold":  104, "diamonds":  0, "xp":  260},
            {"tier": 2, "target": 50,  "gold":  234, "diamonds":  1, "xp":  520},
            {"tier": 3, "target": 100, "gold":  455, "diamonds":  4, "xp":  910},
            {"tier": 4, "target": 300, "gold":  780, "diamonds":  7, "xp": 1430},
            {"tier": 5, "target": 500, "gold": 1300, "diamonds": 10, "xp": 2080},
        ],
    },
    {
        "key": "ach_spend_gold", "label": "💰 Транжира золота",
        "desc": "Потрачено золота в магазине", "source": "tracked",
        # common × 1.0
        "tiers": [
            {"tier": 1, "target": 500,   "gold":   80, "diamonds":  0, "xp":  200},
            {"tier": 2, "target": 1000,  "gold":  180, "diamonds":  1, "xp":  400},
            {"tier": 3, "target": 1500,  "gold":  350, "diamonds":  3, "xp":  700},
            {"tier": 4, "target": 3000,  "gold":  600, "diamonds":  5, "xp": 1100},
            {"tier": 5, "target": 5000,  "gold": 1000, "diamonds":  8, "xp": 1600},
            {"tier": 6, "target": 15000, "gold": 1500, "diamonds": 12, "xp": 2200},
        ],
    },
    {
        "key": "ach_spend_diamonds", "label": "💎 Транжира алмазов",
        "desc": "Потрачено алмазов в магазине", "source": "tracked",
        # epic × 1.6
        "tiers": [
            {"tier": 1, "target": 50,   "gold":  128, "diamonds":  0, "xp":  320},
            {"tier": 2, "target": 100,  "gold":  288, "diamonds":  2, "xp":  640},
            {"tier": 3, "target": 300,  "gold":  560, "diamonds":  5, "xp": 1120},
            {"tier": 4, "target": 600,  "gold":  960, "diamonds":  8, "xp": 1760},
            {"tier": 5, "target": 1200, "gold": 1600, "diamonds": 13, "xp": 2560},
            {"tier": 6, "target": 2000, "gold": 2400, "diamonds": 19, "xp": 3520},
        ],
    },
]

# Достижения Мирового босса (отдельный модуль по Закону 9).
ACHIEVEMENT_DEFS.extend(WB_ACHIEVEMENT_DEFS)

# Быстрый поиск по ключу
ACHIEVEMENT_BY_KEY: dict[str, dict] = {a["key"]: a for a in ACHIEVEMENT_DEFS}
