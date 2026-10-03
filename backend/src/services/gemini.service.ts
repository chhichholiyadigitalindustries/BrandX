/**
 * BRANDX — Centralized Server-Side Google Gemini AI Service
 * Powered by the official Google GenAI SDK (@google/genai).
 * The API key is securely isolated on the server and NEVER exposed to the browser.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { BRANDX_SYSTEM_INSTRUCTION } from '../ai/prompts/system.instruction.js';

export interface GeminiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
  timeoutMs?: number;
}

export interface GeminiGenerateResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  model: string;
  durationMs: number;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private model: string;
  private defaultTimeoutMs: number;
  private defaultMaxTokens: number;

  constructor() {
    this.model = this.normalizeModel(config.gemini.model);
    this.defaultTimeoutMs = config.gemini.timeoutMs || 30000;
    this.defaultMaxTokens = config.gemini.maxOutputTokens || 2048;

    if (this.isConfigured()) {
      try {
        this.client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
      } catch (err: any) {
        logger.error('Failed to initialize GoogleGenAI client:', err?.message);
      }
    }
  }

  /**
   * Normalizes legacy or unconfigured model names to production-compatible gemini-3.8-flash
   */
  public normalizeModel(modelName?: string): string {
    const trimmed = modelName?.trim();
    if (
      !trimmed ||
      trimmed === 'gemini-2.5-flash' ||
      trimmed === 'gemini-2.5' ||
      trimmed === 'gemini-1.5-flash' ||
      trimmed === 'gemini-pro' ||
      trimmed.startsWith('gemini-2.5')
    ) {
      return 'gemini-3.8-flash';
    }
    return trimmed;
  }

  /**
   * Checks if Gemini server API key is configured
   */
  public isConfigured(): boolean {
    const key = config.gemini.apiKey;
    return Boolean(key && key.trim().length > 10 && !key.includes('placeholder') && !key.includes('your_gemini_api_key'));
  }

  /**
   * Returns current active model name
   */
  public getModelName(): string {
    return this.model;
  }

  /**
   * Generates text from Gemini with timeout protection and retry on transient errors
   */
  public async generateText(options: GeminiGenerateOptions): Promise<GeminiGenerateResult> {
    if (!this.isConfigured()) {
      const err: any = new Error('AI Provider is not configured on the server. Please set GEMINI_API_KEY.');
      err.code = 'AI_PROVIDER_UNCONFIGURED';
      err.status = 503;
      throw err;
    }

    const client = this.client || new GoogleGenAI({ apiKey: config.gemini.apiKey });
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = 2;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            const timeoutErr: any = new Error(`AI Provider request timed out after ${timeoutMs}ms.`);
            timeoutErr.code = 'AI_TIMEOUT';
            timeoutErr.status = 504;
            reject(timeoutErr);
          }, timeoutMs);

          if (typeof timer.unref === 'function') timer.unref();
        });

        const callPromise = client.models.generateContent({
          model: this.model,
          contents: options.prompt,
          config: {
            systemInstruction: options.systemInstruction || BRANDX_SYSTEM_INSTRUCTION,
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens || this.defaultMaxTokens,
            responseMimeType: options.responseMimeType || 'text/plain',
          },
        });

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        const durationMs = Date.now() - startTime;

        const text = response?.text || '';
        const usage = response?.usageMetadata || null;

        const inputTokens = typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : null;
        const outputTokens = typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null;
        const totalTokens = typeof usage?.totalTokenCount === 'number' ? usage.totalTokenCount : null;

        return {
          text: text.trim(),
          inputTokens,
          outputTokens,
          totalTokens,
          model: this.model,
          durationMs,
        };
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode || 500;
        const isTransient = status === 503 || status === 502 || err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET';

        // Do not retry on client errors, auth failures, or timeout
        if (!isTransient || attempt > maxRetries) {
          break;
        }

        // Exponential backoff: 500ms, 1000ms
        const delay = attempt * 500;
        logger.warn(`Transient error in Gemini call (attempt ${attempt}/${maxRetries}): ${err?.message}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.error('Gemini generation failed:', lastError?.message);
    const sanitizedError: any = new Error(
      lastError?.code === 'AI_TIMEOUT'
        ? 'AI request timed out. Please try again with a shorter prompt.'
        : lastError?.status === 429
        ? 'AI Provider rate limit reached. Please wait a moment and try again.'
        : lastError?.status === 401 || lastError?.status === 403
        ? 'AI Provider authentication failed on server.'
        : 'AI generation failed due to a provider error.'
    );
    sanitizedError.code = lastError?.code || 'AI_EXECUTION_FAILED';
    sanitizedError.status = lastError?.status || 502;
    throw sanitizedError;
  }

  /**
   * Generates structured JSON from Gemini validated against a Zod schema
   */
  public async generateStructuredJson<T>(
    options: Omit<GeminiGenerateOptions, 'responseMimeType'>,
    schema: z.ZodSchema<T>
  ): Promise<{ data: T; usage: GeminiGenerateResult }> {
    const result = await this.generateText({
      ...options,
      responseMimeType: 'application/json',
    });

    let rawText = result.text.trim();
    // Strip possible markdown fences if returned
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr: any) {
      logger.error('Failed to parse Gemini output as JSON:', rawText.substring(0, 200));
      const err: any = new Error('AI Provider returned malformed JSON response.');
      err.code = 'AI_MALFORMED_OUTPUT';
      err.status = 502;
      throw err;
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      logger.error('Gemini structured output failed Zod schema validation:', validation.error.format());
      const err: any = new Error('AI output did not match expected structure.');
      err.code = 'AI_VALIDATION_FAILED';
      err.status = 502;
      err.details = validation.error.format();
      throw err;
    }

    return {
      data: validation.data,
      usage: result,
    };
  }
}

export const geminiService = new GeminiService();
