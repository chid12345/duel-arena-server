"""Таблица прокачки из progression.json."""

from __future__ import annotations

from progression_loader.accessors import (
    describe_progression_summary,
    diamonds_when_reaching_level,
    exp_needed_for_next_level,
    get_table,
    gold_when_reaching_level,
    hp_when_reaching_level,
    intermediate_ap_steps_for_level,
    max_level_from_table,
    progression_source_path,
    stats_when_reaching_level,
    victory_xp_for_player_level,
)
from progression_loader.load_validate import load_progression_table

__all__ = (
    "load_progression_table",
    "progression_source_path",
    "describe_progression_summary",
    "get_table",
    "exp_needed_for_next_level",
    "victory_xp_for_player_level",
    "intermediate_ap_steps_for_level",
    "stats_when_reaching_level",
    "gold_when_reaching_level",
    "hp_when_reaching_level",
    "diamonds_when_reaching_level",
    "max_level_from_table",
)
