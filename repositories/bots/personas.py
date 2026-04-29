"""Персоны ботов: 4 статуса (новичок/фармила/мажор/донатер).

Бот не «зеркало уровня игрока», а уникальный противник с виртуальной
экипировкой, разбросом статов и AI-стилем. Генерируется в памяти при
создании бота — БД не меняется (поля _eq_*/_persona живут в dict).
"""

from __future__ import annotations

import random
from typing import Dict, Tuple


# Шансы выбора статуса по уровню игрока. На низких уровнях у НПС-«игроков»
# не должно быть мифик-сетов — это противоречит логике мира. Распределение
# подбирается так, чтобы бой был интересным, но голый Lv10 не встречал донатеров.
def persona_weights_for_level(level: int) -> tuple[tuple[str, float], ...]:
    lv = max(1, int(level))
    if lv < 10:
        return (("novice", 1.00),)
    if lv < 20:
        return (("novice", 0.70), ("farmer", 0.28), ("major", 0.02))
    if lv < 35:
        return (("novice", 0.50), ("farmer", 0.40), ("major", 0.09), ("donator", 0.01))
    if lv < 60:
        return (("novice", 0.40), ("farmer", 0.40), ("major", 0.17), ("donator", 0.03))
    return (("novice", 0.35), ("farmer", 0.35), ("major", 0.25), ("donator", 0.05))


# Старый плоский набор — оставлен для обратной совместимости (preview-страница).
PERSONA_WEIGHTS = (
    ("novice",  0.40),
    ("farmer",  0.35),
    ("major",   0.20),
    ("donator", 0.05),
)

PERSONA_LABEL = {
    "novice":  "Новичок",
    "farmer":  "Фармила",
    "major":   "Мажор",
    "donator": "Босс-донатер",
}

PERSONA_EMOJI = {
    "novice":  "🌱",
    "farmer":  "⚔️",
    "major":   "💎",
    "donator": "👑",
}


def pick_persona(rng: random.Random | None = None,
                 level: int | None = None) -> str:
    """Выбрать статус по шансам. Если level задан — по уровневой таблице,
    иначе — по плоской (для preview/легаси).
    """
    r = rng or random
    weights = persona_weights_for_level(level) if level is not None else PERSONA_WEIGHTS
    roll = r.random()
    acc = 0.0
    for name, w in weights:
        acc += w
        if roll <= acc:
            return name
    return weights[-1][0]


def stat_jitter(rng: random.Random | None = None, span: float = 0.15) -> float:
    """Множитель ±span (по умолчанию ±15%) — индивидуальность статов."""
    r = rng or random
    return 1.0 + r.uniform(-span, span)


def _gear_for_persona(persona: str, level: int, rng: random.Random) -> Dict:
    """Виртуальный сет. Скейл подобран так, чтобы:
    - голый игрок vs novice ~ 60% шанс победы (легко);
    - голый игрок vs farmer ~ 40-45% (вызов);
    - голый vs major ~ 25-30% (надо стараться);
    - голый vs donator ~ 12-18% (элита, редко).

    Шмот линейно скейлится с уровнем — Lv10 «мажор» имеет ~25% от полного эпика,
    Lv50 «мажор» — ~75%, Lv100+ — полный эпик.
    """
    lv = max(1, int(level))
    # На Lv10 scale=0.25, Lv50 → 0.75, Lv100 → 1.0
    scale = max(0.20, min(1.0, lv / 100.0 + 0.15))

    if persona == "novice":
        return {
            "_eq_atk_bonus":   int(round(rng.choice([0, 0, 4, 8]) * scale)),
            "_eq_def_pct":     0.0,
            "_eq_dodge_bonus": rng.choice([0, 0, 3]),
        }
    if persona == "farmer":
        return {
            "_eq_atk_bonus":     int(round(rng.randint(15, 30) * scale)),
            "_eq_def_pct":       round(rng.uniform(0.04, 0.09) * scale, 2),
            "_eq_dodge_bonus":   int(round(rng.randint(3, 7) * scale)),
            "_eq_accuracy":      int(round(rng.choice([0, 0, 5]) * scale)),
        }
    if persona == "major":
        return {
            "_eq_atk_bonus":     int(round(rng.randint(35, 55) * scale)),
            "_eq_def_pct":       round(rng.uniform(0.08, 0.14) * scale, 2),
            "_eq_dodge_bonus":   int(round(rng.randint(6, 11) * scale)),
            "_eq_accuracy":      int(round(rng.randint(4, 9) * scale)),
            "_eq_lifesteal_pct": int(round(rng.choice([0, 0, 5]) * scale)),
            "_eq_pen_pct":       round(rng.uniform(0.0, 0.02) * scale, 2),
        }
    # donator
    return {
        "_eq_atk_bonus":       int(round(rng.randint(55, 75) * scale)),
        "_eq_def_pct":         round(rng.uniform(0.14, 0.20) * scale, 2),
        "_eq_dodge_bonus":     int(round(rng.randint(10, 14) * scale)),
        "_eq_accuracy":        int(round(rng.randint(8, 14) * scale)),
        "_eq_lifesteal_pct":   int(round(rng.randint(4, 8) * scale)),
        "_eq_pen_pct":         round(rng.uniform(0.02, 0.04) * scale, 2),
        "_eq_crit_resist_pct": int(round(rng.randint(5, 10) * scale)),
    }


def _ai_pattern_for_persona(persona: str, rng: random.Random) -> str:
    """Новички — рандом; мажоры/донатеры — стратеги; фармилы — посередине."""
    if persona == "novice":
        return "balanced"  # «Рандом»: равномерные веса
    if persona == "farmer":
        return rng.choice(("aggressive", "defensive", "balanced"))
    # major/donator → чаще стратеги (читают игрока через AI-память)
    return rng.choice(("aggressive", "defensive", "strategist", "strategist"))


def apply_persona_to_bot(bot: Dict, level: int,
                         rng: random.Random | None = None) -> Dict:
    """Применить статус, разброс статов и виртуальный сет к словарю бота.

    Возвращает изменённый dict (мутирует переданный bot).
    """
    r = rng or random
    persona = pick_persona(r, level=level)
    bot["persona"] = persona

    # Индивидуальный «характер» — лёгкий ±5% поверх базовых статов (в _compute_bot_stats_for_level
    # уже есть ±15% в распределении очков; этот слой имитирует «настроение конкретного боя»).
    for key in ("strength", "endurance", "crit"):
        if key in bot and bot[key] is not None:
            bot[key] = max(1, int(round(int(bot[key]) * stat_jitter(r, 0.05))))
    if "max_hp" in bot:
        bot["max_hp"] = max(30, int(round(int(bot["max_hp"]) * stat_jitter(r, 0.05))))
        bot["current_hp"] = bot["max_hp"]

    # Виртуальная экипировка — даёт _eq_* поля как у одетого игрока.
    bot.update(_gear_for_persona(persona, level, r))

    # AI-стиль из персоны (перекрывает старый случайный выбор)
    bot["ai_pattern"] = _ai_pattern_for_persona(persona, r)

    # Имя с эмодзи статуса (видимо игроку без раскрытия слова «бот»)
    base_name = bot.get("name", "Bot")
    if "(" not in base_name:
        bot["display_name"] = f"{PERSONA_EMOJI[persona]} {base_name}"
    return bot


def persona_summary(bot: Dict) -> Tuple[str, str]:
    """Для UI/логов: (label, emoji). Если persona не выставлена — generic."""
    p = bot.get("persona") or "novice"
    return PERSONA_LABEL.get(p, "?"), PERSONA_EMOJI.get(p, "•")
