"""
Проверка информации о боте
"""

import requests
import sys
from config import BOT_TOKEN

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def check_bot_info():
    """Проверить информацию о боте"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        if data.get('ok'):
            bot_info = data.get('result', {})
            print("✅ Информация о боте:")
            print(f"🤖 ID: {bot_info.get('id')}")
            print(f"📝 Username: @{bot_info.get('username')}")
            print(f"👤 Имя: {bot_info.get('first_name')}")
            print(f"📋 Можно писать: {'Да' if bot_info.get('can_read_all_group_messages') else 'Нет'}")
            
            # Генерируем ссылку для поиска
            username = bot_info.get('username')
            print(f"\n🔗 Найти бота:")
            print(f"• В поиске Telegram: @{username}")
            print(f"• Прямая ссылка: https://t.me/{username}")
            
        else:
            print(f"❌ Ошибка получения информации: {data}")
            
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")

if __name__ == '__main__':
    check_bot_info()
