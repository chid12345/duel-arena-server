"""WebP pass #2 — обновить ссылки в коде с .png/.jpg/.jpeg на .webp.

Для каждого .webp в webapp/ проверяет, нет ли в коде ссылок на одноимённый
.png/.jpg/.jpeg (которых уже нет на диске). Если есть — заменяет.

Запуск: python scripts/webp_pass2_refs.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"

# Файлы где могут быть ссылки
EXTS = {".js", ".css", ".html", ".py"}
SEARCH_DIRS = [WEBAPP]


def collect_webp_basenames() -> set[str]:
    """Возвращает имена webp-файлов БЕЗ расширения (с относительным путём от webapp/)."""
    names: set[str] = set()
    for p in WEBAPP.rglob("*.webp"):
        # Относительный путь от webapp/ — для поиска вида "skins/sila/1.webp"
        rel = p.relative_to(WEBAPP).as_posix()
        names.add(rel[:-5])  # без .webp
        # Также голое имя для коротких ссылок вида "rune_a.webp"
        names.add(p.stem)
    return names


def update_file(path: Path, webp_basenames: set[str]) -> int:
    """Возвращает количество замен в файле."""
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return 0
    original = text
    count = 0
    for base in webp_basenames:
        for ext in (".png", ".jpg", ".jpeg"):
            needle = f"{base}{ext}"
            if needle in text:
                new_text = text.replace(needle, f"{base}.webp")
                if new_text != text:
                    count += text.count(needle) - new_text.count(needle)
                    text = new_text
    if text != original:
        path.write_text(text, encoding="utf-8")
    return count


def main() -> int:
    webp_basenames = collect_webp_basenames()
    print(f"WebP-imen v webapp/: {len(webp_basenames)}")

    total_files = 0
    total_replaces = 0
    for d in SEARCH_DIRS:
        for path in d.rglob("*"):
            if not path.is_file() or path.suffix not in EXTS:
                continue
            n = update_file(path, webp_basenames)
            if n > 0:
                total_files += 1
                total_replaces += n
                print(f"  {path.relative_to(ROOT)}: {n} zamen")

    print()
    print(f"Itog: {total_replaces} ssylok v {total_files} faylakh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
