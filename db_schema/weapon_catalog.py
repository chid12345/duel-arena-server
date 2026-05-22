"""16 видов оружия: 4 типа × 4 тира (free/gold/diamond/mythic).
Слот weapon. Бонус pen_pct — пробой брони противника.

Этап 6 аудита (2026_05_22): оружие приведено к общей системе «балл силы + тир»
(power_score/tier/recommended_level/currency) — как у остальных 5 слотов.
Раньше оружие было единственным БЕЗ tier → (1) карточка показывала формульную
цену, а списывалась старая номинальная; (2) серверная блокировка покупки по
уровню не срабатывала (`if item_tier`). Теперь цена считается формулой
(economy/level_pricing.get_item_cost) и совпадает с карточкой, а сервер
блокирует покупку до нужного уровня (T1=1, T2=20, T3=45, T4=65).
Мифик-оружие платится за Stars/USDT через weapon_payment_routes (price_stars=800,
не формула) — звёздная цена не изменилась.
power_score по тирам совпадает с остальными слотами: T1=27, T2=59, T3=3.0, T4=3.58.
"""
from __future__ import annotations

# ── МЕЧ ──────────────────────────────────────────────────────
WEAPON_CATALOG: dict[str, dict] = {
    "sword_free": {
        "slot":"weapon","rarity":"common","name":"Деревянный меч","emoji":"🗡️",
        "atk_bonus":5,"crit_bonus":1,"pen_pct":0.0,"price_gold":800,
        "tier":"T1","power_score":27,"recommended_level":1,"currency":"gold",
        "desc":"+5 атк, +1 крит",
    },
    "sword_gold": {
        "slot":"weapon","rarity":"rare","name":"Стальной меч","emoji":"⚔️",
        "atk_bonus":15,"crit_bonus":3,"pen_pct":0.01,"price_gold":8000,
        "tier":"T2","power_score":59,"recommended_level":20,"currency":"gold",
        "desc":"+15 атк, +3 крит, +1% пробой",
    },
    "sword_diamond": {
        "slot":"weapon","rarity":"epic","name":"Рунический клинок","emoji":"🌀",
        "atk_bonus":30,"crit_bonus":7,"pen_pct":0.02,"price_diamonds":75,
        "tier":"T3","power_score":3.0,"recommended_level":45,"currency":"diamond",
        "desc":"+30 атк, +7 крит, +2% пробой",
    },
    "sword_mythic": {
        "slot":"weapon","rarity":"mythic","name":"Пламенный клинок","emoji":"🔥",
        "atk_bonus":45,"crit_bonus":10,"pen_pct":0.03,"price_gold":0,"price_stars":800,
        "tier":"T4","power_score":3.58,"recommended_level":65,"currency":"star",
        "desc":"+45 атк, +10 крит, +3% пробой",
    },
    # ── ТОПОР ────────────────────────────────────────────────
    "axe_free": {
        "slot":"weapon","rarity":"common","name":"Каменный топор","emoji":"🪓",
        "atk_bonus":8,"crit_bonus":0,"pen_pct":0.0,"price_gold":800,
        "tier":"T1","power_score":27,"recommended_level":1,"currency":"gold",
        "desc":"+8 атк",
    },
    "axe_gold": {
        "slot":"weapon","rarity":"rare","name":"Топор ополченца","emoji":"🪓",
        "atk_bonus":22,"crit_bonus":0,"pen_pct":0.01,"price_gold":8000,
        "tier":"T2","power_score":59,"recommended_level":20,"currency":"gold",
        "desc":"+22 атк, +1% пробой",
    },
    "axe_diamond": {
        "slot":"weapon","rarity":"epic","name":"Секира","emoji":"🪓",
        "atk_bonus":40,"crit_bonus":0,"pen_pct":0.02,"price_diamonds":75,
        "tier":"T3","power_score":3.0,"recommended_level":45,"currency":"diamond",
        "desc":"+40 атк, +2% пробой",
    },
    "axe_mythic": {
        "slot":"weapon","rarity":"mythic","name":"Топор хаоса","emoji":"💀",
        "atk_bonus":58,"crit_bonus":0,"pen_pct":0.03,"price_gold":0,"price_stars":800,
        "tier":"T4","power_score":3.58,"recommended_level":65,"currency":"star",
        "desc":"+58 атк, +3% пробой",
    },
    # ── ДУБИНА ───────────────────────────────────────────────
    "club_free": {
        "slot":"weapon","rarity":"common","name":"Дубина","emoji":"🏏",
        "atk_bonus":3,"crit_bonus":0,"hp_bonus":50,"pen_pct":0.0,"price_gold":800,
        "tier":"T1","power_score":27,"recommended_level":1,"currency":"gold",
        "desc":"+3 атк, +50 HP",
    },
    "club_gold": {
        "slot":"weapon","rarity":"rare","name":"Усиленная дубина","emoji":"🏏",
        "atk_bonus":8,"crit_bonus":0,"hp_bonus":100,"pen_pct":0.01,"price_gold":8000,
        "tier":"T2","power_score":59,"recommended_level":20,"currency":"gold",
        "desc":"+8 атк, +100 HP, +1% пробой",
    },
    "club_diamond": {
        "slot":"weapon","rarity":"epic","name":"Булава","emoji":"🏏",
        "atk_bonus":18,"crit_bonus":0,"hp_bonus":150,"pen_pct":0.02,"price_diamonds":75,
        "tier":"T3","power_score":3.0,"recommended_level":45,"currency":"diamond",
        "desc":"+18 атк, +150 HP, +2% пробой",
    },
    "club_mythic": {
        "slot":"weapon","rarity":"mythic","name":"Молот колосса","emoji":"🔨",
        "atk_bonus":32,"crit_bonus":0,"hp_bonus":170,"pen_pct":0.03,"price_gold":0,"price_stars":800,
        "tier":"T4","power_score":3.58,"recommended_level":65,"currency":"star",
        "desc":"+32 атк, +170 HP, +3% пробой",
    },
    # ── БОЛЬШОЙ МЕЧ ──────────────────────────────────────────
    "gs_free": {
        "slot":"weapon","rarity":"common","name":"Двуручный меч","emoji":"🗡️",
        "atk_bonus":4,"crit_bonus":5,"pen_pct":0.0,"price_gold":800,
        "tier":"T1","power_score":27,"recommended_level":1,"currency":"gold",
        "desc":"+4 атк, +5 крит",
    },
    "gs_gold": {
        "slot":"weapon","rarity":"rare","name":"Меч паладина","emoji":"⚔️",
        "atk_bonus":10,"crit_bonus":15,"pen_pct":0.01,"price_gold":8000,
        "tier":"T2","power_score":59,"recommended_level":20,"currency":"gold",
        "desc":"+10 атк, +15 крит, +1% пробой",
    },
    "gs_diamond": {
        "slot":"weapon","rarity":"epic","name":"Клинок хаоса","emoji":"🌀",
        "atk_bonus":15,"crit_bonus":25,"pen_pct":0.02,"price_diamonds":75,
        "tier":"T3","power_score":3.0,"recommended_level":45,"currency":"diamond",
        "desc":"+15 атк, +25 крит, +2% пробой",
    },
    "gs_mythic": {
        "slot":"weapon","rarity":"mythic","name":"Тень смерти","emoji":"🌑",
        "atk_bonus":20,"crit_bonus":35,"pen_pct":0.03,"price_gold":0,"price_stars":800,
        "tier":"T4","power_score":3.58,"recommended_level":65,"currency":"star",
        "desc":"+20 атк, +35 крит, +3% пробой",
    },
}
