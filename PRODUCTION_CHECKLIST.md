# Production Checklist

## Security
- Regenerate bot token in BotFather if it was ever stored in code.
- Keep `TELEGRAM_BOT_TOKEN` only in environment variables.
- Add `.env` to `.gitignore` if local env files are used.

## Runtime
- Create and activate virtual environment before install.
- Install dependencies: `pip install -r requirements.txt`.
- Verify startup: `python main.py`.

## Reliability
- Add global error handler for Telegram application.
- Add rate limiting / anti-flood per user.
- Add structured logging for commands and battle events.

## Database
- Backup `duel_arena.db` before updates.
- Plan migration path to PostgreSQL for high concurrency.
- Add indexes for frequently queried tables/columns.

## Operations
- Define restart strategy (service manager / supervisor).
- Set up alerts for crash loops and API failures.
- Track key metrics: DAU, battles/hour, average battle duration.
