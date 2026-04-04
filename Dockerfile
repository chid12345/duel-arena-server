FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Шрифты с кириллицей для PIL (карточка профиля); без них — «квадратики» вместо букв
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x scripts/start_web_and_bot.sh

# Railway/Render задают PORT; health: GET /api/health
EXPOSE 8000
CMD ["./scripts/start_web_and_bot.sh"]
