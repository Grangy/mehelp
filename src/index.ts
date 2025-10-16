import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { config, validateConfig } from './config';
import { geminiService } from './gemini';
import { contextManager } from './utils/context';
import { logger, logUserMessage, logBotResponse, logError, logCommand } from './utils/logger';
import fs from 'fs/promises';

// Initialize bot function
async function initializeBot() {
  // Validate configuration
  if (!validateConfig()) {
    process.exit(1);
  }

  // Initialize bot
  const bot = new TelegramBot(config.telegram.token, { polling: true });

  // Load custom prompt
  let customPrompt: any = {};
  try {
    const promptData = await fs.readFile('./src/prompt.json', 'utf-8');
    customPrompt = JSON.parse(promptData);
  } catch (error) {
    logger.warn('Could not load custom prompt, using defaults');
  }

  // Initialize context manager
  await contextManager.initialize();

  // Bot commands and handlers
  const commands = {
    start: '/start - Начать поддержку',
    help: '/help - Показать справку',
    reset: '/reset - Начать заново',
    persona: '/persona <роль> - Изменить стиль общения',
    memory: '/memory - Показать прогресс',
    stats: '/stats - Статистика восстановления',
    support: '💬 Получить поддержку',
    sobriety: '🌿 Обсудить трезвость',
  };

  // Start command
  bot.onText(/\/start/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    try {
      await contextManager.getUserSession(chatId, userId, msg.from);
      
      const welcomeMessage = customPrompt.response_templates?.greeting || 
        'Привет, Максим 🌿 Я рад, что ты здесь. Как ты себя чувствуешь сегодня?';
      
      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Поддержка', callback_data: 'support' },
              { text: '🔄 Начать заново', callback_data: 'reset' }
            ],
            [
              { text: '🌿 Трезвость', callback_data: 'sobriety' },
              { text: '📊 Прогресс', callback_data: 'stats' }
            ]
          ]
        }
      });
      
      logCommand(userId, 'start');
    } catch (error) {
      logError(error as Error, 'start command');
      await bot.sendMessage(chatId, 'Произошла ошибка при инициализации. Попробуйте позже.');
    }
  });

  // Help command
  bot.onText(/\/help/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    const helpText = `
🌿 *Поддержка и помощь*

*Основные команды:*
${Object.values(commands).join('\n')}

*Как я могу помочь:*
• 💬 Эмоциональная поддержка и понимание
• 🌿 Мотивация к трезвости и восстановлению
• 🧠 Когнитивно-поведенческие техники
• 💭 Работа с чувством вины и утратой
• 😴 Помощь со сном и стрессом

*Просто напиши мне:*
• Как ты себя чувствуешь
• О своих переживаниях
• О тяге к алкоголю
• О проблемах со сном
• О любых трудностях

*Важно:* Я не заменяю врача, но всегда готов поддержать тебя 🙏
    `;
    
    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    logCommand(userId, 'help');
  });

  // Reset command
  bot.onText(/\/reset/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    try {
      await contextManager.clearHistory(userId);
      await bot.sendMessage(chatId, '🌿 Хорошо, Максим. Начинаем с чистого листа. Как ты себя чувствуешь сейчас?');
      logCommand(userId, 'reset');
    } catch (error) {
      logError(error as Error, 'reset command');
      await bot.sendMessage(chatId, 'Ошибка при очистке истории.');
    }
  });

  // Persona command
  bot.onText(/\/persona (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const persona = match?.[1];
    
    if (!userId || !persona) return;
    
    try {
      await contextManager.updateUserMemory(userId, {
        communicationStyle: persona
      });
      
      await bot.sendMessage(chatId, `✅ Роль изменена на: *${persona}*`, { 
        parse_mode: 'Markdown' 
      });
      logCommand(userId, 'persona', [persona]);
    } catch (error) {
      logError(error as Error, 'persona command');
      await bot.sendMessage(chatId, 'Ошибка при изменении роли.');
    }
  });

  // Memory command
  bot.onText(/\/memory/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    try {
      const memory = await contextManager.getUserMemory(userId);
      
      if (!memory) {
        await bot.sendMessage(chatId, 'Информация о пользователе не найдена.');
        return;
      }
      
      const memoryText = `
🧠 *Ваша память:*

*Интересы:* ${memory.interests.length > 0 ? memory.interests.join(', ') : 'не указаны'}
*Цели:* ${memory.goals.length > 0 ? memory.goals.join(', ') : 'не указаны'}
*Стиль общения:* ${memory.communicationStyle}
*Предпочтения:* ${Object.keys(memory.preferences).length > 0 ? 
        Object.entries(memory.preferences).map(([k, v]) => `${k}: ${v}`).join(', ') : 'не указаны'}
      `;
      
      await bot.sendMessage(chatId, memoryText, { parse_mode: 'Markdown' });
      logCommand(userId, 'memory');
    } catch (error) {
      logError(error as Error, 'memory command');
      await bot.sendMessage(chatId, 'Ошибка при получении информации.');
    }
  });

  // Stats command
  bot.onText(/\/stats/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    try {
      const stats = await contextManager.getStatistics();
      
      const statsText = `
📊 *Статистика бота:*

👥 Всего пользователей: ${stats.totalUsers}
💬 Всего сообщений: ${stats.totalMessages}
🕒 Последний сброс: ${new Date(stats.lastReset).toLocaleString('ru-RU')}
      `;
      
      await bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
      logCommand(userId, 'stats');
    } catch (error) {
      logError(error as Error, 'stats command');
      await bot.sendMessage(chatId, 'Ошибка при получении статистики.');
    }
  });

  // Handle text messages
  bot.on('message', async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;
    
    if (!userId || !text || text.startsWith('/')) return;
    
    try {
      // Log user message
      logUserMessage(userId, text);
      
      // Get or create user session
      const userSession = await contextManager.getUserSession(chatId, userId, msg.from);
      
      // Add user message to history
      await contextManager.addMessage(userId, {
        role: 'user',
        content: text,
        timestamp: Date.now(),
        messageType: 'text',
      });
      
      // Show typing indicator
      await bot.sendChatAction(chatId, 'typing');
      
      // Get user memory for context
      const userMemory = await contextManager.getUserMemory(userId);
      
      // Get conversation history
      const history = await contextManager.getHistory(userId);
      
      // Generate AI response
      const startTime = Date.now();
      const response = await geminiService.generateResponse(history, userMemory);
      const processingTime = Date.now() - startTime;
      
      // Add AI response to history
      await contextManager.addMessage(userId, {
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
      });
      
      // Send response with Markdown support
      const parseMode = config.bot.enableMarkdown ? 'Markdown' : undefined;
      await bot.sendMessage(chatId, response.text, { 
        parse_mode: parseMode,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👍', callback_data: 'like' },
              { text: '👎', callback_data: 'dislike' }
            ]
          ]
        }
      });
      
      // Log bot response
      logBotResponse(userId, response.text, processingTime);
      
    } catch (error) {
      logError(error as Error, 'text message handling');
      await bot.sendMessage(chatId, 'Извините, произошла ошибка. Попробуйте еще раз.');
    }
  });

  // Handle photo messages
  bot.on('photo', async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;
    
    try {
      // Get the largest photo
      const photo = msg.photo?.[msg.photo.length - 1];
      if (!photo) return;
      
      // Download photo
      const fileLink = await bot.getFileLink(photo.file_id);
      const response = await fetch(fileLink);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Log image message
      logUserMessage(userId, '[IMAGE]', 'image');
      
      // Get user session
      const userSession = await contextManager.getUserSession(chatId, userId, msg.from);
      
      // Show typing indicator
      await bot.sendChatAction(chatId, 'typing');
      
      // Analyze image
      const analysis = await geminiService.analyzeImage(imageBuffer);
      
      // Add to history
      await contextManager.addMessage(userId, {
        role: 'user',
        content: '[Изображение отправлено]',
        timestamp: Date.now(),
        messageType: 'image',
      });
      
      await contextManager.addMessage(userId, {
        role: 'assistant',
        content: analysis,
        timestamp: Date.now(),
      });
      
      // Send analysis
      await bot.sendMessage(chatId, `🖼️ *Анализ изображения:*\n\n${analysis}`, {
        parse_mode: 'Markdown'
      });
      
      logBotResponse(userId, analysis, 0);
      
    } catch (error) {
      logError(error as Error, 'photo handling');
      await bot.sendMessage(chatId, 'Ошибка при анализе изображения.');
    }
  });

  // Handle voice messages
  bot.on('voice', async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId || !config.bot.enableVoiceRecognition) return;
    
    try {
      // Download voice file
      const fileLink = await bot.getFileLink(msg.voice!.file_id);
      const response = await fetch(fileLink);
      const voiceBuffer = Buffer.from(await response.arrayBuffer());
      
      // Log voice message
      logUserMessage(userId, '[VOICE]', 'voice');
      
      // For now, just acknowledge the voice message
      // In a real implementation, you would use speech-to-text API
      await bot.sendMessage(chatId, '🎤 Голосовое сообщение получено! К сожалению, распознавание речи пока не настроено.');
      
    } catch (error) {
      logError(error as Error, 'voice handling');
      await bot.sendMessage(chatId, 'Ошибка при обработке голосового сообщения.');
    }
  });

  // Handle callback queries (inline buttons)
  bot.on('callback_query', async (callbackQuery: CallbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    if (!chatId || !data) return;
    
    try {
      switch (data) {
        case 'support':
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, '💬 Я здесь, чтобы поддержать тебя. Расскажи, как дела? Что беспокоит?');
          break;
          
        case 'reset':
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Начинаем заново 🌿' });
          await contextManager.clearHistory(userId);
          break;
          
        case 'sobriety':
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, '🌿 Каждый трезвый день — это победа. Как проходит твоя трезвость? Есть ли тяга?');
          break;
          
        case 'stats':
          await bot.answerCallbackQuery(callbackQuery.id);
          const stats = await contextManager.getStatistics();
          await bot.sendMessage(chatId, `📊 Твоя статистика: ${stats.totalMessages} сообщений поддержки. Каждый разговор — шаг к восстановлению 💪`);
          break;
          
        case 'like':
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Рад, что помог! 🙏' });
          break;
          
        case 'dislike':
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Понял, попробуем по-другому 💭' });
          break;
      }
    } catch (error) {
      logError(error as Error, 'callback query handling');
    }
  });

  // Error handling
  bot.on('error', (error: Error) => {
    logError(error, 'bot error');
  });

  bot.on('polling_error', (error: Error) => {
    logError(error, 'polling error');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down bot...');
    await bot.stopPolling();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down bot...');
    await bot.stopPolling();
    process.exit(0);
  });

  // Start the bot
  logger.info('🤖 Telegram bot started successfully!');
  logger.info(`📊 Configuration: ${config.gemini.model}, max history: ${config.bot.maxHistoryLength}`);

  // Cleanup inactive users every 24 hours
  setInterval(async () => {
    try {
      await contextManager.cleanupInactiveUsers(30);
    } catch (error) {
      logError(error as Error, 'cleanup task');
    }
  }, 24 * 60 * 60 * 1000);
}

// Start the bot
initializeBot().catch((error) => {
  logger.error('Failed to initialize bot', { error });
  process.exit(1);
});