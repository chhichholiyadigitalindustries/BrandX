import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface GeminiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5 && !this.apiKey.includes('placeholder'));
  }

  public async generateText(options: GeminiGenerateOptions): Promise<{
    text: string;
    tokensUsed: number;
    durationMs: number;
  }> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      logger.warn('Gemini API Key not set or is placeholder. Using smart Vyapari AI heuristic fallback.');
      const fallback = this.generateVyapariFallback(options.prompt);
      return {
        text: fallback,
        tokensUsed: 120,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(config.gemini.timeoutMs || 30000),
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: options.prompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxOutputTokens || 1024,
          },
          systemInstruction: options.systemInstruction
            ? { parts: [{ text: options.systemInstruction }] }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        // Sanitize error body to prevent leaking keys or internal URLs
        const sanitizedError = errorBody.replace(this.apiKey, '[REDACTED]');
        throw new Error(`Gemini API error (${response.status}): ${sanitizedError}`);
      }

      const data: any = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokensUsed = data?.usageMetadata?.totalTokenCount || 150;

      return {
        text,
        tokensUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      // Never log raw API key in logs or telemetry
      const safeMsg = (error?.message || '').replace(this.apiKey, '[REDACTED]');
      logger.error(`Gemini Provider execution error: ${safeMsg}`);

      // Graceful fallback so vyaparis never face breaking exceptions
      const fallback = this.generateVyapariFallback(options.prompt);
      return {
        text: fallback,
        tokensUsed: 80,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private generateVyapariFallback(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('caption') || lower.includes('poster') || lower.includes('marketing')) {
      return `🎉 स्पेशल ऑफर! आज ही हमारी दुकान पर आएं और पाएं आकर्षक छूट एवं बेहतरीन क्वालिटी। अधिक जानकारी के लिए संपर्क करें या WhatsApp करें। ✨🛍️\n\n#ShopLocal #SpecialOffer #BestQuality #IndianVyapari`;
    }
    if (lower.includes('review') || lower.includes('google')) {
      return `नमस्ते! आपके अनमोल 5-स्टार रिव्यू और विश्वास के लिए दिल से धन्यवाद। हम हमेशा आपको सबसे बेहतरीन सेवा देने के लिए प्रतिबद्ध हैं। अगली बार फिर पधारें! 🙏✨`;
    }
    if (lower.includes('reminder') || lower.includes('taqada') || lower.includes('udhar')) {
      return `नमस्ते जी! आपके खाते का बकाया बिल भुगतान शेष है। कृपया सुविधा अनुसार UPI द्वारा भुगतान करें। समय पर भुगतान से हमारा व्यापारिक विश्वास बना रहता है। धन्यवाद! 🙏`;
    }
    return `नमस्ते! BrandX AI Copilot आपके व्यापार को बढ़ाने, GST बिल बनाने और डिजिटल खाता व्यवस्थित रखने के लिए हमेशा तैयार है।`;
  }
}

export const geminiProvider = new GeminiProvider();
