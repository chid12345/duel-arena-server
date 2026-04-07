# Duel Arena Roadmap

## Stage 1 - Project Hygiene (in progress)
- [x] Remove unsafe token fallback from code.
- [x] Clean `requirements.txt` (external dependencies only).
- [x] Update README commands for Windows PowerShell.
- [x] Add `.env.example`.
- [x] Add `PRODUCTION_CHECKLIST.md`.

## Stage 2 - Reliability and Safety
- [x] Add global Telegram error handler.
- [x] Add anti-flood rate limits per user.
- [x] Add graceful retry/backoff for Telegram API calls.
- [x] Add battle state guards against duplicate button presses.

## Stage 3 - Metrics and Observability
- [x] Add structured logs for commands and battle lifecycle.
- [x] Add metrics table for DAU, battles/hour, avg battle duration.
- [x] Add admin command to inspect basic runtime health.

## Stage 4 - Data Layer for Scale
- [x] Design migration plan from SQLite to PostgreSQL.
- [x] Add indexes for hot queries.
- [x] Introduce migrations (Alembic or equivalent).

## Stage 5 - Gameplay Improvements
- [ ] Rebalance economy using collected metrics.
- [ ] Add leagues/seasons.
- [x] Add daily quests and retention mechanics.
