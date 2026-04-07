"""
database.py — точка входа.
Database собирается из отдельных модулей через множественное наследование (Mixin-архитектура).
Внешний код работает как прежде: from database import db; db.method()

Читать/редактировать по темам:
  db_core.py                  — подключение, SQL-адаптер SQLite↔PostgreSQL
  db_schema.py                — CREATE TABLE, индексы, миграции
  repositories/users.py       — игрок, HP, бонусы, улучшения, Premium
  repositories/bots.py        — боты, ребаланс, matchmaking
  repositories/battles.py     — бои, квесты, PvP очередь/вызовы
  repositories/game_logic.py  — Башня Титанов
  repositories/endless.py     — Натиск (волны, попытки, квесты, топ)
  repositories/leaderboard.py — PvP/Titan топы, недельные выплаты
  repositories/shop.py        — магазин, сезоны, Battle Pass
  repositories/social.py      — кланы, рефералы, Stars/Crypto платежи
"""

from db_core import DBCore, iso_week_key_utc, prev_iso_week_bounds_utc, weekly_pvp_rank_reward, weekly_titan_rank_reward
from db_schema import DBSchema
from repositories.users import UsersMixin
from repositories.bots import BotsMixin
from repositories.battles import BattlesMixin
from repositories.game_logic import GameLogicMixin
from repositories.endless import EndlessMixin
from repositories.leaderboard import LeaderboardMixin
from repositories.shop import ShopMixin
from repositories.social import SocialMixin


class Database(
    DBCore,
    DBSchema,
    BotsMixin,
    UsersMixin,
    BattlesMixin,
    GameLogicMixin,
    EndlessMixin,
    LeaderboardMixin,
    ShopMixin,
    SocialMixin,
):
    def __init__(self):
        DBCore.__init__(self)
        self.init_database()


# Глобальный экземпляр — все модули импортируют отсюда
db = Database()
