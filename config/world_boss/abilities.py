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
        "passive": {"name": "Армия мёртвых", "desc": "За каждого погибшего в рейде босс бьёт всё больнее (до +30%). Чем больше потерь — тем он злее. Берегите слабых.", "stage": 3, "live": True},
        "t75": {"name": "Эпидемия", "desc": "С 75% HP ответка бьёт сразу ДВЕ цели за раз — урон расходится по рейду, танкам тяжелее.", "stage": 2, "live": True},
        "t50": {"name": "Костяной доспех", "desc": "С 50% HP уходит в глухую защиту — твой урон по нему заметно падает. Бей в окна уязвимости ×3.", "stage": 2, "live": True},
        "t25": {"name": "Жатва", "desc": "Ниже 25% HP каждая смерть игрока ЛЕЧИТ босса (+3% HP). Не дайте добивать друг друга, спасайте низких по HP.", "stage": 3, "live": True},
    },
    "shadow": {
        "passive": {"name": "Покров теней", "desc": "Периодически уходит в тень (4 сек каждые 20 сек) — пока в тени твой урон по нему ÷2. Лови промежутки.", "stage": 3, "live": True},
        "t75": {"name": "Слепая зона", "desc": "С 75% HP в основном бьёт лидера по урону (топ-1). Лидеру держать защиту или притормозить.", "stage": 2, "live": True},
        "t50": {"name": "Танец теней", "desc": "С 50% HP свирепеет: бьёт и сильнее, и ЧАЩЕ (раз в 4 сек вместо 6). Держи HP повыше.", "stage": 2, "live": True},
        "t25": {"name": "Затмение", "desc": "Ниже 25% HP уходит в тень чаще (каждые 14 сек) — урон по нему чаще ÷2.", "stage": 3, "live": True},
    },
    "fire": {
        "passive": {"name": "Опаляющая аура", "desc": "Каждый его удар по тебе делает следующий по тебе больнее (копится ожог). Не дай долбить одного — распределяйте агро.", "stage": 3, "live": False},
        "t75": {"name": "Тепловая волна", "desc": "С 75% HP коронный удар сильнее — снимает −5% HP всем (вместо −3%).", "stage": 2, "live": True},
        "t50": {"name": "Плавится ядро", "desc": "С 50% HP бьёт заметно сильнее (сила ×1.3). Лечись и держи защиту.", "stage": 2, "live": True},
        "t25": {"name": "Сверхновая", "desc": "Ниже 25% каждые пару секунд жжёт всех по площади. Добивайте быстро.", "stage": 3, "live": True},
    },
    "poison": {
        "passive": {"name": "Каменная кожа", "desc": "Обычный урон по нему гасится бронёй (÷1.3), НО криты проходят полностью. Качай крит против него.", "stage": 3, "live": True},
        "t75": {"name": "Трещины", "desc": "С 75% HP броня трескается — гасит меньше (÷1.15), твой урон проходит легче.", "stage": 3, "live": True},
        "t50": {"name": "Землетрясение", "desc": "С 50% HP коронный удар двойной — снимает −10% HP всем сразу. Береги HP к этому моменту.", "stage": 2, "live": True},
        "t25": {"name": "Раскол", "desc": "Ниже 25% броня рушится (полный урон), но свирепеет (ответка ×1.6). Гонка: добей раньше, чем смоет рейд.", "stage": 3, "live": True},
    },
    "spider": {
        "passive": {"name": "Паутина", "desc": "Периодически опутывает лидера — его удары замедляются, остальные догоняют.", "stage": 3, "live": False},
        "t75": {"name": "Сеть ловушек", "desc": "С 75% HP окна уязвимости короче, но чаще — нужна точность.", "stage": 3, "live": False},
        "t50": {"name": "Бешеная прыть", "desc": "С 50% HP резко уходит в ловкость (×1.4) — урон по нему резко падает. Вынеси максимум ДО этого, потом лови окна ×3.", "stage": 2, "live": True},
        "t25": {"name": "Полчище", "desc": "Ниже 25% рой кусает случайных игроков по площади.", "stage": 3, "live": False},
    },
    "lava": {
        "passive": {"name": "Толчки", "desc": "Земля трясётся по таймеру — фоновый урон по всем, не зависит от твоих действий. Держи запас HP.", "stage": 3, "live": True},
        "t75": {"name": "Извержение", "desc": "С 75% HP толчки чаще и сильнее.", "stage": 3, "live": True},
        "t50": {"name": "Магматическое ядро", "desc": "С 50% HP бьёт ещё сильнее (сила ×1.4) — самые тяжёлые удары в игре. Максимум защиты и лечения.", "stage": 2, "live": True},
        "t25": {"name": "Каскад", "desc": "Ниже 25% извержения почти без остановки — жёсткий тест на выживание.", "stage": 3, "live": True},
    },
    "demon": {
        "passive": {"name": "Кровавый пир", "desc": "Лечится от урона, который наносит ИГРОКАМ. Хорошая защита/уворот = он меньше лечится. Защита и спасает, и морит его голодом.", "stage": 3, "live": True},
        "t75": {"name": "Жажда крови", "desc": "С 75% HP любая смерть игрока лечит босса (+2% HP за каждую). Не корми его смертями.", "stage": 3, "live": True},
        "t50": {"name": "Кровавая ярость", "desc": "С 50% HP свирепеет (сила ×1.2) и усиливает вампиризм. Нужно переуронить его лечение.", "stage": 2, "live": True},
        "t25": {"name": "Кровопускание", "desc": "Ниже 25% кровит уже ОН — твои удары вешают кровотечение. Бурстом докрути.", "stage": 3, "live": False},
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


def wb_str_death_mult(boss_type: str, dead_count: int) -> float:
    """Лич «Армия мёртвых»: +3% к силе ответки за каждую смерть, максимум +30%.
    Прочие типы — 1.0 (без изменений)."""
    if boss_type == "lich" and dead_count > 0:
        return round(1.0 + 0.03 * min(int(dead_count), 10), 3)
    return 1.0


def wb_lifesteal_pct(boss_type: str, hp_pct: float) -> float:
    """Доля урона по игроку, которой лечится босс (вампиризм Демона).
    «Кровавый пир» (пассив) — 30%; на ≤50% HP «Кровавая ярость» — 50%.
    Прочие типы — 0."""
    if boss_type == "demon":
        return 0.50 if hp_pct <= 0.50 else 0.30
    return 0.0


def wb_death_heal_pct(boss_type: str, hp_pct: float) -> float:
    """Доля max_hp, на которую лечится босс ЗА КАЖДУЮ смерть игрока.
    Лич «Жатва» (≤25% HP) — 3%; Демон «Жажда крови» (≤75% HP) — 2%. Иначе 0."""
    if boss_type == "lich" and hp_pct <= 0.25:
        return 0.03
    if boss_type == "demon" and hp_pct <= 0.75:
        return 0.02
    return 0.0


def wb_counter_str_mult(boss_type: str, hp_pct: float, dead_count: int) -> float:
    """Множитель силы ОТВЕТКИ по типу:
    Лич «Армия мёртвых» (+3%/смерть, кап +30%);
    Голем «Раскол» (×1.5 на ≤25% HP — броня пала, но свирепеет)."""
    if boss_type == "lich":
        return wb_str_death_mult("lich", dead_count)
    if boss_type == "poison" and hp_pct <= 0.25:
        return 1.6
    return 1.0


def _shadow_phased(hp_pct: float, elapsed: float) -> bool:
    """Тень «Покров теней»: фаза неуязвимости 4 сек каждые 20 сек
    (каждые 14 сек на ≤25% HP — «Затмение», чаще)."""
    cycle = 14 if hp_pct <= 0.25 else 20
    e = int(elapsed)
    return e > 0 and (e % cycle) < 4


def wb_player_dmg_mult(boss_type: str, hp_pct: float, is_crit: bool,
                       elapsed: float = 0.0) -> float:
    """Множитель к урону ИГРОКА по боссу (броня Голема, фазы Тени).
    Голем «Каменная кожа»: обычный урон ÷1.3, КРИТЫ проходят сквозь;
    «Трещины» (≤75%) ÷1.15; «Раскол» (≤25%) — броня пала, ÷1.0.
    Тень «Покров теней»: пока в фазе — урон по нему ÷2."""
    m = 1.0
    if boss_type == "poison":
        if not is_crit:
            if hp_pct <= 0.25:
                armor = 1.0
            elif hp_pct <= 0.75:
                armor = 1.15
            else:
                armor = 1.3
            m /= armor
    elif boss_type == "shadow" and _shadow_phased(hp_pct, elapsed):
        m *= 0.5
    return round(m, 3)


def wb_periodic_aoe(boss_type: str, hp_pct: float, elapsed: float) -> float:
    """AoE по всем живым по ТАЙМЕРУ (доля max_hp в ЭТУ секунду, 0 если не тик).
    Лава: «Толчки» (фон), «Извержение» (≤75% чаще/сильнее), «Каскад» (≤25%).
    Огонь: «Сверхновая» (≤25% частый урон).
    Числа балансные — крутятся тут. Значения подобраны escalating по HP.

    ВАЖНО: вызывать ТОЛЬКО из battle_tick JOB (бежит раз/сек), НЕ из WS
    _run_battle_tick — иначе один тик-секунда даст двойной AoE."""
    e = int(elapsed)
    if e <= 0:
        return 0.0
    if boss_type == "lava":
        if hp_pct <= 0.25:
            return 0.025 if e % 9 == 0 else 0.0   # Каскад
        if hp_pct <= 0.75:
            return 0.02 if e % 18 == 0 else 0.0    # Извержение
        return 0.015 if e % 30 == 0 else 0.0       # Толчки (пассив)
    if boss_type == "fire" and hp_pct <= 0.25:
        return 0.015 if e % 4 == 0 else 0.0        # Сверхновая
    return 0.0


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


def wb_card_features(boss_type: str) -> list:
    """ВСЕ 4 фишки босса для карточки/Справки: [{hp, name, desc, live}],
    от пассивки к 25%. hp=None — пассивка («Всегда»).
    Показываем полный набор, чтобы игрок понимал, чего ждать; враньё исключает
    флаг live=False (UI рисует бейдж «скоро» — фишка ещё не работает, Закон 12)."""
    out = []
    abilities = WB_ABILITIES.get(boss_type or "", {})
    for key in ("passive", "t75", "t50", "t25"):
        meta = abilities.get(key)
        if meta:
            out.append({"hp": _KEY_HP[key], "name": meta["name"],
                        "desc": meta["desc"], "live": bool(meta.get("live"))})
    return out
