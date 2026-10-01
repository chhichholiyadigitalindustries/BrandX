/**
 * BRANDX — Social Media & Poster Caption Prompt Builder
 */

export interface CaptionPromptOptions {
  topic: string;
  businessName?: string;
  language?: string;
  platform?: 'whatsapp' | 'instagram' | 'facebook' | 'poster' | 'general' | string;
}

export function buildCaptionPrompt(options: CaptionPromptOptions): string {
  const {
    topic,
    businessName = 'Our Business',
    language = 'hinglish',
    platform = 'whatsapp',
  } = options;

  return `You are creating a catchy social media and business poster caption for "${businessName}".

Details:
- Topic / Focus: "${topic}"
- Target Platform: ${platform}
- Target Language: ${language}

Platform Nuances:
- whatsapp: 1-2 punchy lines, status-friendly, WhatsApp-friendly emojis.
- instagram: Engaging storytelling hook, line breaks, call-to-action to DM or visit bio, 5-8 relevant trending hashtags.
- facebook: Community-focused, friendly, clear shop address/phone invitation.
- poster: Bold headline + subheadline suitable to print or display on an image.

Output format: Return ONLY pure, valid JSON with this exact schema:
{
  "headline": "Punchy 3-7 word catchy headline with emoji",
  "caption": "Full body text of the caption",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "platform": "${platform}",
  "language": "${language}"
}`;
}
