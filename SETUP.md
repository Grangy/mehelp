# 🚀 Настройка Telegram Бота

## 1. Создание .env файла

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# Telegram Bot Token (получите у @BotFather)
TG_TOKEN=your_telegram_bot_token_here

# Google Gemini API Key (получите в Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Дополнительные настройки (опционально)
NODE_ENV=development
LOG_LEVEL=info
MAX_HISTORY_LENGTH=20
MAX_RESPONSE_LENGTH=4000
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=4000
GEMINI_TEMPERATURE=0.7
ENABLE_IMAGE_RECOGNITION=true
ENABLE_VOICE_RECOGNITION=false
ENABLE_MARKDOWN=true
ENABLE_USER_MEMORY=true
ENABLE_FILE_LOGGING=true
LOG_FILE=bot.log
```

## 2. Получение токенов

### Telegram Bot Token:
1. Напишите [@BotFather](https://t.me/BotFather) в Telegram
2. Используйте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в `.env`

### Gemini API Key:
1. Перейдите в [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Создайте новый API ключ
3. Скопируйте ключ в `.env`

## 3. Запуск

```bash
# Установка зависимостей
npm install

# Режим разработки
npm run dev

# Продакшн режим
npm run build
npm start
```

## 4. Проверка работы

После запуска бота:
1. Найдите вашего бота в Telegram
2. Отправьте команду `/start`
3. Проверьте логи в консоли
