# SQLite to PostgreSQL Migration Plan

## Goal
Move from local SQLite to PostgreSQL without downtime for users and without data loss.

## Phase 1 - Preparation
- Keep current SQLite flow stable (done).
- Add indexes and migration tracking (done).
- Freeze schema changes during migration window.

## Phase 2 - PostgreSQL Environment
- Provision PostgreSQL instance.
- Create dedicated database/user with least privileges.
- Configure connection string via environment variable (`DATABASE_URL`).

## Phase 3 - Schema Port
- Export current SQLite schema and map to PostgreSQL types:
  - `INTEGER PRIMARY KEY AUTOINCREMENT` -> `BIGSERIAL PRIMARY KEY`
  - `BOOLEAN` -> `BOOLEAN`
  - `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` -> `TIMESTAMP DEFAULT NOW()`
- Recreate indexes and constraints in PostgreSQL.

## Phase 4 - Data Migration
- Stop writes briefly (maintenance window) or switch bot to read-only mode.
- Export data from SQLite tables (`players`, `improvements`, `inventory`, `bots`, `battles`, `achievements`, `daily_bonuses`, `metric_events`).
- Import data into PostgreSQL in dependency order.
- Validate row counts and checksums per table.

## Phase 5 - App Cutover
- Add PostgreSQL adapter layer in `database.py` (or move to SQLAlchemy).
- Switch runtime to PostgreSQL by setting `DATABASE_URL`.
- Run smoke tests:
  - `/start`
  - `/stats`
  - battle start/end
  - `/health`

## Phase 6 - Post-Cutover Validation
- Monitor errors and latency for 24-48 hours.
- Verify DAU and battle metrics continue to populate.
- Keep SQLite snapshot backup for rollback.

## Rollback Plan
- Keep immutable backup of `duel_arena.db` before cutover.
- If severe issues occur, restore previous deployment and SQLite DB.
