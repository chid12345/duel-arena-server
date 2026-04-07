"""
Сброс вебхука для бота
"""

import requests
import sys
from config import BOT_TOKEN

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def reset_webhook():
    """Сбросить вебхук бота"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        if data.get('ok'):
            print("✅ Вебхук успешно сброшен!")
            print(f"Результат: {data}")
        else:
            print(f"❌ Ошибка сброса вебхука: {data}")
            
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")

if __name__ == '__main__':
    reset_webhook()
