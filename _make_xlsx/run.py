"""Сборка workbook и сохранение в progression_100_levels_v4/."""

from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook

from _make_xlsx.sheet_legend import build_legend_sheet
from _make_xlsx.sheet_levels import build_all_levels_sheet


def main() -> None:
    wb = Workbook()
    build_all_levels_sheet(wb)
    build_legend_sheet(wb)
    out = Path(__file__).resolve().parent.parent / "progression_100_levels_v4" / "progression_100_levels_v4.xlsx"
    wb.save(out)
    print("Saved:", out)
