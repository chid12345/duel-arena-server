"""
Простой лаунчер для ZenDuelArena Bot
Без сложных зависимостей
"""

import os
import sys
import subprocess
import requests

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from config import BOT_TOKEN

def kill_python_processes():
    """Закрыть все Python процессы простым методом"""
    print("🔍 Закрытие старых процессов бота...")
    
    try:
        if sys.platform == 'win32':
            # Windows вариант
            result = subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ Процессы Python закрыты")
            else:
                print("⚠️ Процессы не найдены или уже закрыты")
        else:
            # Linux/Mac вариант
            result = subprocess.run(['pkill', '-f', 'python'], 
                                  capture_output=True, text=True)
            print("✅ Процессы Python закрыты")
            
    except Exception as e:
        print(f"⚠️ Ошибка при закрытии процессов: {e}")
    
    # Пауза для завершения
    import time
    time.sleep(2)

def reset_webhook():
    """Сбросить вебхук бота"""
    print("🔄 Сброс вебхука...")
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('ok'):
            print("✅ Вебхук сброшен")
            return True
        else:
            print(f"❌ Ошибка сброса вебхука: {data}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

def check_bot_info():
    """Проверить информацию о боте"""
    print("🤖 Проверка бота...")
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('ok'):
            bot_info = data.get('result', {})
            print(f"✅ Бот: @{bot_info.get('username')}")
            print(f"🔗 Ссылка: https://t.me/{bot_info.get('username')}")
            return True
        else:
            print(f"❌ Ошибка: {data}")
            return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def start_main_bot():
    """Запустить основного бота"""
    print("🚀 Запуск бота...")
    
    try:
        # Запускаем бота
        process = subprocess.Popen(
            [sys.executable, 'main.py'],
            cwd=os.getcwd()
        )
        
        print(f"✅ Бот запущен с PID: {process.pid}")
        print("=" * 50)
        print("🎉 ZEN DUEL ARENA BOT ЗАПУЩЕН!")
        print("=" * 50)
        print("🤖 Отправьте /start боту @ZenDuelArena_bot")
        print("🔗 Прямая ссылка: https://t.me/ZenDuelArena_bot")
        print("=" * 50)
        print("💡 Для остановки нажмите Ctrl+C")
        print("=" * 50)
        
        # Ждем завершения процесса
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Остановка бота...")
        if 'process' in locals():
            process.terminate()
        print("✅ Бот остановлен")
    except Exception as e:
        print(f"❌ Ошибка запуска: {e}")

def main():
    """Главная функция"""
    print("=" * 50)
    print("🤖 ZEN DUEL ARENA BOT LAUNCHER")
    print("=" * 50)
    
    # Проверяем токен
    if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
        print("❌ Токен не установлен!")
        input("Нажмите Enter для выхода...")
        return
    
    # Шаг 1: Закрыть процессы
    print("\n📋 ШАГ 1: Очистка")
    kill_python_processes()
    
    # Шаг 2: Сбросить вебхук
    print("\n📋 ШАГ 2: Вебхук")
    reset_webhook()
    
    # Шаг 3: Проверить бота
    print("\n📋 ШАГ 3: Проверка")
    check_bot_info()
    
    # Шаг 4: Запуск
    print("\n📋 ШАГ 4: Запуск")
    start_main_bot()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Лаунчер остановлен")
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        input("Нажмите Enter для выхода...")
