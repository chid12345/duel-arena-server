"""
Инструменты для Claude-агента: чтение/запись файлов, запуск команд, поиск кода.
"""
import subprocess
import glob as _glob
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()

ALLOWED_COMMANDS = ("git", "python", "pytest", "py")

TOOL_SCHEMAS = [
    {
        "name": "read_file",
        "description": "Читает файл из проекта. Путь относительно корня проекта.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Путь к файлу (например: config/env_and_urls.py)"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Создаёт или перезаписывает файл. Путь относительно корня проекта.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Путь к файлу"},
                "content": {"type": "string", "description": "Новое содержимое файла"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_files",
        "description": "Список файлов в папке. Поддерживает glob-паттерны.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Папка или glob-паттерн (например: handlers/*.py)"},
            },
            "required": ["path"]
        }
    },
    {
        "name": "search_code",
        "description": "Поиск текста/паттерна в файлах проекта.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Строка или regex для поиска"},
                "path": {"type": "string", "description": "Папка или файл для поиска (по умолчанию — весь проект)"}
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "run_command",
        "description": "Запускает команду в корне проекта. Разрешены: git, python, pytest.",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Команда (например: git log -5 --oneline)"}
            },
            "required": ["command"]
        }
    }
]


def _safe_path(path: str) -> Path:
    resolved = (PROJECT_ROOT / path).resolve()
    if not str(resolved).startswith(str(PROJECT_ROOT)):
        raise ValueError(f"Путь вне проекта: {path}")
    return resolved


def read_file(path: str) -> str:
    try:
        p = _safe_path(path)
        return p.read_text(encoding="utf-8")
    except Exception as e:
        return f"Ошибка: {e}"


def write_file(path: str, content: str) -> str:
    try:
        p = _safe_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return f"Записано: {path} ({len(content)} символов)"
    except Exception as e:
        return f"Ошибка: {e}"


def list_files(path: str) -> str:
    try:
        pattern = str(PROJECT_ROOT / path)
        matches = _glob.glob(pattern, recursive=True)
        if not matches:
            p = _safe_path(path)
            if p.is_dir():
                matches = [str(f.relative_to(PROJECT_ROOT)) for f in p.iterdir()]
        rel = [str(Path(m).relative_to(PROJECT_ROOT)) for m in matches]
        return "\n".join(sorted(rel)) if rel else "Файлы не найдены"
    except Exception as e:
        return f"Ошибка: {e}"


def search_code(pattern: str, path: str = ".") -> str:
    try:
        search_path = _safe_path(path)
        matches = []
        files = list(search_path.rglob("*.py")) if search_path.is_dir() else [search_path]
        import re
        rx = re.compile(pattern, re.IGNORECASE)
        for f in files[:200]:
            try:
                lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
                for i, line in enumerate(lines, 1):
                    if rx.search(line):
                        rel = f.relative_to(PROJECT_ROOT)
                        matches.append(f"{rel}:{i}: {line.strip()}")
            except Exception:
                pass
        return "\n".join(matches[:50]) if matches else "Совпадений не найдено"
    except Exception as e:
        return f"Ошибка: {e}"


def run_command(command: str) -> str:
    parts = command.strip().split()
    if not parts:
        return "Пустая команда"
    if parts[0].lower() not in ALLOWED_COMMANDS:
        return f"Команда '{parts[0]}' не разрешена. Разрешены: {', '.join(ALLOWED_COMMANDS)}"
    try:
        result = subprocess.run(
            parts, cwd=PROJECT_ROOT, capture_output=True,
            text=True, encoding="utf-8", timeout=30
        )
        out = (result.stdout or "") + (result.stderr or "")
        return out[:3000] if out else "(нет вывода)"
    except subprocess.TimeoutExpired:
        return "Таймаут 30 сек"
    except Exception as e:
        return f"Ошибка: {e}"


def execute_tool(name: str, inputs: dict) -> str:
    if name == "read_file":
        return read_file(inputs["path"])
    if name == "write_file":
        return write_file(inputs["path"], inputs["content"])
    if name == "list_files":
        return list_files(inputs["path"])
    if name == "search_code":
        return search_code(inputs["pattern"], inputs.get("path", "."))
    if name == "run_command":
        return run_command(inputs["command"])
    return f"Неизвестный инструмент: {name}"
