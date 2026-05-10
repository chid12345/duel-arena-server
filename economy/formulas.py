"""
economy/formulas.py — формулы балансной сетки.

Все цифры считаются от анкера в config/economy.json. Никаких магических констант.

Базовая единица — PU (Progress Unit) = 1 час активной игры.
1 PU = PU_TO_GOLD золота = (PU_TO_GOLD / GOLD_TO_DIAMOND) алмазов.

Этап 1: эти функции готовы к использованию, но ещё нигде не подключены.
Этап 2: reward_calculator.calc_reward, tma_catalogs цены, shop_loot_box будут
       вызывать их вместо хардкода.
"""

from __future__ import annotations

from economy.loader import (
    get_anchor,
    get_difficulty_pu,
    get_frequency_mult,
    get_price_factor,
    get_rarity_mult,
    get_reward_grid_cell,
    get_reward_split,
    get_tier_mult,
)

# ── Конвертеры валют ─────────────────────────────────────────────────────────

def pu_to_gold(pu: float) -> int:
    """1 PU → золото."""
    return max(0, round(pu * get_anchor("PU_TO_GOLD")))


def gold_to_pu(gold: float) -> float:
    g = get_anchor("PU_TO_GOLD")
    return float(gold) / g if g > 0 else 0.0


def gold_to_diamond(gold: float) -> int:
    """Округление вверх до целого алмаза (для отображения «справедливой цены»)."""
    rate = get_anchor("GOLD_TO_DIAMOND")
    if rate <= 0:
        return 0
    return max(0, int((float(gold) + rate - 1) // rate))


def diamond_to_gold(diamonds: float) -> int:
    return max(0, round(float(diamonds) * get_anchor("GOLD_TO_DIAMOND")))


def star_to_diamond(stars: float) -> float:
    return float(stars) * get_anchor("STAR_TO_DIAMOND")


def usdt_to_diamond(usdt: float) -> float:
    return float(usdt) * get_anchor("USDT_TO_DIAMOND")


# ── Награда за задание ───────────────────────────────────────────────────────

def reward_for_task(
    difficulty: str,
    frequency: str,
) -> tuple[int, int]:
    """
    Вернуть (gold, diamonds) по балансной сетке. Только валюта.

    Сначала ищет в калиброванной сетке `reward_grid` (фактические значения
    существующих квестов). Если клетки нет — считает формулой
    `total_pu × split` для НОВЫХ заданий.

    XP — отдельная система, считается через progression_loader (этап 5).
    """
    cell = get_reward_grid_cell(frequency, difficulty)
    if cell is not None:
        return cell

    # Формула для новых заданий, не указанных в reward_grid
    total_pu = get_difficulty_pu(difficulty) * get_frequency_mult(frequency)
    split = get_reward_split(frequency)
    gold_pu = total_pu * split.get("gold", 0.0)
    diam_pu = total_pu * split.get("diamond", 0.0)

    gold = pu_to_gold(gold_pu)
    diamonds = max(0, round(diam_pu * get_anchor("PU_TO_GOLD") / get_anchor("GOLD_TO_DIAMOND")))
    return gold, diamonds


# ── Цена предмета ────────────────────────────────────────────────────────────

def price_for_item(
    power_score: float,
    rarity: str = "common",
    tier: str = "T1",
    *,
    currency: str = "gold",
) -> int:
    """
    Цена предмета по формуле:
        price_pu = power_score × rarity_mult × tier_mult × price_factor[currency]

    Множитель `price_factor` зависит от валюты:
      - gold:    дёшево (фарм-валюта, расходники)
      - diamond: дорого (premium-валюта)
    Конкретные числа в config/economy.json/price_factor.

    currency: 'gold' | 'diamond' | 'star' | 'usdt'
    """
    factor = get_price_factor(currency)
    base_pu = float(power_score) * get_rarity_mult(rarity) * get_tier_mult(tier) * factor
    gold = pu_to_gold(base_pu)

    if currency == "gold":
        return gold
    if currency == "diamond":
        return gold_to_diamond(gold)
    if currency == "star":
        d = gold_to_diamond(gold)
        rate = get_anchor("STAR_TO_DIAMOND")
        return max(0, round(d / rate)) if rate > 0 else 0
    if currency == "usdt":
        d = gold_to_diamond(gold)
        rate = get_anchor("USDT_TO_DIAMOND")
        return max(0, round(d / rate, 2)) if rate > 0 else 0  # type: ignore[return-value]
    raise ValueError(f"Неизвестная валюта: {currency!r}")


# ── EV ящика ─────────────────────────────────────────────────────────────────

def ev_for_box(
    price_gold: float,
    *,
    jackpot_chance: float = 0.0,
    jackpot_value_gold: float = 0.0,
) -> dict[str, float]:
    """
    Содержимое ящика разделяется на «гарант» + «джекпот».

    Бюджеты:
        guaranteed_gold = price × BOX_EV_RATIO × (1 − BOX_JACKPOT_BUDGET)
        jackpot_pool    = price × BOX_EV_RATIO × BOX_JACKPOT_BUDGET

    Если задан конкретный jackpot_chance + jackpot_value, проверяем что
    jackpot_chance × jackpot_value ≤ jackpot_pool (иначе ящик в плюсе → инфляция).

    Возвращает словарь с раскладкой бюджета (для отчётов и dump_diffs).
    """
    ev_ratio = get_anchor("BOX_EV_RATIO")
    jp_budget = get_anchor("BOX_JACKPOT_BUDGET")
    total_ev = float(price_gold) * ev_ratio
    guaranteed = total_ev * (1.0 - jp_budget)
    jackpot_pool = total_ev * jp_budget

    actual_jackpot_ev = float(jackpot_chance) * float(jackpot_value_gold)
    overflow = max(0.0, actual_jackpot_ev - jackpot_pool)

    return {
        "price_gold": float(price_gold),
        "ev_ratio": ev_ratio,
        "total_ev_gold": total_ev,
        "guaranteed_gold": guaranteed,
        "jackpot_pool_gold": jackpot_pool,
        "actual_jackpot_ev_gold": actual_jackpot_ev,
        "jackpot_overflow_gold": overflow,
        "house_edge_gold": float(price_gold) - total_ev - actual_jackpot_ev,
    }


# ── Премиум-буст ─────────────────────────────────────────────────────────────

def apply_premium_gold(gold: float) -> int:
    return max(0, round(float(gold) * get_anchor("PREMIUM_GOLD_BUFF")))



if __name__ == "__main__":
    print("=== Балансная сетка (валюта): тестовые расчёты ===")
    for freq in ("daily", "weekly", "once"):
        for diff in ("easy", "medium", "hard", "epic"):
            g, d = reward_for_task(diff, freq)
            print(f"{freq:6s} {diff:6s} → {g:5d} 🪙  {d:3d} 💎")
    print()
    print(f"box 150 🪙 → EV: {ev_for_box(150, jackpot_chance=0.05, jackpot_value_gold=300)}")
