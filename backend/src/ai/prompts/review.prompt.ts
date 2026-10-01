/**
 * BRANDX — Google Review Reply Prompt Builder
 */

export interface ReviewPromptOptions {
  review: string;
  rating: number;
  language?: 'hindi' | 'hinglish' | 'english' | string;
  businessName?: string;
  customerName?: string;
  tone?: 'professional' | 'friendly' | 'short' | 'premium' | string;
}

export function buildReviewReplyPrompt(options: ReviewPromptOptions): string {
  const {
    review,
    rating,
    language = 'hinglish',
    businessName = 'Our Business',
    customerName,
    tone = 'friendly',
  } = options;

  return `You are drafting an official Google Business Review reply for the business "${businessName}".

Review Details:
${customerName ? `- Reviewer Name: ${customerName}\n` : ''}- Customer Review Text: "${review}"
- Star Rating: ${rating} out of 5 stars
- Desired Tone: ${tone}
- Desired Language: ${language}

Guidelines for the response:
1. For 4 or 5 stars:
   - Express heartfelt gratitude for visiting "${businessName}".
   - Mention something specific from the customer's praise if applicable.
   - Invite them back warmly.
2. For 1, 2, or 3 stars:
   - Acknowledge the feedback humbly and apologize sincerely for the inconvenience.
   - Emphasize that customer satisfaction is our top priority.
   - Invite them to contact the business directly so the issue can be made right.
3. Keep it concise (2-4 sentences max). Tone should be ${tone}.
4. Respond in ${language}.

Output format: Return ONLY pure, valid JSON with this exact schema:
{
  "reply": "The response text here without enclosing quotes",
  "language": "${language}",
  "tone": "${tone}",
  "rating": ${rating}
}`;
}
