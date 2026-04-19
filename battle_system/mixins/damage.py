"""Расчёт урона: сравнительные формулы (уворот, крит, сила), зоны, спецмеханики."""

from __future__ import annotations

import random
from typing import Dict, Tuple

from config import *


class BattleDamageMixin:
    def _safe_int_field(self, player: Dict, key: str, default: int = 0) -> int:
        try:
            v = player.get(key, default)
            return int(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    def _safe_crit_stat(self, player: Dict, key: str, default: int = 0) -> int:
        v = self._safe_int_field(player, key, default)
        return max(0, min(100, v))

    def _base_damage(self, attacker: Dict) -> int:
        """Урон от Силы: убывающая отдача через степенную формулу."""
        strength = max(1, self._safe_int_field(attacker, "strength", PLAYER_START_STRENGTH))
        level = max(1, self._safe_int_field(attacker, "level", PLAYER_START_LEVEL))
        flat = STRENGTH_DAMAGE_FLAT_PER_LEVEL * level
        scaled = STRENGTH_DAMAGE_SCALE * (strength ** STRENGTH_DAMAGE_POWER)
        eq_atk = int(attacker.get("_eq_atk_bonus", 0) or 0)
        return max(1, int(flat + scaled + eq_atk))

    def _calculate_damage_detailed(
        self,
        attacker: Dict,
        defender: Dict,
        attack_zone: str,
        defense_zone: str,
        is_afk: bool = False,
    ) -> Tuple[int, str, str]:
        """
        Возвращает (урон, outcome_tags, debuff_next_round).
        outcome_tags — теги через '_': block/miss/dodge/crit/double/guard/fortress/pierce/partial/break.
        debuff_next_round — "legs" если ударили в ноги (снижает уворот жертвы).
        """
        debuff = ""
        opp_max_hp = max(1, self._safe_int_field(defender, "max_hp", PLAYER_START_MAX_HP))
        dmg_cap = int(opp_max_hp * STRENGTH_DAMAGE_MAX_PCT)

        # Зональный множитель и дебафф
        base_dmg = min(self._base_damage(attacker), dmg_cap)
        if attack_zone == "ГОЛОВА":
            base_dmg = int(base_dmg * ZONE_HEAD_MULT)
        elif attack_zone == "НОГИ":
            base_dmg = int(base_dmg * ZONE_LEGS_MULT)
            debuff = "legs"

        # Бонус атакующего по типу воина + USDT damage_pct (кап: суммарно ≤ +20%)
        wt_atk = attacker.get("warrior_type") or "default"
        usdt = (attacker.get("usdt_passive_type") or "").strip()
        cls_id = (attacker.get("current_class") or "").strip()
        dmg_bonus = 1.0
        if wt_atk == "tank":
            dmg_bonus = 1.12   # Берсерк +12%
        if usdt == "damage_pct":
            dmg_bonus = min(1.20, dmg_bonus * 1.08)  # кап: суммарный бонус ≤ +20%
        base_dmg = min(dmg_cap, int(base_dmg * dmg_bonus))

        # Спецэффект Gold/Diamond: ярость при низком HP
        _hp_pct = attacker.get("current_hp", 1) / max(1, attacker.get("max_hp", 1))
        if cls_id == "berserker_gold" and _hp_pct < 0.30:
            base_dmg = min(dmg_cap, int(base_dmg * 1.04))   # +4% при HP < 30%
        elif cls_id == "dragonknight_diamonds" and _hp_pct < 0.40:
            base_dmg = min(dmg_cap, int(base_dmg * 1.06))   # +6% при HP < 40%

        # Промах (снижается бафом accuracy у атакующего)
        eff_miss = max(0.0, MISS_CHANCE - attacker.get("_buff_accuracy", 0) / 100.0)
        if not is_afk and random.random() < eff_miss:
            return 0, "miss", ""

        # Блок
        blocked = (attack_zone == defense_zone)
        if blocked and not is_afk:
            atk_crit = self._safe_int_field(attacker, "crit", PLAYER_START_CRIT)
            def_crit = self._safe_int_field(defender, "crit", PLAYER_START_CRIT)
            crit_ch = atk_crit / (atk_crit + def_crit + 1) * CRIT_MAX_CHANCE
            # Крит-пробой блока
            if random.random() < (crit_ch * CRIT_BLOCK_PIERCE_CHANCE):
                dmg = max(1, int(base_dmg * CRIT_BLOCK_PIERCE_DAMAGE_MULT))
                return self._apply_incoming_damage(dmg, defender), "pierce_crit", debuff
            # Частичный блок (вскользь)
            if random.random() < PARTIAL_BLOCK_CHANCE:
                dmg = max(1, int(base_dmg * PARTIAL_BLOCK_DAMAGE_MULT))
                return self._apply_incoming_damage(dmg, defender), "partial", debuff
            return 0, "block", ""

        # Уворот: сравнительная формула по Ловкости (endurance) + баф уворота защитника
        if not is_afk:
            def_agi = max(1, self._safe_int_field(defender, "endurance", PLAYER_START_ENDURANCE))
            atk_agi = max(1, self._safe_int_field(attacker, "endurance", PLAYER_START_ENDURANCE))
            dodge_ch = min(DODGE_MAX_CHANCE, def_agi / (def_agi + atk_agi) * DODGE_MAX_CHANCE)
            dodge_ch = min(DODGE_MAX_CHANCE, dodge_ch + defender.get("_buff_dodge_pct", 0) / 100.0)
            # Бонус/штраф защитника по типу воина
            wt_def = defender.get("warrior_type") or "default"
            if wt_def == "agile":
                dodge_ch = min(DODGE_MAX_CHANCE, dodge_ch + 0.08)   # Теневой Вихрь +8% уворот
            elif wt_def == "tank":
                dodge_ch = max(0.0, dodge_ch - 0.08)                 # Берсерк -8% уворот (трейдофф)
            # Бонус уворота от вложений в Ловкость (AGI_BONUS) — синхрон с UI
            def_agi_inv = max(0, self._safe_int_field(defender, "endurance", PLAYER_START_ENDURANCE) - PLAYER_START_ENDURANCE)
            dodge_ch = min(DODGE_MAX_CHANCE, dodge_ch + (def_agi_inv // max(1, AGI_BONUS_STEP)) * AGI_BONUS_PCT_PER_STEP)
            # Дебафф ног: удар в ноги в прошлом раунде → -15% уворот сейчас
            if defender.get("_debuff_legs"):
                dodge_ch = max(0.0, dodge_ch - ZONE_LEGS_DODGE_PENALTY)
            if random.random() < dodge_ch:
                # Двойной удар атакующего при уклоне
                atk_agi_inv = stamina_stats_invested(
                    self._safe_int_field(attacker, "max_hp", PLAYER_START_MAX_HP),
                    self._safe_int_field(attacker, "level", PLAYER_START_LEVEL),
                )
                dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE,
                             (atk_agi_inv // max(1, DODGE_DOUBLE_STRIKE_STEP))
                             * DODGE_DOUBLE_STRIKE_PCT_PER_STEP)
                if random.random() < dbl_ch:
                    d2 = max(1, int(base_dmg * DODGE_DOUBLE_STRIKE_DAMAGE_MULT))
                    return self._apply_incoming_damage(d2, defender), "double", debuff
                return 0, "dodge", ""

        # Крит: сравнительная формула по Интуиции (crit)
        atk_crit = self._safe_int_field(attacker, "crit", PLAYER_START_CRIT)
        def_crit = self._safe_int_field(defender, "crit", PLAYER_START_CRIT)
        crit_ch = min(CRIT_MAX_CHANCE, atk_crit / (atk_crit + def_crit + 1) * CRIT_MAX_CHANCE)

        # Бонус крит-шанса от вложений в Интуицию (INT_BONUS) — синхрон с UI
        atk_int_inv = max(0, atk_crit - PLAYER_START_CRIT)
        crit_ch = min(CRIT_MAX_CHANCE, crit_ch + (atk_int_inv // max(1, INT_BONUS_STEP)) * INT_BONUS_PCT_PER_STEP)
        # Хаос-Рыцарь +5% крит-шанс + крит ×1.65
        if wt_atk == "crit":
            crit_ch = min(CRIT_MAX_CHANCE, crit_ch + 0.05)
        _crit_mult = 1.65 if wt_atk == "crit" else 1.5
        is_crit = random.random() < crit_ch
        damage = int(base_dmg * (_crit_mult if is_crit else 1.0))
        if usdt == "crit_dmg_pct" and is_crit:
            damage = int(damage * 1.08)
        # Спецэффект Gold/Diamond: бонус крит-урона
        if is_crit:
            if cls_id == "mage_gold":
                damage = int(damage * 1.04)       # Крит+: крит. урон +4%
            elif cls_id == "archmage_diamonds":
                damage = int(damage * 1.06)       # Крит++: крит. урон +6%

        # Двойной удар (из наступления)
        atk_agi_inv = stamina_stats_invested(
            self._safe_int_field(attacker, "max_hp", PLAYER_START_MAX_HP),
            self._safe_int_field(attacker, "level", PLAYER_START_LEVEL),
        )
        dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE,
                     (atk_agi_inv // max(1, DODGE_DOUBLE_STRIKE_STEP))
                     * DODGE_DOUBLE_STRIKE_PCT_PER_STEP)
        if usdt == "double_hit":
            dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE, dbl_ch + 0.08)
        # Спецэффект Gold/Diamond: бонус двойного удара
        if cls_id == "assassin_gold":
            dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE, dbl_ch + 0.04)   # Ловкач+: +4%
        elif cls_id == "shadowdancer_diamonds":
            dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE, dbl_ch + 0.06)   # Ловкач++: +6%
        dbl_ch = min(DODGE_DOUBLE_STRIKE_MAX_CHANCE, dbl_ch + attacker.get("_buff_double_pct", 0) / 100.0)
        is_double = random.random() < dbl_ch
        if is_double:
            damage += max(1, int(damage * DODGE_DOUBLE_STRIKE_DAMAGE_MULT))

        # Поглощение (guard) — защитник
        def_sta = stamina_stats_invested(
            self._safe_int_field(defender, "max_hp", PLAYER_START_MAX_HP),
            self._safe_int_field(defender, "level", PLAYER_START_LEVEL),
        )
        guard_ch = min(TANK_GUARD_MAX_CHANCE,
                       (def_sta // max(1, TANK_GUARD_STEP)) * TANK_GUARD_PCT_PER_STEP)
        is_guard = random.random() < guard_ch
        if is_guard:
            damage = max(1, int(damage * TANK_GUARD_DAMAGE_MULT))

        # Абсолютная стойка (fortress)
        def_str = self._safe_int_field(defender, "strength", PLAYER_START_STRENGTH)
        fortress_ch = min(FORTRESS_GUARD_MAX_CHANCE,
                          ((def_str + def_sta) // max(1, FORTRESS_GUARD_STEP))
                          * FORTRESS_GUARD_PCT_PER_STEP)
        if random.random() < fortress_ch:
            return self._apply_incoming_damage(1, defender), "fortress", debuff

        # Пролом брони (break)
        atk_str = self._safe_int_field(attacker, "strength", PLAYER_START_STRENGTH)
        break_ch = min(STRENGTH_ARMOR_BREAK_MAX_CHANCE,
                       (atk_str // max(1, STRENGTH_ARMOR_BREAK_STEP))
                       * STRENGTH_ARMOR_BREAK_PCT_PER_STEP)
        is_break = random.random() < break_ch

        # Вампиризм атакующего (lifesteal_pct buff) — лечение до применения брони защитника
        _lifesteal = attacker.get("_buff_lifesteal_pct", 0)
        if _lifesteal and damage > 0:
            _heal = max(1, int(damage * _lifesteal / 100))
            attacker["current_hp"] = min(
                int(attacker.get("max_hp", 1)),
                int(attacker.get("current_hp", 1)) + _heal,
            )

        damage = self._apply_incoming_damage(damage, defender)
        if is_break:
            damage = max(1, damage + int(damage * STRENGTH_ARMOR_BREAK_IGNORE_PCT))

        # Outcome теги
        if is_guard and is_crit and is_double:
            outcome = "guard_crit_double"
        elif is_guard and is_crit:
            outcome = "guard_crit"
        elif is_guard and is_double:
            outcome = "guard_double"
        elif is_guard:
            outcome = "guard"
        elif is_crit and is_double:
            outcome = "crit_double"
        elif is_crit:
            outcome = "crit"
        elif is_double:
            outcome = "double"
        else:
            outcome = "hit"
        if is_break:
            outcome += "_break"

        return max(1, damage), outcome, debuff
