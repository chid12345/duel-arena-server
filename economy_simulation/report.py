"""Monte-Carlo прогон + форматирование отчёта."""

from __future__ import annotations

import random
import statistics
from datetime import datetime

from economy import get_anchor
from economy_simulation.profiles import get_profile
from economy_simulation.runner import simulate_one_run


_ANCHOR_KEYS = (
    "PVP_WIN_GOLD", "PVP_DEFEAT_GOLD", "DAILY_BONUS_GOLD",
    "PREMIUM_GOLD_BUFF", "PREMIUM_XP_BUFF", "POST_CAP_XP_TO_GOLD",
)


def _load_anchors() -> dict[str, float]:
    return {k: float(get_anchor(k)) for k in _ANCHOR_KEYS}


def run_monte_carlo(profile_key: str, days: int, n_runs: int,
                    seed: int | None = None) -> dict:
    """N прогонов симуляции, агрегация по дням и тотал."""
    profile = get_profile(profile_key)
    anchors = _load_anchors()
    rng_master = random.Random(seed)

    # daily_totals[day] -> list of dict per run
    daily_totals: list[list[dict[str, int]]] = [[] for _ in range(days)]
    cum_gold_per_run: list[int] = []
    first_conv_days: list[int] = []
    final_levels: list[int] = []

    for _ in range(n_runs):
        run_rng = random.Random(rng_master.random())
        days_data = simulate_one_run(profile, days, run_rng, anchors)
        run_cum_gold = 0
        first_conv = None
        for i, d in enumerate(days_data):
            daily_totals[i].append(d)
            run_cum_gold += d["gold"]
            if first_conv is None and d["xp_to_gold"] > 0:
                first_conv = i + 1
        cum_gold_per_run.append(run_cum_gold)
        first_conv_days.append(first_conv or 0)
        final_levels.append(days_data[-1]["level"])

    def _avg(values):
        return statistics.mean(values) if values else 0.0

    def _std(values):
        return statistics.pstdev(values) if len(values) > 1 else 0.0

    daily_avg = []
    for day_runs in daily_totals:
        daily_avg.append({
            "gold": _avg([d["gold"] for d in day_runs]),
            "gold_std": _std([d["gold"] for d in day_runs]),
            "xp": _avg([d["xp"] for d in day_runs]),
            "diamonds": _avg([d["diamonds"] for d in day_runs]),
            "xp_to_gold": _avg([d["xp_to_gold"] for d in day_runs]),
        })

    return {
        "profile_key": profile_key,
        "profile_name": profile["name"],
        "days": days,
        "n_runs": n_runs,
        "seed": seed,
        "daily_avg": daily_avg,
        "total_gold_avg": _avg(cum_gold_per_run),
        "total_gold_std": _std(cum_gold_per_run),
        "first_conv_day_avg": _avg([d for d in first_conv_days if d > 0]) if any(first_conv_days) else None,
        "first_conv_share": sum(1 for d in first_conv_days if d > 0) / max(1, n_runs),
        "final_level_avg": _avg(final_levels),
    }


def format_report(result: dict, cmd: str = "") -> str:
    """Текстовый отчёт по результатам Monte Carlo."""
    days = result["days"]
    avg = result["daily_avg"]
    mid = days // 2

    last7_gold = sum(d["gold"] for d in avg[-7:]) / min(7, days)
    last7_xp = sum(d["xp"] for d in avg[-7:]) / min(7, days)
    last7_dia = sum(d["diamonds"] for d in avg[-7:]) / min(7, days)
    last7_xp2g = sum(d["xp_to_gold"] for d in avg[-7:]) / min(7, days)

    lines = []
    lines.append(f"Дата: {datetime.utcnow().isoformat(timespec='seconds')}")
    if cmd:
        lines.append(f"Команда: {cmd}")
    lines.append("")
    lines.append(f"Профиль:    {result['profile_name']}")
    lines.append(f"Дней:       {days}  Прогонов: {result['n_runs']}")
    if result.get("seed") is not None:
        lines.append(f"Seed:       {result['seed']}")
    lines.append("")
    lines.append("Среднее в день (последние 7 дней):")
    lines.append(f"  Gold:      {last7_gold:7.1f}")
    lines.append(f"  XP:        {last7_xp:7.1f}")
    lines.append(f"  Diamonds:  {last7_dia:7.2f}")
    if last7_xp2g > 0:
        lines.append(f"  XP→Gold:   {last7_xp2g:7.1f}  (часть Gold выше — из конверсии)")
    lines.append("")
    lines.append(f"Финальный уровень (среднее): {result['final_level_avg']:.1f} / {result['final_level_avg']:.0f}")
    if result["first_conv_share"] > 0:
        lines.append(
            f"Конверсия XP→Gold активна у {result['first_conv_share'] * 100:.0f}% прогонов, "
            f"средний старт — день {result['first_conv_day_avg']:.0f}"
        )
    else:
        lines.append("Конверсия XP→Gold НЕ активировалась (игрок не достиг MAX_LEVEL за период)")
    lines.append("")
    lines.append(f"Кумулятивное золото за {days} дней: {result['total_gold_avg']:.0f} ± {result['total_gold_std']:.0f}")
    lines.append("")
    lines.append("Кривая по дням (gold per day):")
    snapshots = sorted({0, mid, days - 1, min(6, days - 1), min(13, days - 1), min(20, days - 1)})
    for i in snapshots:
        if 0 <= i < days:
            lines.append(f"  День {i+1:3d}: {avg[i]['gold']:6.0f}g ±{avg[i]['gold_std']:4.0f}   "
                         f"{avg[i]['xp']:5.0f}xp   {avg[i]['diamonds']:4.2f}💎")
    return "\n".join(lines)
