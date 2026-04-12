# Система заданий v2 — TASKS

## Архитектура

```
db_schema/sqlite_migrations_part4.py   — таблицы task_progress, task_claims, login_streak_v2
repositories/quests/
  __init__.py                          — QuestsMixin (экспорт)
  definitions_achieve.py              — ACHIEVEMENT_DEFS (9 типов, до 9 уровней)
  definitions_tasks.py                — DAILY_QUEST_DEFS + WEEKLY_EXTRA_DEFS + LOGIN_STREAK_SETS
  progress_mixin.py                   — логика достижений, ежедневных и доп. недельных заданий
  streak_mixin.py                     — 7-дневный стрик входа
api/task_routes.py                    — /api/tasks/* эндпоинты
```

## DB-таблицы

### task_progress
- `(user_id, task_key)` PRIMARY KEY
- `value INTEGER` — накопленный счётчик
- Пример ключей: `ach_buy_gold`, `wq_buy_gold_2026-W18`, `wq_use_potions_2026-W18`

### task_claims
- `(user_id, claim_key)` PRIMARY KEY
- Пример ключей: `ach_battles_t1`, `dq_win3_2026-04-25`, `weekly_buy_gold_3_2026-W18`

### login_streak_v2
- `streak_day` (0–7): текущий день стрика; 0 = цикл завершён, ждёт нового
- `week_set` (0–3): номер набора наград (меняется при завершении каждого цикла)
- `last_login_date` TEXT: YYYY-MM-DD последнего входа
- `days_claimed_json` TEXT: JSON-массив номеров дней, уже полученных в текущем цикле

## Типы заданий

### 📅 Ежедневные (7 шт.)
Сброс каждый день. Трекаются через `daily_quests` (battles, wins, bot_wins, endless_wins, shop_buys)
и `players.win_streak`. Каждое забирается отдельно.

| Ключ | Цель | Трек |
|------|------|------|
| dq_play1 | 1 бой | battles |
| dq_play5 | 5 боёв | battles |
| dq_win3 | 3 победы | wins |
| dq_streak3 | серия 3 | streak |
| dq_bot2 | 2 победы над ботами | bot_wins |
| dq_buy1 | 1 покупка | shop_buys |
| dq_endless3 | 3 победы Натиск | endless |

### 📋 Недельные (5 старых + 4 новых)
Сброс каждый понедельник. Старые 5 — в `api/tma_weekly_quests.py`.
Новые 4 в `WEEKLY_EXTRA_DEFS`, трекаются через `task_progress`.

| Ключ | Цель |
|------|------|
| weekly_buy_gold_3 | 3 покупки за золото |
| weekly_use_potions_10 | 10 эликсиров |
| weekly_undefeated_5 | серия 5 побед |
| weekly_spend_gold_500 | потратить 500 золота |

### 🗓️ Стрик входа (7 дней)
4 набора наград (A/B/C/D). Набор меняется при каждом завершении 7-дневного цикла.
День 7 всегда содержит `box_rare` как финальную награду.

**Логика:**
1. `POST /api/tasks/login` → вызывается при открытии приложения → обновляет streak_day
2. `POST /api/tasks/claim_streak` `{day_num}` → выдаёт приз дня

**Сброс стрика:** если пропущен 1+ день → streak_day сбрасывается на 1

### 🏆 Достижения (13 типов, многоуровневые)

**Вычисляемые** (значение берётся напрямую из БД):
- `ach_battles` — бои (wins+losses из players), 4 уровня до 5000
- `ach_wins` — победы, 4 уровня до 2000
- `ach_level` — уровень, 5 уровней до 100
- `ach_tower` — этаж башни, 3 уровня до 50
- `ach_endless` — волна Натиска, 4 уровня до 50
- `ach_referrals` — рефералы, 3 уровня до 10

**Отслеживаемые** (через `task_progress`, инкрементируются хуками):
- `ach_buy_gold` — покупок за золото, 9 уровней до 1000
- `ach_buy_diamonds` — покупок за алмазы, 9 уровней до 500
- `ach_buy_premium` — покупок за USDT/Stars, 9 уровней до 250
- `ach_use_potions` — использовано эликсиров, 9 уровней до 1000
- `ach_use_scrolls` — использовано свитков, 9 уровней до 1000
- `ach_use_hp_small` — малых зелий здоровья, 5 уровней до 500
- `ach_spend_gold` — потрачено золота, 6 уровней до 15000
- `ach_spend_diamonds` — потрачено алмазов, 6 уровней до 2000

## Хуки трекинга

| Где | Метод | Что инкрементирует |
|-----|-------|--------------------|
| `shop_buy_handler.py` после покупки | `db.track_purchase(uid, iid, currency, price)` | ach_buy_*, ach_spend_*, wq_buy_gold, wq_spend_gold, daily shop_buys |
| `shop_apply_handler.py` при применении свитка | `db.track_item_use(uid, iid)` | ach_use_scrolls + wq_use_potions |
| `daily_quests.py` после боя | `update_daily_quest_progress(uid, won, is_bot)` | daily battles/wins/bot_wins |

## API-эндпоинты `/api/tasks/*`

| Метод | Путь | Тело / Параметры |
|-------|------|-----------------|
| POST | `/api/tasks/login` | `{init_data}` |
| GET | `/api/tasks/status` | `?init_data=…` |
| POST | `/api/tasks/claim_daily` | `{init_data, task_key}` |
| POST | `/api/tasks/claim_weekly_extra` | `{init_data, task_key}` |
| POST | `/api/tasks/claim_achievement` | `{init_data, quest_key, tier}` |
| POST | `/api/tasks/claim_streak` | `{init_data, day_num}` |

## UI — сцены (webapp)

```
scene_tasks.js           — главная сцена, 3 таба: Стрик / Задания / Достижения
scene_tasks_streak.js    — 7-дней стрик, отображение набора наград
scene_tasks_daily.js     — ежедневные задания
scene_tasks_weekly.js    — недельные задания (старые 5 + новые 4)
scene_tasks_achieve.js   — достижения с XP-шкалой прогресса
```

Вход: кнопка 📋 в главном меню (scene_menu.js, 6-й таб).
