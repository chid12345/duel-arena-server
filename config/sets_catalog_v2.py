"""Каталог архетипных сетов (Этап 5 редизайна).

6 архетипов с порогами 2/4/6. Игра имеет 6 слотов экипировки
(голова, тело, оружие, щит, ноги, кольцо — ring2 legacy скрыт).
Полный комплект одного архетипа = 6 предметов.

Каждый предмет в db_schema/equipment_items/ получает поле set_id
со значением из SETS_V2 (этап 5B).

При надевании K предметов одного set_id:
- K<2 — нет бонуса
- 2≤K<4 — бонус 2 (лёгкий)
- 4≤K<6 — бонус 4 (средний)
- K=6 — бонус 6 + перк (полный комплект)

Несколько сетов могут быть активны одновременно (например 2 хищника +
2 бастиона + 2 берсерка = 3 активных лёгких бонуса). Перк (6) только при
полном составе одного сета.
"""
from __future__ import annotations

SETS_V2: dict[str, dict] = {
    "predator": {
        "name": "Хищник",
        "emoji": "🐍",
        "desc": "Крит и шанс двойного удара",
        "thresholds": {
            2: {"crit_bonus": 4},
            4: {"crit_bonus": 10, "atk_pct": 3},
            6: {"crit_bonus": 18, "atk_pct": 8, "double_pct": 5,
                "perk_id": "frenzy_on_crit",
                "perk_desc": "После крита +20% урона на следующий ход"},
        },
    },
    "bastion": {
        "name": "Бастион",
        "emoji": "🛡",
        "desc": "HP и защита от урона",
        "thresholds": {
            2: {"hp_pct": 3},
            4: {"hp_pct": 8, "def_pct": 0.04},
            6: {"hp_pct": 15, "def_pct": 0.10,
                "perk_id": "second_wind",
                "perk_desc": "Раз в бой: при HP<30% мгновенно +30% HP"},
        },
    },
    "berserk": {
        "name": "Берсерк",
        "emoji": "⚔",
        "desc": "Чистый урон без защиты",
        "thresholds": {
            2: {"atk_pct": 3},
            4: {"atk_pct": 8},
            6: {"atk_pct": 20,
                "perk_id": "blood_rage",
                "perk_desc": "При HP<50% урон +30% на оставшийся бой"},
        },
    },
    "ghost": {
        "name": "Призрак",
        "emoji": "👻",
        "desc": "Уворот и точность",
        "thresholds": {
            2: {"dodge_bonus": 3},
            4: {"dodge_bonus": 8, "accuracy": 8},
            6: {"dodge_bonus": 15, "accuracy": 20,
                "perk_id": "phantom_strike",
                "perk_desc": "30% шанс уйти в уворот после удара врага"},
        },
    },
    "mage": {
        "name": "Маг",
        "emoji": "🔮",
        "desc": "Пробой брони и сила удара",
        "thresholds": {
            2: {"pen_pct": 0.03},
            4: {"pen_pct": 0.06, "atk_pct": 3},
            6: {"pen_pct": 0.12, "atk_pct": 10,
                "perk_id": "arcane_burst",
                "perk_desc": "Каждый 4-й удар игнорирует броню"},
        },
    },
    "regent": {
        "name": "Регент",
        "emoji": "👑",
        "desc": "Сбалансированный универсал",
        "thresholds": {
            2: {"hp_pct": 2, "atk_pct": 2, "def_pct": 0.02},
            4: {"hp_pct": 4, "atk_pct": 4, "def_pct": 0.04, "crit_bonus": 4},
            6: {"hp_pct": 8, "atk_pct": 8, "def_pct": 0.08, "crit_bonus": 8,
                "perk_id": "kings_will",
                "perk_desc": "Раз в бой: +20% HP при любом HP"},
        },
    },
}

SET_IDS = tuple(SETS_V2.keys())  # ("predator", "bastion", "berserk", "ghost", "mage", "regent")
