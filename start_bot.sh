#!/bin/bash

echo "========================================"
echo "   ZEN DUEL ARENA BOT LAUNCHER"
echo "========================================"
echo "🔧 Умный запуск с автоматической очисткой"
echo

# Проверяем Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден!"
    echo "📝 Установите Python с https://python.org"
    exit 1
fi

# Проверяем psutil
python3 -c "import psutil" &> /dev/null
if [ $? -ne 0 ]; then
    echo "📦 Установка psutil..."
    pip3 install psutil
    if [ $? -ne 0 ]; then
        echo "❌ Не удалось установить psutil"
        exit 1
    fi
fi

# Запускаем умный лаунчер
python3 launcher.py

echo
echo "Бот остановлен. Нажмите Enter для выхода..."
read
