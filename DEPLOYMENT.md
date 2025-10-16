# 🚀 Развертывание MeHelp Bot

## 📋 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/Grangy/mehelp.git
cd mehelp
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
Создайте файл `.env`:
```env
# Telegram Bot Token (получите у @BotFather)
TG_TOKEN=your_telegram_bot_token_here

# Google Gemini API Key (получите в Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Дополнительные настройки
NODE_ENV=production
LOG_LEVEL=info
MAX_HISTORY_LENGTH=30
MAX_RESPONSE_LENGTH=2000
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=4000
GEMINI_TEMPERATURE=0.7
ENABLE_IMAGE_RECOGNITION=true
ENABLE_VOICE_RECOGNITION=false
ENABLE_MARKDOWN=true
ENABLE_USER_MEMORY=true
ENABLE_FILE_LOGGING=true
LOG_FILE=bot.log
```

### 4. Сборка и запуск
```bash
# Сборка TypeScript
npm run build

# Запуск в продакшене
npm start

# Или в режиме разработки
npm run dev
```

## 🔧 Получение токенов

### Telegram Bot Token
1. Напишите [@BotFather](https://t.me/BotFather) в Telegram
2. Используйте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в `.env`

### Gemini API Key
1. Перейдите в [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Создайте новый API ключ
3. Скопируйте ключ в `.env`

## 🌐 Развертывание на сервере

### VPS/Cloud Server
```bash
# Установка Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонирование и настройка
git clone https://github.com/Grangy/mehelp.git
cd mehelp
npm install
npm run build

# Создание systemd сервиса
sudo nano /etc/systemd/system/mehelp-bot.service
```

### Docker развертывание
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/prompt.json ./src/

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### PM2 для продакшена
```bash
npm install -g pm2
pm2 start dist/index.js --name "mehelp-bot"
pm2 startup
pm2 save
```

## 📊 Мониторинг

### Логи
```bash
# Просмотр логов
tail -f bot.log

# PM2 логи
pm2 logs mehelp-bot
```

### Статистика
```bash
# PM2 мониторинг
pm2 monit

# Системные ресурсы
htop
```

## 🔒 Безопасность

- Никогда не коммитьте `.env` файл
- Используйте сильные пароли для API ключей
- Регулярно обновляйте зависимости
- Настройте файрвол для сервера

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи бота
2. Убедитесь в корректности токенов
3. Проверьте статус API сервисов
4. Создайте issue в репозитории

---

**MeHelp Bot** - терапевтический AI-помощник для поддержки в депрессии и трезвости 🌿
