"""tests/test_no_hardcoded_prices.py — защита Этапа 2 от регресса хардкодов.

Этап 2 редизайна перенёс магические числа (PvP-бонус, XP-буст, цены зелий,
WB-награды) из Python-кода в config/economy.json. Если разработчик случайно
вернёт литерал вместо `get_combat()` / `get_potion_cost()` — этот тест поймает.

Подход: парсим AST конкретных файлов и ищем «легендарные» числа из старого кода:
- PvP-бонус 1.30 / 1.3
- XP-буст 1.5
- Bot-win-mult 0.8
- Цены зелий 12/25/50 (legacy) в коде магазина
А также — что критичные файлы реально импортируют economy.loader.
"""
from __future__ import annotations

import ast
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def _parse(rel_path: str) -> ast.AST:
    src = (ROOT / rel_path).read_text(encoding="utf-8")
    return ast.parse(src, filename=rel_path)


def _literals(tree: ast.AST) -> list[tuple[int, int | float]]:
    """Все числовые литералы (line, value) — bool отфильтрован."""
    out = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            if not isinstance(node.value, bool):
                out.append((node.lineno, node.value))
    return out


def _imports(tree: ast.AST) -> set[str]:
    """Имена всех импортированных функций/имён."""
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                out.add(alias.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                out.add(alias.name)
    return out


# ── Тест 1: end_battle.py не содержит литералы PvP/XP-множителей ──────────

# Эти числа ОБЯЗАНЫ идти из get_combat() — Этап 2 их вынес из кода.
# Если кто-то регрессирует — fail с указанием строки.
PVP_FORBIDDEN_LITERALS = {1.30, 1.3, 1.5, 0.8}
PVP_REPEAT_FORBIDDEN = {0.5, 0.2}  # старые pvp_repeat_factor значения


def test_end_battle_no_pvp_magic_numbers():
    """В end_battle.py не должно быть литералов 1.30/1.5/0.8 — они в economy.json."""
    tree = _parse("battle_system/mixins/end_battle.py")
    found = []
    for line, val in _literals(tree):
        if val in PVP_FORBIDDEN_LITERALS:
            found.append((line, val))
    assert not found, (
        f"Найдены хардкоды PvP/XP-множителей в end_battle.py: {found}. "
        f"Замени на get_combat() из economy.loader."
    )


def test_end_battle_imports_economy_loader():
    """end_battle.py обязан импортировать get_combat — без этого Этап 2 не работает."""
    tree = _parse("battle_system/mixins/end_battle.py")
    imports = _imports(tree)
    assert "get_combat" in imports or "get_combat_dict" in imports, (
        "end_battle.py не импортирует get_combat/get_combat_dict из economy.loader. "
        "Этап 2 нарушен — числа PvP/XP должны идти из конфига."
    )


# ── Тест 2: shop/store.py — цены зелий через формулу, не литералы ─────────

POTION_LEGACY_PRICES = {12, 25, 50, 60, 200}  # старые цены, до Этапа 2


def test_shop_store_uses_formula_for_potions():
    """repositories/shop/store.py должен импортировать potion_price_for_hp."""
    tree = _parse("repositories/shop/store.py")
    imports = _imports(tree)
    assert "potion_price_for_hp" in imports, (
        "shop/store.py не импортирует potion_price_for_hp из economy.formulas. "
        "Цена зелья должна считаться формулой от max_hp, не хардкодом."
    )


def test_shop_store_no_legacy_potion_prices():
    """В shop/store.py не должно быть литералов 60/200 (старые плоские цены)."""
    tree = _parse("repositories/shop/store.py")
    found = []
    for line, val in _literals(tree):
        if val in {60, 200}:  # старые buy_hp_potion_small=60g, buy_hp_potion=200g
            found.append((line, val))
    assert not found, (
        f"Найдены старые цены зелий в shop/store.py: {found}. "
        f"Используй potion_price_for_hp(max_hp)."
    )


# ── Тест 3: WB rewards_calc — числа из economy.json ───────────────────────

def test_world_boss_rewards_uses_loader():
    """rewards_calc.py читает WB-награды из конфига (не хардкодит 1000/10)."""
    tree = _parse("repositories/world_boss/rewards_calc.py")
    imports = _imports(tree)
    # Должен быть импорт чего-то из economy
    has_economy = any(
        i for i in imports
        if "economy" in i or i in ("get_wb_pool", "tier_unlocked_at")
    )
    assert has_economy, (
        "rewards_calc.py не использует economy-helpers. "
        "WB-награды должны браться из config/economy.json."
    )


# ── Тест 4: daily_quests — нет старой таблицы наград ──────────────────────

LEGACY_QUEST_REWARDS = {55, 150, 350, 700}  # старая таблица (удалена в Этапе 2)


def test_daily_quests_no_legacy_reward_table():
    """daily_quests.py не должен содержать старые числа наград 55g/150xp/350g/700xp."""
    tree = _parse("repositories/battles/daily_quests.py")
    found = []
    for line, val in _literals(tree):
        if val in LEGACY_QUEST_REWARDS:
            found.append((line, val))
    assert not found, (
        f"Найдены старые числа наград квестов в daily_quests.py: {found}. "
        f"Этап 2 удалил эту таблицу — используй reward_calculator.calc_reward()."
    )


# ── Тест 5: economy.json содержит все ожидаемые секции ───────────────────

def test_economy_json_has_required_sections():
    """В config/economy.json должны жить все секции из Этапа 2."""
    import json
    path = ROOT / "config" / "economy.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    required = ("potions", "combat", "world_boss")
    for section in required:
        assert section in data, f"economy.json не содержит секцию {section!r}"
    # combat — обязательные ключи (Этап 2)
    combat = data["combat"]
    for key in ("pvp_winrate_bonus", "xp_boost_mult", "bot_win_gold_multiplier", "pvp_repeat_factor"):
        assert key in combat, f"economy.json/combat не содержит {key!r}"
