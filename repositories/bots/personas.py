"""Персоны ботов: 4 статуса (новичок/фармила/мажор/донатер).

Бот не «зеркало уровня игрока», а уникальный противник с виртуальной
экипировкой, разбросом статов и AI-стилем. Генерируется в памяти при
создании бота — БД не меняется (поля _eq_*/_persona живут в dict).
"""

from __future__ import annotations

import random
from typing import Dict, Tuple

from repositories.bots.persona_gear import pick_gear_for_persona


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


# Прежний синтетический gear-генератор удалён — теперь подбираются реальные
# item_id из equipment_catalog по слотам через persona_gear.pick_gear_for_persona.


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

    # Виртуальная экипировка по слотам: реальные item_id из каталога.
    items, stats = pick_gear_for_persona(persona, level, r)
    bot["equipment_items"] = items  # {slot: item_id} — для UI карточки соперника
    # Чистые _eq_* — для боевой формулы; _extra (hp/str/...) — на статы выше
    extra = stats.pop("_extra", {})
    bot.update(stats)
    if extra.get("hp_bonus"):
        bot["max_hp"] = int(bot.get("max_hp", 100)) + extra["hp_bonus"]
        bot["current_hp"] = bot["max_hp"]
    if extra.get("str_bonus"):
        bot["strength"] = max(1, int(bot.get("strength", 1)) + extra["str_bonus"])
    if extra.get("agi_bonus"):
        bot["endurance"] = max(1, int(bot.get("endurance", 1)) + extra["agi_bonus"])
    if extra.get("intu_bonus") or extra.get("crit_bonus"):
        bot["crit"] = max(0, int(bot.get("crit", 0))
                            + extra.get("intu_bonus", 0) + extra.get("crit_bonus", 0))

    # AI-стиль из персоны (перекрывает старый случайный выбор)
    bot["ai_pattern"] = _ai_pattern_for_persona(persona, r)

    # Display-имя для UI: «Кровавый Тор» из технического «Жестокий_Тор_a1b2c3d4».
    # Эмодзи статуса добавляется отдельно фронтом через persona-поле.
    raw = bot.get("name", "Bot")
    parts = raw.split("_")
    if len(parts) >= 2:
        bot["display_name"] = f"{parts[0]} {parts[1]}"
    else:
        bot["display_name"] = raw
    return bot


def persona_summary(bot: Dict) -> Tuple[str, str]:
    """Для UI/логов: (label, emoji). Если persona не выставлена — generic."""
    p = bot.get("persona") or "novice"
    return PERSONA_LABEL.get(p, "?"), PERSONA_EMOJI.get(p, "•")
