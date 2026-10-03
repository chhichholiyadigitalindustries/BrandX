/**
 * BRANDX — Centralized Server-Side Google Gemini AI Service
 * Powered by the official Google GenAI SDK (@google/genai).
 * The API key is securely isolated on the server and NEVER exposed to the browser.
 * 
 * Production-Safe Resilience Features:
 * 1. Primary Model: gemini-3.8-flash
 * 2. Controlled Fallback Model: gemini-3.7-flash (stable workhorse, triggered only on transient 503/429)
 * 3. Bounded Exponential Backoff with Jitter: ~1s -> ~2s -> ~4s (max 8s)
 * 4. Strict Error Classification: retries ONLY transient errors (503, 502, 504, 500, 429, 408, network timeouts)
 * 5. Fail-Fast Non-Transient Errors: 400, 401, 403, 404, safety blocks NEVER retried
 * 6. Sanitized Client Errors: HTTP 503 "AI service is temporarily busy. Please try again in a moment."
 * 7. Zero Secret Leakage: API keys and sensitive tokens redacted from all logs and error messages.
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

export type GeminiCallFn = (
  targetModel: string,
  options: GeminiGenerateOptions,
  callConfig: any
) => Promise<any>;

/**
 * Sanitizes message strings to guarantee no server-side API keys or secrets leak in logs or errors
 */
export function sanitizeLogMessage(message?: string): string {
  if (!message) return '';
  let sanitized = String(message);
  const key = config?.gemini?.apiKey;
  if (key && key.length > 5) {
    sanitized = sanitized.replaceAll(key, '[REDACTED_API_KEY]');
  }
  // Redact potential raw API keys matching standard Google AI key pattern
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  return sanitized;
}

/**
 * Extracts a numeric HTTP status code from any error shape (object, nested error, JSON string message)
 */
export function extractErrorStatusCode(err: any): number | null {
  if (!err) return null;

  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.code === 'number') return err.code;

  // Inspect nested error object (common in @google/genai SDK error wrappers)
  if (typeof err.error?.code === 'number') return err.error.code;
  const nestedStatusStr = String(err.error?.status || '').toUpperCase();
  if (nestedStatusStr === 'UNAVAILABLE') return 503;
  if (nestedStatusStr === 'RESOURCE_EXHAUSTED') return 429;
  if (nestedStatusStr === 'DEADLINE_EXCEEDED') return 504;
  if (nestedStatusStr === 'INTERNAL') return 500;
  if (nestedStatusStr === 'NOT_FOUND') return 404;
  if (nestedStatusStr === 'PERMISSION_DENIED') return 403;
  if (nestedStatusStr === 'UNAUTHENTICATED') return 401;
  if (nestedStatusStr === 'INVALID_ARGUMENT') return 400;

  // Inspect JSON string in err.message (Render exact error: {"error":{"code":503,"message":"...","status":"UNAVAILABLE"}})
  if (typeof err.message === 'string') {
    try {
      const match = err.message.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed?.error?.code === 'number') return parsed.error.code;
        const s = String(parsed?.error?.status || '').toUpperCase();
        if (s === 'UNAVAILABLE') return 503;
        if (s === 'RESOURCE_EXHAUSTED') return 429;
        if (s === 'DEADLINE_EXCEEDED') return 504;
        if (s === 'INTERNAL') return 500;
        if (s === 'NOT_FOUND') return 404;
        if (s === 'PERMISSION_DENIED') return 403;
        if (s === 'UNAUTHENTICATED') return 401;
        if (s === 'INVALID_ARGUMENT') return 400;
      }
    } catch {
      // ignore JSON parse failures
    }
  }

  // String status codes directly on error object
  const statusStr = String(err.status || err.code || '').toUpperCase();
  if (statusStr === 'UNAVAILABLE') return 503;
  if (statusStr === 'RESOURCE_EXHAUSTED') return 429;
  if (statusStr === 'DEADLINE_EXCEEDED') return 504;
  if (statusStr === 'INTERNAL') return 500;
  if (statusStr === 'NOT_FOUND') return 404;
  if (statusStr === 'PERMISSION_DENIED') return 403;
  if (statusStr === 'UNAUTHENTICATED') return 401;
  if (statusStr === 'INVALID_ARGUMENT') return 400;

  return null;
}

/**
 * Strictly classifies whether an error is transient and eligible for exponential backoff retry.
 * Only HTTP 408, 429, 500, 502, 503, 504 and network socket resets are transient.
 * Non-transient errors (400, 401, 403, 404, safety blocks, validation failures) are NEVER retried.
 */
export function isTransientGeminiError(err: any): boolean {
  if (!err) return false;

  // Fail-fast markers: internal timeout or validation failures
  if (err.code === 'AI_TIMEOUT' || err.code === 'AI_VALIDATION_FAILED' || err.code === 'AI_MALFORMED_OUTPUT') {
    return false;
  }
  if (err.isSafetyBlock || err.finishReason === 'SAFETY') {
    return false;
  }

  const statusCode = extractErrorStatusCode(err);
  if (statusCode !== null) {
    // Explicit non-transient HTTP codes
    if ([400, 401, 403, 404].includes(statusCode)) {
      return false;
    }
    // Genuine transient HTTP codes
    if ([408, 429, 500, 502, 503, 504].includes(statusCode)) {
      return true;
    }
  }

  // Network/socket level errors
  const errCode = String(err.code || '').toUpperCase();
  if (['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'ENOTFOUND'].includes(errCode)) {
    return true;
  }

  // Message inspection for explicit non-transient phrases
  const message = String(err.message || '').toLowerCase();
  if (
    message.includes('safety') ||
    message.includes('blocked') ||
    message.includes('harmful') ||
    message.includes('inappropriate') ||
    message.includes('api_key') ||
    message.includes('api key not valid') ||
    message.includes('invalid argument') ||
    message.includes('not found') ||
    message.includes('unregistered')
  ) {
    return false;
  }

  // Message inspection for transient failure phrases
  if (
    message.includes('high demand') ||
    message.includes('spikes in demand') ||
    message.includes('temporarily unavailable') ||
    message.includes('overloaded') ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('resource_exhausted') ||
    message.includes('deadline exceeded') ||
    message.includes('try again later') ||
    message.includes('socket hang up') ||
    message.includes('503') ||
    message.includes('429')
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates exponential backoff delay with bounded random jitter.
 * Attempt 1: ~1000ms + jitter
 * Attempt 2: ~2000ms + jitter
 * Attempt 3: ~4000ms + jitter
 * Cap: 8000ms
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 8000,
  randomFn: () => number = Math.random
): number {
  const exponential = Math.min(baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)), maxDelayMs);
  const maxJitter = Math.min(500, Math.floor(exponential * 0.3));
  const jitter = Math.floor(randomFn() * (maxJitter + 1));
  return Math.min(exponential + jitter, maxDelayMs + 500);
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private model: string;
  private fallbackModel: string | null;
  private defaultTimeoutMs: number;
  private defaultMaxTokens: number;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  // Test hook for mocking SDK generateContent calls in deterministic unit tests
  private callFnForTesting: GeminiCallFn | null = null;

  constructor() {
    this.model = this.normalizeModel(config.gemini.model);
    const rawFallback = config.gemini.fallbackModel;
    this.fallbackModel = rawFallback ? this.normalizeModel(rawFallback) : null;

    // Guard: Prevent self-fallback
    if (this.fallbackModel === this.model) {
      this.fallbackModel = null;
    }

    this.defaultTimeoutMs = config.gemini.timeoutMs || 30000;
    this.defaultMaxTokens = config.gemini.maxOutputTokens || 2048;
    this.maxRetries = config.gemini.maxRetries ?? 2;
    this.baseDelayMs = config.gemini.baseDelayMs ?? 1000;
    this.maxDelayMs = config.gemini.maxDelayMs ?? 8000;

    if (this.isConfigured()) {
      try {
        this.client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
      } catch (err: any) {
        logger.error('Failed to initialize GoogleGenAI client:', sanitizeLogMessage(err?.message));
      }
    }
  }

  /**
   * Normalizes legacy, deprecated, or unconfigured model names to production-compatible models
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
   * Returns current active primary model name
   */
  public getModelName(): string {
    return this.model;
  }

  /**
   * Returns configured fallback model name
   */
  public getFallbackModelName(): string | null {
    return this.fallbackModel;
  }

  /**
   * Test hook: inject mock generateContent call function for deterministic unit testing
   */
  public setCallFnForTesting(fn: GeminiCallFn | null): void {
    this.callFnForTesting = fn;
  }

  /**
   * Test hook: set custom delays so test suites run in milliseconds without sleeping
   */
  public setDelaysForTesting(baseMs: number, maxMs: number): void {
    this.baseDelayMs = baseMs;
    this.maxDelayMs = maxMs;
  }

  /**
   * Formats a raw SDK generation response into a type-safe GeminiGenerateResult
   */
  private formatSuccessResult(response: any, usedModel: string, startTime: number): GeminiGenerateResult {
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
      model: usedModel,
      durationMs,
    };
  }

  /**
   * Executes a single attempt against a target model with timeout protection
   */
  private async executeAttempt(targetModel: string, options: GeminiGenerateOptions): Promise<any> {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        const timeoutErr: any = new Error(`AI Provider request timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'AI_TIMEOUT';
        timeoutErr.status = 504;
        reject(timeoutErr);
      }, timeoutMs);

      if (typeof timer.unref === 'function') timer.unref();
    });

    const callConfig = {
      systemInstruction: options.systemInstruction || BRANDX_SYSTEM_INSTRUCTION,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens || this.defaultMaxTokens,
      responseMimeType: options.responseMimeType || 'text/plain',
    };

    let callPromise: Promise<any>;
    if (this.callFnForTesting) {
      callPromise = this.callFnForTesting(targetModel, options, callConfig);
    } else {
      const client = this.client || new GoogleGenAI({ apiKey: config.gemini.apiKey });
      callPromise = client.models.generateContent({
        model: targetModel,
        contents: options.prompt,
        config: callConfig,
      });
    }

    return await Promise.race([callPromise, timeoutPromise]);
  }

  /**
   * Generates text from Gemini with bounded exponential backoff retry and controlled fallback
   */
  public async generateText(options: GeminiGenerateOptions): Promise<GeminiGenerateResult> {
    if (!this.isConfigured() && !this.callFnForTesting) {
      const err: any = new Error('AI Provider is not configured on the server. Please set GEMINI_API_KEY.');
      err.code = 'AI_PROVIDER_UNCONFIGURED';
      err.status = 503;
      throw err;
    }

    const startTime = Date.now();
    const maxPrimaryAttempts = this.maxRetries + 1; // e.g. 2 retries = 3 attempts total
    let attempt = 0;
    let lastError: any = null;

    // =========================================================================
    // Phase 1: Primary Model (gemini-3.8-flash) with Bounded Exponential Backoff
    // =========================================================================
    while (attempt < maxPrimaryAttempts) {
      attempt++;
      try {
        const response = await this.executeAttempt(this.model, options);
        return this.formatSuccessResult(response, this.model, startTime);
      } catch (err: any) {
        lastError = err;
        const isTransient = isTransientGeminiError(err);

        // Fail-fast on non-transient errors (400, 401, 403, 404, safety block)
        if (!isTransient || attempt >= maxPrimaryAttempts) {
          break;
        }

        // Bounded exponential backoff + jitter
        const delay = calculateBackoffDelay(attempt, this.baseDelayMs, this.maxDelayMs);
        logger.warn(
          `Transient error in Gemini call (model: ${this.model}, attempt ${attempt}/${maxPrimaryAttempts}): ${sanitizeLogMessage(
            err?.message
          )}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // =========================================================================
    // Phase 2: Controlled Fallback (ONE attempt to confirmed stable fallback model)
    // Only triggered if primary model failed due to transient availability (503/429)
    // =========================================================================
    const canFallback =
      Boolean(this.fallbackModel && this.fallbackModel !== this.model) &&
      isTransientGeminiError(lastError);

    if (canFallback && this.fallbackModel) {
      const fallbackTarget = this.fallbackModel;
      logger.warn(
        `Primary model (${this.model}) exhausted after ${attempt} attempts with transient error (${sanitizeLogMessage(
          lastError?.message
        )}). Attempting ONE controlled fallback to ${fallbackTarget}...`
      );

      // Brief breather before fallback request to prevent stampedes
      const fallbackJitter = Math.min(this.baseDelayMs, 300) + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, fallbackJitter));

      try {
        const response = await this.executeAttempt(fallbackTarget, options);
        logger.info(`Controlled fallback to ${fallbackTarget} succeeded!`);
        return this.formatSuccessResult(response, fallbackTarget, startTime);
      } catch (fallbackErr: any) {
        lastError = fallbackErr;
        logger.error(`Controlled fallback to ${fallbackTarget} failed:`, sanitizeLogMessage(fallbackErr?.message));
      }
    }

    // =========================================================================
    // Phase 3: Sanitized Client Error Response (Zero Internals / Key Leakage)
    // =========================================================================
    logger.error('Gemini generation failed:', sanitizeLogMessage(lastError?.message));

    const statusCode = extractErrorStatusCode(lastError);
    const isTransient = isTransientGeminiError(lastError);

    let clientMessage = 'AI generation failed due to a provider error.';
    let clientStatus = 502;
    let clientCode = 'AI_EXECUTION_FAILED';

    if (lastError?.code === 'AI_TIMEOUT') {
      clientMessage = 'AI request timed out. Please try again with a shorter prompt.';
      clientStatus = 504;
      clientCode = 'AI_TIMEOUT';
    } else if (isTransient || statusCode === 503 || statusCode === 429 || statusCode === 502 || statusCode === 504) {
      clientMessage = 'AI service is temporarily busy. Please try again in a moment.';
      clientStatus = 503;
      clientCode = 'AI_SERVICE_BUSY';
    } else if (statusCode === 401 || statusCode === 403) {
      clientMessage = 'AI Provider authentication failed on server.';
      clientStatus = 502;
      clientCode = 'AI_AUTH_FAILED';
    } else if (lastError?.isSafetyBlock || lastError?.finishReason === 'SAFETY') {
      clientMessage = 'Content could not be generated due to safety guidelines.';
      clientStatus = 400;
      clientCode = 'AI_SAFETY_BLOCKED';
    }

    const sanitizedError: any = new Error(clientMessage);
    sanitizedError.code = clientCode;
    sanitizedError.status = clientStatus;
    sanitizedError.originalStatus = statusCode;
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
    // Strip possible markdown fences if returned by model
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
