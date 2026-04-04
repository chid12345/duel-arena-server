"""
Умный лаунчер для ZenDuelArena Bot
Автоматически закрывает все процессы и запускает единственный экземпляр
"""

import os
import sys
import subprocess
import time
import requests
import psutil

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from config import BOT_TOKEN

def kill_python_processes():
    """Закрыть все Python процессы связанные с ботом"""
    print("🔍 Поиск процессов бота...")
    
    killed_count = 0
    
    try:
        # Ищем все Python процессы
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info['cmdline']
                if cmdline and any('python' in str(cmd).lower() for cmd in cmdline):
                    # Проверяем, связан ли процесс с нашим ботом
                    cmd_str = ' '.join(str(cmd) for cmd in cmdline)
                    if any(keyword in cmd_str.lower() for keyword in ['main.py', 'simple_start.py', 'duel-arena', 'zenbot']):
                        print(f"🔪 Убиваем процесс PID {proc.info['pid']}: {cmd_str[:50]}...")
                        proc.kill()
                        killed_count += 1
                        time.sleep(0.1)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
    except Exception as e:
        print(f"⚠️ Ошибка при поиске процессов: {e}")
    
    print(f"✅ Завершено процессов: {killed_count}")
    return killed_count

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
    print("🤖 Проверка информации о боте...")
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('ok'):
            bot_info = data.get('result', {})
            print(f"✅ Бот найден: @{bot_info.get('username')}")
            print(f"📝 Имя: {bot_info.get('first_name')}")
            print(f"🔗 Ссылка: https://t.me/{bot_info.get('username')}")
            return True
        else:
            print(f"❌ Ошибка получения информации: {data}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

def start_main_bot():
    """Запустить основного бота"""
    print("🚀 Запуск ZenDuelArena Bot...")
    
    try:
        # Запускаем бота в новом процессе
        process = subprocess.Popen(
            [sys.executable, 'main.py'],
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            bufsize=1,
            universal_newlines=True
        )
        
        print(f"✅ Бот запущен с PID: {process.pid}")
        print("📊 Логи бота:")
        print("-" * 50)
        
        # Выводим логи в реальном времени
        for line in process.stdout:
            print(line.rstrip())
            
            # Если бот успешно запущен, показываем информацию
            if "Application started" in line:
                print("\n" + "=" * 50)
                print("🎉 ZEN DUEL ARENA BOT УСПЕШНО ЗАПУЩЕН!")
                print("=" * 50)
                print("🤖 Бот готов к работе!")
                print("📝 Отправьте /start для начала")
                print("🔗 Ссылка: https://t.me/ZenDuelArena_bot")
                print("=" * 50)
                print("💡 Для остановки нажмите Ctrl+C")
                print("=" * 50)
        
        # Ждем завершения процесса
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Остановка бота пользователем...")
        if 'process' in locals():
            process.terminate()
        print("✅ Бот остановлен")
    except Exception as e:
        print(f"❌ Ошибка запуска бота: {e}")

def main():
    """Главная функция лаунчера"""
    print("=" * 60)
    print("🤖 ZEN DUEL ARENA BOT LAUNCHER")
    print("=" * 60)
    print("🔧 Умный запуск с автоматической очисткой процессов")
    print("=" * 60)
    
    # Проверяем токен
    if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
        print("❌ Токен бота не установлен!")
        print("📝 Установите переменную окружения TELEGRAM_BOT_TOKEN")
        print("💡 Или отредактируйте config.py")
        input("\nНажмите Enter для выхода...")
        return
    
    # Шаг 1: Закрыть все процессы
    print("\n📋 ШАГ 1: Очистка процессов")
    print("-" * 30)
    kill_python_processes()
    
    # Шаг 2: Сбросить вебхук
    print("\n📋 ШАГ 2: Сброс вебхука")
    print("-" * 30)
    if not reset_webhook():
        print("⚠️ Продолжаем без сброса вебхука...")
    
    # Шаг 3: Проверить бота
    print("\n📋 ШАГ 3: Проверка бота")
    print("-" * 30)
    if not check_bot_info():
        print("❌ Не удалось проверить бота, но продолжаем...")
    
    # Шаг 4: Запуск
    print("\n📋 ШАГ 4: Запуск бота")
    print("-" * 30)
    time.sleep(1)  # Пауза для завершения процессов
    
    start_main_bot()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Лаунчер остановлен")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        input("Нажмите Enter для выхода...")
