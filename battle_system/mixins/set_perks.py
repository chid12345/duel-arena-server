"""Бонусы и перки за полный комплект (set bonus).

_apply_set_bonus     — применяет hp_pct/def/atk/accuracy и помечает _set_perk_id

Этап 5C: переход на архетипные сеты v2 (6 архетипов × порог 6). Старые
рарити-перки (decisive_strike, cold_blood, gods_wrath) больше не возвращаются
new resolver-ом, но обработчики оставлены для legacy-совместимости (на случай
старых сохранений). Новые перки 6/6:
  predator → frenzy_on_crit  — постоянно +10% урон (эмуляция «френзи»)
  bastion  → second_wind     — HP < 30% → +30% от max HP (раз в бой)
  berserk  → blood_rage      — при HP < 50% +30% урон на оставшийся бой
  ghost    → phantom_strike  — постоянно +5% к шансу уворота
  mage     → arcane_burst    — постоянно +5% пробою брони (pen_pct)
  regent   → kings_will      — в начале боя +20% от max HP (раз в бой)

Все методы безопасны: если у игрока нет соответствующего perk_id — ничего не делают.
"""
from __future__ import annotations

from typing import Dict

from config import PLAYER_START_MAX_HP


# Пороги и магические числа перков
SECOND_WIND_HP_THRESHOLD = 0.30   # < 30% HP — триггер
SECOND_WIND_HEAL = 100             # +100 HP при срабатывании
DECISIVE_STRIKE_BONUS_PCT = 50    # +50% к урону на первый удар
COLD_BLOOD_PER_ROUND = 1          # +1% за раунд
COLD_BLOOD_MAX = 10               # max +10%
GODS_WRATH_EVERY_N = 5            # каждый 5-й удар
GODS_WRATH_MULT = 2               # х2 урон


def _perk_state(battle: Dict, who: str) -> Dict:
    """Возвращает (создаёт если нужно) словарь состояния перков для p1/p2 в этом бою."""
    if "_perk_state" not in battle:
        battle["_perk_state"] = {}
    if who not in battle["_perk_state"]:
        battle["_perk_state"][who] = {
            "decisive_used": False,
            "second_wind_used": False,
            "hit_count": 0,
        }
    return battle["_perk_state"][who]


class BattleSetPerksMixin:

    def _apply_set_bonus(self, player: dict, equipped: dict) -> None:
        """Активный сет: hp_pct/def_pct_bonus/atk_pct/accuracy + perk_id для 6/6.

        Вызывается из start.py:_apply_equipment_stats после применения базовых стат.
        Армор-слот в этой игре читается из `players.current_class` (гардероб = броня).
        """
        from config.set_bonuses import resolve_active_set
        # current_class имеет приоритет; если пусто — warrior_type (у некоторых игроков
        # «броня» хранится только там)
        _cls_hint = player.get("current_class") or player.get("warrior_type")
        info = resolve_active_set(equipped, current_class=_cls_hint)
        player["_set_info"] = info  # для API/UI; None если порог < 3
        if not info:
            return
        b = info["bonuses"]
        # +% HP — увеличиваем max_hp и текущий
        hp_pct = int(b.get("hp_pct", 0))
        if hp_pct:
            old_max = max(1, int(player.get("max_hp", PLAYER_START_MAX_HP)))
            old_cur = int(player.get("current_hp", old_max))
            extra = int(old_max * hp_pct / 100)
            player["max_hp"]     = old_max + extra
            player["current_hp"] = min(player["max_hp"], old_cur + extra)
        # +% атаки — читается в damage._base_damage
        if b.get("atk_pct"):
            player["_eq_atk_pct"] = int(b["atk_pct"])
        # +% защита — добавляем к существующему _eq_def_pct (как доля)
        if b.get("def_pct_bonus"):
            player["_eq_def_pct"] = float(player.get("_eq_def_pct", 0) or 0) + float(b["def_pct_bonus"])
        # +% точность — добавляем к _eq_accuracy (целые проценты)
        if b.get("accuracy"):
            player["_eq_accuracy"] = int(player.get("_eq_accuracy", 0) or 0) + int(b["accuracy"])
        # Перк (только для 6/6)
        if info.get("perk"):
            player["_set_perk_id"] = info["perk"]
            # Состояние перка инициализируется в execute.py при первом раунде

    def _apply_set_perks_pre(self, battle: Dict, player: Dict, who: str, round_num: int) -> None:
        """Применяется ДО расчёта урона. Модифицирует временное поле player['_eq_atk_pct'].

        Так как `player` — это копия из execute.py, изменение живёт только в течение этого раунда.
        """
        perk = player.get("_set_perk_id")
        if not perk:
            return

        # decisive_strike (legacy) — только первый удар, помечаем флаг в состоянии
        if perk == "decisive_strike":
            st = _perk_state(battle, who)
            if not st["decisive_used"]:
                player["_eq_atk_pct"] = int(player.get("_eq_atk_pct", 0) or 0) + DECISIVE_STRIKE_BONUS_PCT
                st["decisive_used"] = True

        # cold_blood (legacy) — накапливаемый бонус, зависит от номера раунда
        elif perk == "cold_blood":
            bonus = min(COLD_BLOOD_MAX, COLD_BLOOD_PER_ROUND * round_num)
            player["_eq_atk_pct"] = int(player.get("_eq_atk_pct", 0) or 0) + bonus

        # ── Новые архетипные перки (этап 5C) ──────────────────────────

        # blood_rage (berserk 6/6) — при HP < 50% +30% урон оставшийся бой
        elif perk == "blood_rage":
            cur_hp = int(player.get("current_hp", 1))
            max_hp = max(1, int(player.get("max_hp", 1)))
            if cur_hp / max_hp < 0.50:
                player["_eq_atk_pct"] = int(player.get("_eq_atk_pct", 0) or 0) + 30

        # frenzy_on_crit (predator 6/6) — упрощённо: постоянно +10% урон
        # (полноценная триггер-логика «после крита» — отдельная доработка)
        elif perk == "frenzy_on_crit":
            player["_eq_atk_pct"] = int(player.get("_eq_atk_pct", 0) or 0) + 10

        # phantom_strike (ghost 6/6) — упрощённо: постоянный +5% к dodge
        # (полноценная реакция на удар врага — отдельная доработка)
        elif perk == "phantom_strike":
            player["_eq_dodge"] = int(player.get("_eq_dodge", 0) or 0) + 5

        # arcane_burst (mage 6/6) — упрощённо: постоянный +5% pen
        # (полноценный «каждый 4-й удар игнорирует броню» — отдельная доработка)
        elif perk == "arcane_burst":
            player["_eq_pen_pct"] = float(player.get("_eq_pen_pct", 0) or 0) + 0.05

        # kings_will (regent 6/6) — в первом раунде +20% от max HP, раз в бой
        elif perk == "kings_will":
            st = _perk_state(battle, who)
            if not st.get("kings_will_used") and round_num <= 1:
                cur_hp = int(player.get("current_hp", 0))
                max_hp = max(1, int(player.get("max_hp", 1)))
                player["current_hp"] = min(max_hp, cur_hp + int(max_hp * 0.20))
                st["kings_will_used"] = True

    def _apply_set_perk_gods_wrath(self, battle: Dict, who: str, damage: int) -> int:
        """gods_wrath: каждый 5-й удар (с уроном > 0) умножает damage на 2."""
        player_key = "player1" if who == "p1" else "player2"
        player = battle.get(player_key, {})
        if player.get("_set_perk_id") != "gods_wrath":
            return damage
        if damage <= 0:
            return damage  # промах/блок/уклон — не считается
        st = _perk_state(battle, who)
        st["hit_count"] = int(st.get("hit_count", 0)) + 1
        if st["hit_count"] % GODS_WRATH_EVERY_N == 0:
            return damage * GODS_WRATH_MULT
        return damage

    def _apply_set_perk_second_wind(self, battle: Dict, player: Dict, who: str) -> None:
        """second_wind: при HP < 30% — мгновенный +100 HP. Раз в бой.

        Вызывается ПОСЛЕ применения урона. Меняет `player['current_hp']` (это копия,
        execute.py запишет результат обратно в battle['player1/2']['current_hp']).
        """
        if player.get("_set_perk_id") != "second_wind":
            return
        st = _perk_state(battle, who)
        if st["second_wind_used"]:
            return
        cur_hp = int(player.get("current_hp", 0))
        max_hp = max(1, int(player.get("max_hp", 1)))
        if cur_hp <= 0:
            return  # уже мёртв — поздно
        if cur_hp / max_hp < SECOND_WIND_HP_THRESHOLD:
            player["current_hp"] = min(max_hp, cur_hp + SECOND_WIND_HEAL)
            st["second_wind_used"] = True
