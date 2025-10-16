import dotenv from 'dotenv';

dotenv.config();

export interface BotConfig {
  telegram: {
    token: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  bot: {
    maxHistoryLength: number;
    maxResponseLength: number;
    enableImageRecognition: boolean;
    enableVoiceRecognition: boolean;
    enableMarkdown: boolean;
    enableUserMemory: boolean;
  };
  logging: {
    level: string;
    enableFileLogging: boolean;
    logFile: string;
  };
}

export const config: BotConfig = {
  telegram: {
    token: process.env.TG_TOKEN || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
  },
  bot: {
    maxHistoryLength: parseInt(process.env.MAX_HISTORY_LENGTH || '30'),
    maxResponseLength: parseInt(process.env.MAX_RESPONSE_LENGTH || '2000'),
    enableImageRecognition: process.env.ENABLE_IMAGE_RECOGNITION === 'true',
    enableVoiceRecognition: process.env.ENABLE_VOICE_RECOGNITION === 'true',
    enableMarkdown: process.env.ENABLE_MARKDOWN !== 'false',
    enableUserMemory: process.env.ENABLE_USER_MEMORY !== 'false',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logFile: process.env.LOG_FILE || 'bot.log',
  },
};

export const validateConfig = (): boolean => {
  if (!config.telegram.token) {
    console.error('❌ TG_TOKEN не найден в переменных окружения');
    return false;
  }
  
  if (!config.gemini.apiKey) {
    console.error('❌ GEMINI_API_KEY не найден в переменных окружения');
    return false;
  }
  
  return true;
};
