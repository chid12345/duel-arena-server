"""WebP pass #2 — сжать всё оставшееся в webapp/ (>50КБ PNG/JPG → WebP q80).

Запуск: python scripts/webp_pass2.py
Действие:
  1) Находит все .png/.jpg/.jpeg в webapp/ размером >50КБ.
  2) Конвертирует в .webp (quality=80, method=6).
  3) Удаляет исходный .png/.jpg (живых игроков нет — см. memory).
  4) Печатает таблицу «было → стало» и итог по МБ.

Замены ссылок в коде делаем отдельным шагом — см. webp_pass2_refs.py.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"
MIN_SIZE = 50 * 1024  # 50 КБ

# Не трогаем папку intro_variants — это исходники, не загружаются в прод
SKIP_DIRS = {"intro_variants"}


def convert_one(src: Path) -> tuple[int, int] | None:
    """Конвертирует src в .webp. Возвращает (old_bytes, new_bytes) или None если уже есть webp."""
    dst = src.with_suffix(".webp")
    if dst.exists():
        return None  # уже есть webp-вариант — пропускаем
    old_bytes = src.stat().st_size
    try:
        with Image.open(src) as im:
            # JPEG → RGB; PNG с альфой оставляем RGBA
            if src.suffix.lower() in {".jpg", ".jpeg"}:
                im = im.convert("RGB")
            elif im.mode == "P":
                im = im.convert("RGBA" if "transparency" in im.info else "RGB")
            im.save(dst, "WEBP", quality=80, method=6)
    except Exception as e:
        print(f"  ! Oshibka {src.name}: {e}")
        if dst.exists():
            dst.unlink()
        return None
    new_bytes = dst.stat().st_size
    src.unlink()  # удаляем исходник
    return old_bytes, new_bytes


def main() -> int:
    targets: list[Path] = []
    for path in WEBAPP.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if path.stat().st_size < MIN_SIZE:
            continue
        targets.append(path)

    targets.sort(key=lambda p: p.stat().st_size, reverse=True)
    print(f"Naydeno {len(targets)} faylov > 50 KB dlya konvertatsii\n")

    total_old = total_new = 0
    converted = 0
    for src in targets:
        result = convert_one(src)
        if result is None:
            print(f"  ~ skip {src.relative_to(WEBAPP)}")
            continue
        old_b, new_b = result
        total_old += old_b
        total_new += new_b
        converted += 1
        ratio = new_b / old_b * 100
        print(
            f"  + {src.relative_to(WEBAPP)}: "
            f"{old_b/1024:>6.1f} KB -> {new_b/1024:>6.1f} KB ({ratio:.0f}%)"
        )

    print()
    print("=" * 60)
    print(f"Konvertirovano: {converted} iz {len(targets)}")
    print(
        f"Summarno: {total_old/1024/1024:.2f} MB -> "
        f"{total_new/1024/1024:.2f} MB "
        f"({100*total_new/max(total_old,1):.0f}% ot iskhodnogo)"
    )
    print(f"Sekonomleno: {(total_old-total_new)/1024/1024:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
