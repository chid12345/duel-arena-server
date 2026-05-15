.PHONY: test test-fast test-cov test-payments

# Полный прогон тестов
test:
	python -m pytest tests/ -v

# Быстрый прогон: остановка на первом fail, последние fail сначала
test-fast:
	python -m pytest tests/ -x --ff

# Покрытие кода (требует pytest-cov)
test-cov:
	python -m pytest tests/ --cov=repositories --cov=economy --cov=battle_system --cov-report=term-missing

# Только платежи (главный гарант перед запуском игры)
test-payments:
	python -m pytest tests/test_payments_stars.py tests/test_payments_crypto.py -v
