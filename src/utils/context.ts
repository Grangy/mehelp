import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  messageType?: 'text' | 'image' | 'voice';
}

export interface UserSession {
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  history: ChatMessage[];
  userMemory: {
    interests: string[];
    preferences: Record<string, any>;
    goals: string[];
    communicationStyle: string;
  };
  createdAt: number;
  lastActivity: number;
}

export interface DatabaseSchema {
  users: Record<number, UserSession>;
  statistics: {
    totalUsers: number;
    totalMessages: number;
    lastReset: number;
  };
}

class ContextManager {
  private dbPath: string;
  private data: DatabaseSchema | null = null;
  private isInitialized = false;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'db.json');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      // Try to read existing database
      try {
        const fileContent = await fs.readFile(this.dbPath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist or is corrupted, create new database
        this.data = {
          users: {},
          statistics: {
            totalUsers: 0,
            totalMessages: 0,
            lastReset: Date.now(),
          },
        };
        await this.save();
      }
      
      this.isInitialized = true;
      logger.info('Context manager initialized');
    } catch (error) {
      logger.error('Failed to initialize context manager', { error });
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.data) {
      throw new Error('Context manager not initialized');
    }
  }

  async getUserSession(chatId: number, userId: number, userInfo?: any): Promise<UserSession> {
    this.ensureInitialized();

    if (!this.data!.users[userId]) {
      const newSession: UserSession = {
        chatId,
        userId,
        username: userInfo?.username,
        firstName: userInfo?.first_name,
        lastName: userInfo?.last_name,
        history: [
          {
            role: 'system',
            content: 'Системное сообщение будет загружено из prompt.json',
            timestamp: Date.now(),
          },
        ],
        userMemory: {
          interests: ['эмоциональная поддержка', 'трезвость', 'восстановление'],
          preferences: {
            tone: 'доброжелательный, спокойный, уверенный, сочувствующий',
            style: 'на русском языке, простыми словами, с теплом',
            crisis_support: true
          },
          goals: ['поддержание трезвости', 'эмоциональное восстановление', 'управление депрессией'],
          communicationStyle: 'therapeutic_support',
        },
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.data!.users[userId] = newSession;
      this.data!.statistics.totalUsers++;
      await this.save();
      
      logger.info('New user session created', { userId, chatId });
    } else {
      // Update last activity
      this.data!.users[userId].lastActivity = Date.now();
      await this.save();
    }

    return this.data!.users[userId];
  }

  async addMessage(userId: number, message: ChatMessage): Promise<void> {
    this.ensureInitialized();

    const user = this.data!.users[userId];
    if (!user) {
      throw new Error('User session not found');
    }

    user.history.push(message);
    user.lastActivity = Date.now();

    // Auto-trim history if it exceeds max length
    if (user.history.length > config.bot.maxHistoryLength) {
      const systemMessage = user.history.find((msg: ChatMessage) => msg.role === 'system');
      const recentMessages = user.history.slice(-config.bot.maxHistoryLength + 1);
      
      user.history = systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    }

    this.data!.statistics.totalMessages++;
    await this.save();
  }

  async getHistory(userId: number): Promise<ChatMessage[]> {
    this.ensureInitialized();

    const user = this.data!.users[userId];
    return user ? user.history : [];
  }

  async clearHistory(userId: number): Promise<void> {
    this.ensureInitialized();

    const user = this.data!.users[userId];
    if (user) {
      user.history = [
        {
          role: 'system',
          content: 'Системное сообщение будет загружено из prompt.json',
          timestamp: Date.now(),
        },
      ];
      await this.save();
      
      logger.info('History cleared for user', { userId });
    }
  }

  async updateUserMemory(userId: number, memory: Partial<UserSession['userMemory']>): Promise<void> {
    this.ensureInitialized();

    const user = this.data!.users[userId];
    if (user) {
      user.userMemory = { ...user.userMemory, ...memory };
      await this.save();
      
      logger.info('User memory updated', { userId, memory });
    }
  }

  async getUserMemory(userId: number): Promise<UserSession['userMemory'] | null> {
    this.ensureInitialized();

    const user = this.data!.users[userId];
    return user ? user.userMemory : null;
  }

  async getStatistics(): Promise<DatabaseSchema['statistics']> {
    this.ensureInitialized();

    return this.data!.statistics;
  }

  async cleanupInactiveUsers(daysInactive: number = 30): Promise<void> {
    this.ensureInitialized();

    const cutoffTime = Date.now() - (daysInactive * 24 * 60 * 60 * 1000);
    const inactiveUserIds = Object.entries(this.data!.users)
      .filter(([_, user]) => user.lastActivity < cutoffTime)
      .map(([userId, _]) => parseInt(userId));

    for (const userId of inactiveUserIds) {
      delete this.data!.users[userId];
    }

    if (inactiveUserIds.length > 0) {
      await this.save();
      logger.info('Cleaned up inactive users', { count: inactiveUserIds.length });
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error('Failed to save database', { error });
      throw error;
    }
  }
}

export const contextManager = new ContextManager();