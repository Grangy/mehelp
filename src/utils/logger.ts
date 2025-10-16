import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (config.logging.enableFileLogging) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.logFile,
      format: logFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
});

export const logUserMessage = (userId: number, message: string, type: 'text' | 'image' | 'voice' = 'text') => {
  logger.info('User message', {
    userId,
    message: type === 'text' ? message : `[${type.toUpperCase()}]`,
    type,
  });
};

export const logBotResponse = (userId: number, response: string, processingTime: number) => {
  logger.info('Bot response', {
    userId,
    response: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
    processingTime: `${processingTime}ms`,
  });
};

export const logError = (error: Error, context?: string) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context,
  });
};

export const logCommand = (userId: number, command: string, args?: string[]) => {
  logger.info('Command executed', {
    userId,
    command,
    args,
  });
};
