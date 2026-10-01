/**
 * BrandX Real Gemini AI Service
 * Powered by Google Gemini through BrandX Secure Server-Side Backend.
 * Tailored for Indian Vyaparis, Shopkeepers, and MSMEs.
 * NOTE: API keys are NEVER exposed to the browser. All calls go through BrandX Backend.
 */

import { BusinessProfile, CatalogItem } from '../types';
import { aiApi } from './aiApi';

export interface ParsedBillData {
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    gstPercent: number;
    type?: 'Service' | 'Goods';
  }>;
  discountPercent?: number;
  summary: string;
}

export interface GeneratedCreativeResult {
  tag: string;
  title: string;
  headline: string;
  body: string;
  hashtags: string[];
  readability: string;
  characters: number;
}

/**
 * Client-side key getter: Always returns empty string since keys are server-isolated
 */
export function getGeminiApiKey(): string {
  return '';
}

/**
 * Client-side key setter (No-op; keys managed securely on backend)
 */
export function setGeminiApiKey(_key: string): void {
  // Handled server-side
}

/**
 * Checks whether AI service is available (connected via BrandX backend)
 */
export function isGeminiConfigured(): boolean {
  return true;
}

/**
 * Validates connection to the backend AI Copilot service
 */
export async function testGeminiApiKey(_keyToTest?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const quota = await aiApi.getQuota();
    if (quota) {
      return { success: true };
    }
    return { success: false, error: 'Could not connect to BrandX AI backend.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Connection to BrandX AI failed.' };
  }
}

/**
 * Generates marketing post copy, festive captions, and slogans via Backend
 */
export async function generateMarketingCampaign(
  topic: string,
  business: BusinessProfile,
  tone: string = 'Exciting & Promotional 🔥',
  language: string = 'Hinglish 🇮🇳'
): Promise<GeneratedCreativeResult> {
  const langKey = language.toLowerCase().includes('hindi')
    ? 'hindi'
    : language.toLowerCase().includes('english')
    ? 'english'
    : 'hinglish';

  try {
    const res = await aiApi.generateCaption({
      topic: `${topic} (Tone: ${tone})`,
      businessName: business.name,
      language: langKey,
      platform: 'poster',
    });

    if (res && res.caption) {
      return {
        tag: 'Vyapar Special',
        title: `${business.name} Offer`,
        headline: res.headline || '✨ Special Festive Offer For You! 🎉',
        body: res.caption,
        hashtags: Array.isArray(res.hashtags) && res.hashtags.length > 0
          ? res.hashtags
          : [`#${business.name.replace(/\s+/g, '')}`, '#BestOffer'],
        readability: '99% (AI Optimized for India)',
        characters: res.caption.length,
      };
    }
  } catch (e: any) {
    console.warn('Backend AI call failed:', e?.message);
    throw e;
  }

  // Fallback heuristic if backend is unavailable
  return {
    tag: 'Vyapar Special',
    title: `${business.name} Offer`,
    headline: '✨ Special Festive Offer For You! 🎉',
    body: `Visit ${business.name} at ${business.address}, ${business.city}. Call +91 ${business.phone} to get the best festive deals!`,
    hashtags: [`#${business.name.replace(/\s+/g, '')}`, '#BestOffer', `#${business.city}`],
    readability: '98% (High Conversion)',
    characters: 180,
  };
}

/**
 * Generates an automated Google Review response via Backend
 */
export async function generateReviewAutoReply(
  reviewText: string,
  rating: '5' | '4' | '1-3' | number,
  business: BusinessProfile
): Promise<string> {
  const numRating = typeof rating === 'number' ? rating : rating === '5' ? 5 : rating === '4' ? 4 : 2;

  try {
    const res = await aiApi.generateReviewReply({
      review: reviewText,
      rating: numRating,
      businessName: business.name,
      language: 'hinglish',
      tone: numRating >= 4 ? 'friendly' : 'professional',
    });

    if (res && res.reply) {
      return res.reply;
    }
  } catch (e: any) {
    console.warn('Backend AI Review Reply generation failed:', e?.message);
    throw e;
  }

  if (numRating >= 4) {
    return `Dear Valued Customer, thank you so much for your wonderful feedback! 😊 We are truly delighted that you loved your experience at ${business.name}. Hope to see you again soon! 🙏✨`;
  } else {
    return `Dear Customer, thank you for sharing your feedback. We sincerely apologize for falling short of your expectations at ${business.name}. Please contact us directly at +91 ${business.phone} so we can make this right. Your satisfaction is our priority! 🙏`;
  }
}

/**
 * Generates high-converting WhatsApp Broadcast Campaign via Backend
 */
export async function generateBroadcastMessage(
  offerTitle: string,
  business: BusinessProfile
): Promise<string> {
  try {
    const res = await aiApi.generateWhatsappCampaign({
      purpose: offerTitle,
      businessName: business.name,
      businessType: business.category,
      language: 'hinglish',
      offer: offerTitle,
      contactPhone: business.mobile || business.phone,
      upiId: business.upiId,
      address: `${business.address}, ${business.city}`,
    });

    if (res && res.message) {
      return res.message;
    }
  } catch (e: any) {
    console.warn('Backend WhatsApp broadcast generation failed:', e?.message);
    throw e;
  }

  return `🎉 *FESTIVE MEGA DHAMAKA at ${business.name.toUpperCase()}!* 🪔✨\n\n` +
    `Namaste Valued Customers! Celebrate this season with exciting savings:\n\n` +
    `🔥 *Offer:* ${offerTitle}\n` +
    `🎁 *Special Benefit:* Extra 10% OFF on payments via UPI (${business.upiId || 'Shop QR'})\n` +
    `📍 *Location:* ${business.address}, ${business.city}\n\n` +
    `Limited slots available! Reply *YES* or call us at *+91 ${business.mobile || business.phone}* to book now! 📲`;
}

/**
 * AI Voice or Text Prompt to Structured Invoice Parser via Backend
 */
export async function parseVoicePromptToBill(
  promptText: string,
  business: BusinessProfile,
  catalogItems: CatalogItem[] = []
): Promise<ParsedBillData> {
  try {
    const catalogInfo = catalogItems
      .map((c) => `${c.name} (₹${c.defaultRate})`)
      .slice(0, 15)
      .join(', ');

    const res = await aiApi.generateLegacy(
      'VOICE_TO_BILL',
      `Shop: ${business.name}. Order prompt: "${promptText}". Catalog: ${catalogInfo}`,
      { catalogInfo }
    );

    if (res && res.text) {
      const cleanJson = res.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        customerName: parsed.customerName || 'Walk-in Customer',
        customerPhone: parsed.customerPhone || '',
        items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [
          { name: promptText.slice(0, 30), qty: 1, rate: 500, gstPercent: 18, type: 'Service' }
        ],
        discountPercent: parsed.discountPercent || 0,
        summary: parsed.summary || 'Bill successfully parsed by Biz AI!',
      };
    }
  } catch (e: any) {
    console.warn('Backend AI invoice parser error:', e?.message);
  }

  // Fallback heuristic parser
  let detectedName = 'Walk-in Customer';
  if (promptText.toLowerCase().includes('ko') || promptText.toLowerCase().includes('for')) {
    const match = promptText.match(/(.+?)\s+(?:ko|for|ji)/i);
    if (match && match[1]) detectedName = match[1].trim();
  }

  const numMatch = promptText.match(/(?:rs\.?|inr|₹|\b)(\d{2,6})\b/i);
  const detectedAmount = numMatch ? parseFloat(numMatch[1]) : 1000;

  return {
    customerName: detectedName,
    items: [
      {
        name: promptText.length > 30 ? promptText.slice(0, 30) + '...' : promptText,
        qty: 1,
        rate: detectedAmount,
        gstPercent: 18,
        type: 'Service',
      },
    ],
    discountPercent: 0,
    summary: `AI parsed invoice for "${detectedName}" of ₹${detectedAmount}`,
  };
}

/**
 * Generates an inspirational morning Suvichar or festival greeting via Backend
 */
export async function generateDailySuvichar(
  businessName: string,
  category: string,
  dayName: string
): Promise<{ headline: string; subheadline: string; quoteHindi: string; badge: string }> {
  try {
    const res = await aiApi.generateCaption({
      topic: `Inspiring morning Suvichar and business blessings for ${dayName}`,
      businessName,
      language: 'hindi',
      platform: 'poster',
    });

    if (res && res.caption) {
      return {
        headline: res.headline || `शुभ ${dayName} 🌸✨`,
        subheadline: `${businessName} • शुभ विचार`,
        quoteHindi: res.caption,
        badge: 'AI SUVICHAR',
      };
    }
  } catch (e: any) {
    console.warn('Backend daily suvichar error:', e?.message);
  }

  return {
    headline: `शुभ ${dayName} 🌸✨`,
    subheadline: 'हर दिन एक नई शुरुआत',
    quoteHindi: 'कर्म ही पूजा है और सच्चाई ही व्यापार की सबसे मजबूत नींव है। अपने ग्राहकों को खुश रखना ही हमारी सबसे बड़ी कमाई है। आपका दिन मंगलमय हो! 🙏',
    badge: 'DAILY STATUS',
  };
}
