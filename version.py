"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.43"
VERSION_LABEL = "v2.22.43 — аудит «ТЕСТ ИГРЫ», этап 2 (бой), первая партия правок текстов/чистки: (1) класс Берсерк во всех текстах приведён к бою — +10% урон / −5% уворот (было ошибочно +12% / −8%) в scene_warrior_select, stats_html_info, scene_stats_hero_bonuses, stats_html_overlay_pages; (2) гайд «Поглощение» 12%→15% (совпадает с TANK_GUARD_MAX_CHANCE); (3) тултип «крит-пробой блока» ×0.5→×0.7 (совпадает с CRIT_BLOCK_PIERCE_DAMAGE_MULT); (4) удалена мёртвая константа BATTLE_TIMEOUT_SECONDS (config + README); (5) три except: pass в конце боя теперь logger.warning (afk_end, end_battle). Игровая логика не менялась, тесты зелёные. version.py →2.22.43, GAME_VERSION →17.93."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.93"
