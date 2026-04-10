## ARCHITECTURE — Duel Arena Server

Справка. Читать только когда задача про структуру, куда класть код, БД, импорты, распил.

## Карта проекта (кратко)
- `repositories/`: вся работа с БД (SQL, транзакции, выборки).
- `handlers/`: весь Telegram UI (команды/кнопки/колбэки).
- `api_server.py`: FastAPI для Mini App.
- `battle_system.py`: механика боя (ядро).
- `config/`: всё настраиваемое (константы/формулы; модули ≤200 строк).
- `db_schema.py`: DDL и миграции (без бизнес-логики).
- `database.py`: точка сборки Database (только импорты миксинов + `db = Database()`).

## Куда добавлять новый код (матрица)
- **Новая таблица/индекс/миграция** → `db_schema.py`
- **Запросы к БД** → новый/существующий `repositories/<тема>.py`
- **Telegram команда (/xxx)** → пакет `handlers/commands/` (миксины ≤200 строк)
- **Telegram кнопка (callback)** → `handlers/*` по теме
- **API эндпоинт (Mini App)** → пакет `api/<тема>/` (регистрация из `api/tma_wire_*.py`) или точечно в `api_server.py`
- **Константы/формулы** → пакет `config/`

## Порядок импортов (слои)
Цепочка: `config/progression_loader → db_core → db_schema → repositories → database → battle_system → handlers/api_server`.
Правило: модуль не импортирует “вверх по цепочке”.

## Репозитории (Mixin-паттерн)
Формат:

```python
class SomeFeatureMixin:
    def method(self, ...):
        conn = self.get_connection()
        ...
        conn.close()
```

Подключение: импорт миксина в `database.py` и добавление в `class Database(...)`.

## SQL правила (коротко)
- Плейсхолдеры: всегда `?`
- Имена: `snake_case`
- Каждый метод сам открывает/закрывает соединение
- Атомарные операции: одна транзакция + `conn.commit()`

## Чеклист “новая система”
- Нужна таблица → миграция в `db_schema.py`
- Новый модуль БД → `repositories/<система>.py` (Mixin)
- Подключить миксин в `database.py`
- UI/кнопки → `handlers/`
- API → `api_server.py` / `api/*_routes.py`
- Smoke-тест: `python -c "from database import db; from handlers import BotHandlers"`

## Скрипты и офлайн-утилиты
- **Таблица прогрессии XLSX** — пакет `_make_xlsx/`. Из корня репозитория: `python -m _make_xlsx` (нужен `openpyxl`). Результат: `progression_100_levels_v4/progression_100_levels_v4.xlsx`.
- **Симуляция баланса (игрок vs бот)** — пакет `balance_simulation/`, точка входа `tools/simulate_balance.py`. Из корня: `python tools/simulate_balance.py -n 500` (нужна БД с записями в `bots`).
