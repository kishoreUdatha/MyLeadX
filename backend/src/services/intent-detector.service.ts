import OpenAI from 'openai';
import { AgentType } from '@prisma/client';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface DetectedIntent {
  intent: AgentType | 'CONTINUE';
  confidence: number;
  reason: string;
  extractedData?: Record<string, any>;
}

/**
 * Intent Detection Service
 * Analyzes conversation to determine if handoff to specialized agent is needed
 */
class IntentDetectorService {
  // Keywords that trigger specific agents
  private intentKeywords: Record<AgentType, string[]> = {
    VOICE: [], // Default, no specific keywords
    SALES: [
      'buy', 'purchase', 'price', 'cost', 'discount', 'offer', 'deal',
      'interested in buying', 'want to buy', 'how much', 'pricing',
      'quote', 'quotation', 'invoice', 'payment plan', 'negotiate'
    ],
    APPOINTMENT: [
      'appointment', 'schedule', 'book', 'meeting', 'demo', 'visit',
      'calendar', 'available', 'slot', 'time', 'reschedule', 'cancel meeting',
      'site visit', 'campus visit', 'consultation'
    ],
    PAYMENT: [
      'pay', 'payment', 'emi', 'installment', 'invoice', 'due',
      'outstanding', 'balance', 'transaction', 'receipt', 'refund',
      'payment link', 'upi', 'card payment', 'bank transfer'
    ],
    SUPPORT: [
      'problem', 'issue', 'help', 'support', 'complaint', 'not working',
      'error', 'broken', 'fix', 'resolve', 'ticket', 'escalate',
      'manager', 'supervisor', 'frustrated', 'angry', 'disappointed'
    ],
    FOLLOWUP: [], // Triggered by system, not user keywords
    SURVEY: [
      'feedback', 'review', 'rating', 'experience', 'survey',
      'opinion', 'suggestion', 'recommend', 'nps'
    ],
  };

  // Negative sentiment indicators (trigger support/escalation)
  private negativeSentimentKeywords = [
    'angry', 'frustrated', 'disappointed', 'terrible', 'worst',
    'unacceptable', 'ridiculous', 'waste', 'never', 'hate',
    'complain', 'refund', 'cancel', 'lawsuit', 'legal'
  ];

  /**
   * Detect intent from user message using keyword matching
   */
  detectIntentFromKeywords(message: string): DetectedIntent {
    const lowerMessage = message.toLowerCase();

    // Check for negative sentiment first (priority)
    const hasNegativeSentiment = this.negativeSentimentKeywords.some(
      keyword => lowerMessage.includes(keyword)
    );

    if (hasNegativeSentiment) {
      return {
        intent: 'SUPPORT',
        confidence: 0.9,
        reason: 'Negative sentiment detected - escalating to support',
      };
    }

    // Check each agent type for keyword matches
    let bestMatch: DetectedIntent = {
      intent: 'CONTINUE',
      confidence: 0,
      reason: 'No specific intent detected',
    };

    for (const [agentType, keywords] of Object.entries(this.intentKeywords)) {
      if (keywords.length === 0) continue;

      const matchedKeywords = keywords.filter(kw => lowerMessage.includes(kw));
      const confidence = matchedKeywords.length / keywords.length;

      if (matchedKeywords.length > 0 && confidence > bestMatch.confidence) {
        bestMatch = {
          intent: agentType as AgentType,
          confidence: Math.min(confidence * 2, 0.95), // Scale up but cap at 0.95
          reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Detect intent using AI (more accurate but slower)
   */
  async detectIntentWithAI(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<DetectedIntent> {
    if (!openai) {
      // Fallback to keyword detection
      return this.detectIntentFromKeywords(message);
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier. Analyze the conversation and determine if the user needs to be connected to a specialized agent.

Available agent types:
- SALES: User wants to buy, needs pricing, quotes, discounts, negotiations
- APPOINTMENT: User wants to schedule a meeting, demo, visit, or consultation
- PAYMENT: User wants to make a payment, has payment issues, needs invoice/receipt
- SUPPORT: User has a problem, complaint, needs help, is frustrated
- SURVEY: User is providing feedback or willing to rate their experience
- CONTINUE: No specific intent, continue with current agent

Respond in JSON format:
{
  "intent": "AGENT_TYPE or CONTINUE",
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "extractedData": { "any relevant data extracted from conversation" }
}`
          },
          ...conversationHistory.slice(-5).map(h => ({
            role: h.role as 'user' | 'assistant',
            content: h.content,
          })),
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || '';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'CONTINUE',
          confidence: parsed.confidence || 0.5,
          reason: parsed.reason || 'AI classification',
          extractedData: parsed.extractedData,
        };
      }

      // Fallback
      return this.detectIntentFromKeywords(message);
    } catch (error) {
      console.error('AI intent detection failed:', error);
      return this.detectIntentFromKeywords(message);
    }
  }

  /**
   * Quick intent check (keyword-based, for real-time use)
   */
  quickDetect(message: string): DetectedIntent {
    return this.detectIntentFromKeywords(message);
  }

  /**
   * Deep intent analysis (AI-based, for important decisions)
   */
  async deepDetect(
    message: string,
    history: Array<{ role: string; content: string }>
  ): Promise<DetectedIntent> {
    // First do quick check
    const quickResult = this.quickDetect(message);

    // If high confidence from keywords, use that
    if (quickResult.confidence > 0.7) {
      return quickResult;
    }

    // Otherwise, use AI for better accuracy
    return this.detectIntentWithAI(message, history);
  }

  /**
   * Check if current conversation should trigger a specific agent
   */
  shouldHandoff(intent: DetectedIntent, currentAgentType: AgentType): boolean {
    // Don't handoff if confidence is low
    if (intent.confidence < 0.6) return false;

    // Don't handoff to same agent type
    if (intent.intent === currentAgentType) return false;

    // Don't handoff if intent is CONTINUE
    if (intent.intent === 'CONTINUE') return false;

    return true;
  }
}

export const intentDetector = new IntentDetectorService();
export default intentDetector;
