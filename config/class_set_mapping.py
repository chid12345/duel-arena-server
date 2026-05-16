"""Маппинг class_id (гардероб/класс) → set_id (Этап 5B.2 редизайна).

Армор в этой игре — это класс игрока (players.current_class), не предмет.
Чтобы класс участвовал в архетипном сете, ему сопоставлен set_id по
доминирующему стату.

Используется resolver-ом сетов: при подсчёте надетого добавляется виртуальный
«предмет armor» с set_id из этого маппинга (см. repositories/sets/set_resolver).
"""
from __future__ import annotations

# class_id → set_id. Если class_id отсутствует — armor не учитывается в сете.
# default_start не имеет архетипа (стартовый, без стат-уклона).
_CLASS_TO_SET_ID: dict[str, str] = {
    # ── Common / base (14) ─────────────────────────────────────────────
    "base_tank":      "bastion",
    "base_rogue":     "ghost",
    "base_crit":      "predator",
    "base_neutral":   "regent",
    "base_berserker": "berserk",
    "base_monk":      "bastion",
    "base_shooter":   "predator",
    "base_gladiator": "regent",
    "base_shadow":    "ghost",
    "base_viking":    "berserk",
    "base_samurai":   "mage",
    "base_paladin":   "bastion",
    "base_ranger":    "ghost",
    "base_nomad":     "regent",
    # ── Gold / rare (14) ───────────────────────────────────────────────
    "gold_vanguard":  "bastion",
    "gold_blade":     "mage",
    "gold_hunter":    "predator",
    "gold_tactician": "regent",
    "gold_warlord":   "berserk",
    "gold_assassin":  "predator",
    "gold_sentinel":  "bastion",
    "gold_brawler":   "berserk",
    "gold_shaman":    "mage",
    "gold_knight":    "regent",
    "gold_mercenary": "predator",
    "gold_defender":  "bastion",
    "gold_lightning": "regent",
    "gold_champion":  "berserk",
    # ── Diamond / epic (13) ────────────────────────────────────────────
    "dia_duelist":      "predator",
    "dia_fortress":     "bastion",
    "dia_phantom":      "mage",
    "dia_reaper":       "berserk",
    "dia_titan":        "bastion",
    "dia_specter":      "ghost",
    "dia_warden":       "regent",
    "dia_ravager":      "berserk",
    "dia_oracle":       "mage",
    "dia_stormzerker":  "berserk",
    "dia_shadow_monk":  "ghost",
    "dia_juggernaut":   "bastion",
    "dia_liquidator":   "predator",
    # ── Premium / legendary (10) ───────────────────────────────────────
    "prem_dragon":  "mage",
    "prem_phoenix": "regent",
    "prem_kraken":  "bastion",
    "prem_wolf":    "predator",
    "prem_lion":    "berserk",
    "prem_serpent": "predator",
    "prem_eagle":   "ghost",
    "prem_bear":    "bastion",
    "prem_panther": "ghost",
    "prem_hydra":   "mage",
    # ── Подписочный / реферальный / элитный (3) ───────────────────────
    "sub_celestial": "regent",
    "ref_guardian":  "regent",
    "elite_emperor": "regent",
}


def class_id_to_set_id(class_id: str | None) -> str | None:
    """Возвращает set_id для класса или None если класс не имеет архетипа
    (например default_start или legendary_usdt-кастомный)."""
    if not class_id:
        return None
    cid = str(class_id)
    # USDT-кастомные образы — всегда regent (универсал)
    if cid.startswith("usdt_custom_"):
        return "regent"
    return _CLASS_TO_SET_ID.get(cid)
