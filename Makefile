.PHONY: test test-fast test-cov test-payments balance-check balance-export

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

# Проверка консистентности калькулятора и balance_curve.json (Этап 1).
# Падает с exit 1 если кто-то поправил CONFIG в balance_xlsx_export.py
# и забыл перезапустить экспорт. Безопасно для CI — ничего не пишет.
balance-check:
	python -m tools.balance_xlsx_export --check

# Перегенерировать balance_curve.json и xlsx из CONFIG (Этап 1).
# Запускать после правки CONFIG в tools/balance_xlsx_export.py.
balance-export:
	python -m tools.balance_xlsx_export
