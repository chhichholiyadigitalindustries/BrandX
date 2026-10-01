/**
 * BRANDX — WhatsApp Campaign Prompt Builder
 */

export interface WhatsappCampaignPromptOptions {
  purpose: string;
  festival?: string;
  businessType?: string;
  businessName?: string;
  language?: string;
  offer?: string;
  contactPhone?: string;
  upiId?: string;
  address?: string;
}

export function buildWhatsappCampaignPrompt(options: WhatsappCampaignPromptOptions): string {
  const {
    purpose,
    festival,
    businessType = 'Retail Store',
    businessName = 'Our Store',
    language = 'hinglish',
    offer,
    contactPhone,
    upiId,
    address,
  } = options;

  return `You are creating a high-converting WhatsApp marketing or broadcast campaign for an Indian business.

Business & Campaign Details:
- Business Name: ${businessName}
- Business Type: ${businessType}
- Campaign Purpose: ${purpose}
${festival ? `- Festival / Occasion: ${festival}` : ''}
${offer ? `- Offer / Promo: ${offer}` : ''}
${contactPhone ? `- Contact Phone: +91 ${contactPhone}` : ''}
${upiId ? `- UPI ID for Payment: ${upiId}` : ''}
${address ? `- Store Address: ${address}` : ''}
- Preferred Language: ${language}

Guidelines:
1. Format specifically for WhatsApp:
   - Use *bold* for headlines and key terms.
   - Use emojis tastefully to make the message visually engaging.
   - Use bullet points (• or 🎁) for key features or offers.
   - Include a crisp, clear Call to Action (CTA) at the end.
2. The message must be ready to send directly to customers.
3. If purpose is payment reminder / taqada, maintain a polite, respectful tone preserving customer goodwill.
4. If purpose is promotional / festive, make it exciting and urgent.

Output format: Return pure, valid JSON with this exact schema:
{
  "campaignTitle": "Short catchy internal title",
  "message": "Complete WhatsApp formatted message ready to send",
  "cta": "Short CTA text (e.g. 'Reply YES to order' or 'Visit today')",
  "caption": "Short 1-sentence social status caption"
}`;
}
