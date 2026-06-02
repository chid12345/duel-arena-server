"""Способности 7 боссов — единый источник правды (Закон 2/9).

Каждый босс = 1 пассивка + 3 порога HP (75% / 50% / 25%). Здесь ДАННЫЕ
(имена, описания, числа) + чистые резолверы, которыми пользуется боевой
тик. Реализация эффектов идёт заходами (см. docs/WORLD_BOSS.md):
  Заход 2 — своя ярость на 50% + свои числа корон (тут уже подключено),
            тосты сверху, дрожь босса.
  Заход 3 — фишки со «складом» (ожоги / паутина / вампиризм / кровотечение).

Поле `stage` у каждой способности — в каком заходе она реально включается.
Имя/описание уже сейчас источник правды для UI-тостов (Заход 2).
"""
from __future__ import annotations

from typing import Any, Dict

# Биты порогов = crown_flags из world_boss_constants.WB_CROWN_THRESHOLDS.
BIT_75 = 0b001
BIT_50 = 0b010
BIT_25 = 0b100

# ── Своя «ярость» на 50% HP: множители stat_profile по str/agi/int ──
# Неизвестный/universal тип → ×1.2 по всем (старое поведение, back-compat).
ENRAGE_50_DEFAULT: Dict[str, float] = {"str": 1.2, "agi": 1.2, "int": 1.2}
ENRAGE_50: Dict[str, Dict[str, float]] = {
    "lich":   {"str": 1.00, "agi": 1.25, "int": 1.00},  # костяной доспех — труднее бить
    "shadow": {"str": 1.15, "agi": 1.10, "int": 1.00},  # танец теней
    "fire":   {"str": 1.30, "agi": 1.00, "int": 1.00},  # плавится ядро
    "poison": {"str": 1.00, "agi": 1.00, "int": 1.00},  # землетрясение — без статов (см. CROWN_PCT)
    "spider": {"str": 1.00, "agi": 1.40, "int": 1.00},  # бешеная прыть
    "lava":   {"str": 1.40, "agi": 1.00, "int": 1.00},  # магматическое ядро
    "demon":  {"str": 1.20, "agi": 1.00, "int": 1.00},  # кровавая ярость
}

# ── Свои числа коронных ударов (доля max_hp). Чего нет — берётся дефолт ──
# Дефолты совпадают с WB_CROWN_THRESHOLDS: 75%→0.03, 50%→0.05, 25%→0.08.
CROWN_PCT: Dict[str, Dict[int, float]] = {
    "fire":   {BIT_75: 0.05},  # тепловая волна — сильнее обычного на 75%
    "poison": {BIT_50: 0.10},  # землетрясение — двойной AoE на 50%
}

# ── Реестр способностей (имя/описание/заход/live). Источник правды дизайна ──
# stage: 2 = «бесплатные» (числа/таргет/таймеры), 3 = со «складом» в БД.
# live: True — фишка уже включена в коде (показываем в карточке/Справке).
#       False — задизайнена, но ещё не работает (НЕ показываем — Закон 12).
# desc у live-фишек описывает РОВНО то, что реально происходит сейчас.
WB_ABILITIES: Dict[str, Dict[str, Dict[str, Any]]] = {
    "lich": {
        "passive": {"name": "Армия мёртвых", "desc": "Каждая смерть в рейде усиливает босса", "stage": 3, "live": False},
        "t75": {"name": "Эпидемия", "desc": "Ответка бьёт сразу 2 цели", "stage": 2, "live": True},
        "t50": {"name": "Костяной доспех", "desc": "Уходит в защиту — твой урон по нему падает", "stage": 2, "live": True},
        "t25": {"name": "Жатва", "desc": "Смерти игроков лечат босса", "stage": 3, "live": False},
    },
    "shadow": {
        "passive": {"name": "Покров теней", "desc": "Прячется в тень, затем открывает окно", "stage": 3, "live": False},
        "t75": {"name": "Слепая зона", "desc": "Чаще бьёт лидера по урону", "stage": 2, "live": True},
        "t50": {"name": "Танец теней", "desc": "Свирепеет: бьёт сильнее и чаще", "stage": 2, "live": True},
        "t25": {"name": "Затмение", "desc": "Фазы тени и окна — чаще", "stage": 3, "live": False},
    },
    "fire": {
        "passive": {"name": "Опаляющая аура", "desc": "Каждый удар по тебе делает следующий больнее", "stage": 3, "live": False},
        "t75": {"name": "Тепловая волна", "desc": "Усиленный коронный удар (−5% HP всем)", "stage": 2, "live": True},
        "t50": {"name": "Плавится ядро", "desc": "Бьёт заметно сильнее", "stage": 2, "live": True},
        "t25": {"name": "Сверхновая", "desc": "Периодический урон по всем в финале", "stage": 3, "live": False},
    },
    "poison": {
        "passive": {"name": "Каменная кожа", "desc": "Гасит часть урона, но криты проходят", "stage": 3, "live": False},
        "t75": {"name": "Трещины", "desc": "Окна уязвимости размягчают броню", "stage": 3, "live": False},
        "t50": {"name": "Землетрясение", "desc": "Двойной коронный удар по всем (−10% HP)", "stage": 2, "live": True},
        "t25": {"name": "Раскол", "desc": "Броня рушится, но босс свирепеет", "stage": 3, "live": False},
    },
    "spider": {
        "passive": {"name": "Паутина", "desc": "Опутывает лидера — его удары замедляются", "stage": 3, "live": False},
        "t75": {"name": "Сеть ловушек", "desc": "Окна короче, но чаще", "stage": 3, "live": False},
        "t50": {"name": "Бешеная прыть", "desc": "Резко уходит в ловкость — урон по нему резко падает", "stage": 2, "live": True},
        "t25": {"name": "Полчище", "desc": "Рой кусает случайных в финале", "stage": 3, "live": False},
    },
    "lava": {
        "passive": {"name": "Толчки", "desc": "Земля трясётся — фоновый урон по всем", "stage": 3, "live": False},
        "t75": {"name": "Извержение", "desc": "Толчки чаще и сильнее", "stage": 3, "live": False},
        "t50": {"name": "Магматическое ядро", "desc": "Самые тяжёлые удары в игре", "stage": 2, "live": True},
        "t25": {"name": "Каскад", "desc": "Извержения без остановки в финале", "stage": 3, "live": False},
    },
    "demon": {
        "passive": {"name": "Кровавый пир", "desc": "Лечится от урона, что наносит игрокам", "stage": 3, "live": False},
        "t75": {"name": "Жажда крови", "desc": "Смерти игроков лечат и ускоряют босса", "stage": 3, "live": False},
        "t50": {"name": "Кровавая ярость", "desc": "Свирепеет — бьёт сильнее", "stage": 2, "live": True},
        "t25": {"name": "Кровопускание", "desc": "Теперь кровит он — удары вешают кровотечение", "stage": 3, "live": False},
    },
}

_BIT_TO_KEY = {BIT_75: "t75", BIT_50: "t50", BIT_25: "t25"}
# Порог HP для UI-подписи «когда срабатывает». None = пассивка (всегда).
_KEY_HP = {"passive": None, "t75": 75, "t50": 50, "t25": 25}


def wb_enrage_profile(boss_type: str, base_profile: Dict[str, Any]) -> Dict[str, Any]:
    """Своя ярость на 50%: возвращает новый stat_profile.
    Множит str/agi/int на множители типа (неизвестный тип → ×1.2 по всем).
    Прочие ключи профиля сохраняются без изменений."""
    base = dict(base_profile or {})
    mults = ENRAGE_50.get(boss_type or "", ENRAGE_50_DEFAULT)
    out = dict(base)
    for k in ("str", "agi", "int"):
        out[k] = round(float(base.get(k, 1.0)) * float(mults.get(k, 1.0)), 3)
    return out


def wb_crown_dmg_pct(boss_type: str, flag_bit: int, default: float) -> float:
    """Доля max_hp для коронного удара. Если у типа нет своего числа — дефолт."""
    return float(CROWN_PCT.get(boss_type or "", {}).get(int(flag_bit), default))


def wb_counter_plan(boss_type: str, hp_pct: float) -> Dict[str, Any]:
    """План ответки по типу и текущему HP-проценту босса:
    {'targets': int, 'mode': 'mixed'|'top1'}.
    Заход 2b: Лич ≤75% — «Эпидемия» (2 цели), Тень ≤75% — «Слепая зона» (лидер)."""
    targets, mode = 1, "mixed"
    if boss_type == "lich" and hp_pct <= 0.75:
        targets = 2
    elif boss_type == "shadow" and hp_pct <= 0.75:
        mode = "top1"
    return {"targets": targets, "mode": mode}


def wb_counter_cooldown(boss_type: str, hp_pct: float, default: int) -> int:
    """Кулдаун ответки (сек). Тень ≤50% — «Танец теней» (бьёт чаще)."""
    if boss_type == "shadow" and hp_pct <= 0.50:
        return 4
    return int(default)


def wb_ability_meta(boss_type: str, bit_or_key) -> Dict[str, Any]:
    """Имя/описание способности по биту порога (BIT_*) или ключу
    ('passive'/'t75'/'t50'/'t25'). Неизвестное → пустой dict."""
    key = _BIT_TO_KEY.get(bit_or_key, bit_or_key)
    return WB_ABILITIES.get(boss_type or "", {}).get(key, {})


def wb_crown_labels(boss_type: str) -> Dict[int, Any]:
    """Подписи коронных порогов для UI-тостов: {bit: name|None}.
    None — фишка ещё не live, UI покажет общий «Коронный удар» (Закон 12).
    Ключи-int станут строками в JSON ('1'/'2'/'4') — JS обращается одинаково."""
    abilities = WB_ABILITIES.get(boss_type or "", {})
    out: Dict[int, Any] = {}
    for bit, key in ((BIT_75, "t75"), (BIT_50, "t50"), (BIT_25, "t25")):
        meta = abilities.get(key)
        out[bit] = meta["name"] if (meta and meta.get("live")) else None
    return out


def wb_live_features(boss_type: str) -> list:
    """Включённые (live) фишки босса — для карточки и Справки.
    [{hp: 75|50|25|None, name, desc}], от пассивки к 25%. None = пассивка.
    Показываем ТОЛЬКО то, что реально работает (Закон 12 — без вранья)."""
    out = []
    abilities = WB_ABILITIES.get(boss_type or "", {})
    for key in ("passive", "t75", "t50", "t25"):
        meta = abilities.get(key)
        if meta and meta.get("live"):
            out.append({"hp": _KEY_HP[key], "name": meta["name"], "desc": meta["desc"]})
    return out
