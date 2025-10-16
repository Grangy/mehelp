import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { config } from './config';
import { logger } from './utils/logger';
import { ChatMessage } from './utils/context';

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      generationConfig: {
        maxOutputTokens: config.gemini.maxTokens,
        temperature: config.gemini.temperature,
      },
    });
  }

  async generateResponse(
    messages: ChatMessage[],
    userMemory?: any,
    imageData?: Buffer
  ): Promise<GeminiResponse> {
    try {
      const startTime = Date.now();
      
      // Prepare the conversation history
      const conversationHistory = this.prepareConversationHistory(messages, userMemory);
      
      // Start a chat session
      const chat = this.model.startChat({
        history: conversationHistory,
      });

      // Prepare the current message
      let currentMessage: string;
      if (imageData && config.bot.enableImageRecognition) {
        // For multimodal requests with images
        const imagePart = {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/jpeg',
          },
        };
        
        const textPart = messages[messages.length - 1]?.content || '';
        currentMessage = textPart;
        
        // Use generateContent for multimodal
        const result = await this.model.generateContent([
          { text: currentMessage },
          imagePart,
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        const processingTime = Date.now() - startTime;
        logger.info('Gemini response generated', { 
          processingTime,
          responseLength: text.length,
          hasImage: true,
        });
        
        return { text };
      } else {
        // Text-only conversation
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
          throw new Error('No message to process');
        }
        
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        const text = response.text();
        
        const processingTime = Date.now() - startTime;
        logger.info('Gemini response generated', { 
          processingTime,
          responseLength: text.length,
          hasImage: false,
        });
        
        return { text };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Gemini API error', { error: errorMessage });
      throw new Error(`Ошибка при обращении к AI: ${errorMessage}`);
    }
  }

  private prepareConversationHistory(messages: ChatMessage[], userMemory?: any): any[] {
    const history: any[] = [];
    
    // Add system message with user memory if available
    let systemMessage = 'Ты — дружелюбный и умный AI-помощник. Помни контекст разговора и будь полезным.';
    
    if (userMemory && config.bot.enableUserMemory) {
      const memoryContext = this.buildMemoryContext(userMemory);
      if (memoryContext) {
        systemMessage += `\n\nКонтекст пользователя: ${memoryContext}`;
      }
    }
    
    // Add system message
    history.push({
      role: 'user',
      parts: [{ text: systemMessage }],
    });
    history.push({
      role: 'model',
      parts: [{ text: 'Понял! Я готов помочь и буду учитывать контекст нашего разговора.' }],
    });

    // Add conversation history (skip system messages)
    for (const message of messages) {
      if (message.role === 'system') continue;
      
      const role = message.role === 'user' ? 'user' : 'model';
      history.push({
        role,
        parts: [{ text: message.content }],
      });
    }
    
    return history;
  }

  private buildMemoryContext(userMemory: any): string {
    const contextParts: string[] = [];
    
    if (userMemory.interests && userMemory.interests.length > 0) {
      contextParts.push(`Интересы: ${userMemory.interests.join(', ')}`);
    }
    
    if (userMemory.goals && userMemory.goals.length > 0) {
      contextParts.push(`Цели: ${userMemory.goals.join(', ')}`);
    }
    
    if (userMemory.communicationStyle) {
      contextParts.push(`Стиль общения: ${userMemory.communicationStyle}`);
    }
    
    if (userMemory.preferences && Object.keys(userMemory.preferences).length > 0) {
      const prefs = Object.entries(userMemory.preferences)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      contextParts.push(`Предпочтения: ${prefs}`);
    }
    
    return contextParts.join('; ');
  }

  async analyzeImage(imageData: Buffer, prompt?: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };
      
      const textPrompt = prompt || 'Опиши что ты видишь на этом изображении. Будь подробным и полезным.';
      
      const result = await this.model.generateContent([
        { text: textPrompt },
        imagePart,
      ]);
      
      const response = await result.response;
      return response.text();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Image analysis error', { error: errorMessage });
      throw new Error(`Ошибка при анализе изображения: ${errorMessage}`);
    }
  }

  async analyzeUserIntent(message: string): Promise<{
    intent: string;
    emotion: string;
    urgency: 'low' | 'medium' | 'high';
    topics: string[];
  }> {
    try {
      const analysisPrompt = `
        Проанализируй следующее сообщение пользователя и определи:
        1. Намерение (intent): что хочет пользователь
        2. Эмоцию (emotion): какое настроение у пользователя
        3. Срочность (urgency): low, medium, high
        4. Темы (topics): какие темы затрагиваются
        
        Сообщение: "${message}"
        
        Ответь в формате JSON:
        {
          "intent": "...",
          "emotion": "...",
          "urgency": "low|medium|high",
          "topics": ["тема1", "тема2"]
        }
      `;
      
      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if JSON parsing fails
      return {
        intent: 'general',
        emotion: 'neutral',
        urgency: 'low',
        topics: ['общение'],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Intent analysis error', { error: errorMessage });
      return {
        intent: 'general',
        emotion: 'neutral',
        urgency: 'low',
        topics: ['общение'],
      };
    }
  }

  async generatePersonaResponse(message: string, persona: string): Promise<string> {
    try {
      const prompt = `
        Ты должен отвечать как: ${persona}
        
        Сообщение пользователя: ${message}
        
        Ответь в соответствии с заданной персоной, сохраняя полезность и дружелюбие.
      `;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Persona response error', { error: errorMessage });
      throw new Error(`Ошибка при генерации ответа с персоной: ${errorMessage}`);
    }
  }
}

export const geminiService = new GeminiService();
