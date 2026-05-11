"""
Claude-агент с tool-use циклом для управления проектом duel-arena-server.
"""
import anthropic
from .tools import TOOL_SCHEMAS, execute_tool

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 4096

SYSTEM_PROMPT = """Ты — ассистент разработчика проекта duel-arena-server (Telegram PvP-игра на Python).
У тебя есть инструменты для чтения/записи файлов проекта и запуска команд.

Правила проекта (обязательны):
- Файлы ≤200 строк (аварийный порог 300 → немедленно делить)
- После каждой правки кода: поднять version.py + GAME_VERSION (+0.01) + git commit + git push origin HEAD:main
- Импорты: config → db_core → db_schema → repositories → database → battle_system → handlers
- Нет мёртвого кода, нет закомментированных блоков
- Новая тема/механика → отдельный модуль (не добавлять в чужой файл)

Формат ответа после изменений: "Готово: <что сделано>. version.py X→Y, GAME_VERSION A→B. Запушено."

При анализе сначала читай нужные файлы, потом делай выводы. Отвечай кратко и по делу."""

# session_id → list of messages
_sessions: dict[str, list] = {}


def get_session(session_id: str) -> list:
    return _sessions.setdefault(session_id, [])


def reset_session(session_id: str) -> None:
    _sessions[session_id] = []


def handle(session_id: str, user_text: str, api_key: str) -> str:
    """Обрабатывает сообщение пользователя, возвращает текст ответа."""
    client = anthropic.Anthropic(api_key=api_key)
    messages = get_session(session_id)
    messages.append({"role": "user", "content": user_text})

    for _ in range(10):  # максимум 10 итераций tool-use
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOL_SCHEMAS,
            messages=messages,
        )

        # Добавляем ответ ассистента в историю
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            # Финальный текстовый ответ
            text_parts = [b.text for b in response.content if hasattr(b, "text")]
            return "\n".join(text_parts) or "(пустой ответ)"

        if response.stop_reason != "tool_use":
            return f"Неожиданная причина остановки: {response.stop_reason}"

        # Выполняем все вызовы инструментов
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result = execute_tool(block.name, block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result,
            })

        messages.append({"role": "user", "content": tool_results})

    return "Превышен лимит итераций tool-use (10)."
