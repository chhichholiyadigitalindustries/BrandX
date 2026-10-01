/**
 * BRANDX — AI Chat Prompt Builder
 */

export interface ChatPromptOptions {
  message: string;
  language?: 'hindi' | 'hinglish' | 'english' | string;
  businessContext?: {
    name?: string;
    category?: string;
    city?: string;
    ownerName?: string;
    phone?: string;
    upiId?: string;
  };
}

export function buildChatPrompt(options: ChatPromptOptions): string {
  const { message, language = 'hinglish', businessContext } = options;

  let contextSnippet = '';
  if (businessContext && (businessContext.name || businessContext.category)) {
    contextSnippet = `
Shop / Business Context:
- Shop Name: ${businessContext.name || 'Not specified'}
- Category: ${businessContext.category || 'Retail'}
- Location / City: ${businessContext.city || 'India'}
${businessContext.phone ? `- Contact Phone: +91 ${businessContext.phone}` : ''}
${businessContext.upiId ? `- UPI ID: ${businessContext.upiId}` : ''}
`;
  }

  return `${contextSnippet}
User's Preferred Language: ${language}
User's Question / Prompt:
"${message}"

Instruction:
Answer the user's question directly, clearly, and practically.
If drafting messages or reminders, include placeholders like "[Customer Name]" or "[Amount]" where specific details are needed.
Respond in ${language}.`;
}
