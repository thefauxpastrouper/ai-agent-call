import Groq from 'groq-sdk';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const groq = new Groq({ apiKey: config.groqApiKey });

export class AgentService {
  // Llama 3 is excellent for conversational responsiveness
  private model = "llama-3.3-70b-versatile"; 

  private systemPrompt = `You are a helpful customer service AI. 
  Keep your answers very brief (under 2 sentences) as you are on a phone call. 
  Do not use emojis or markdown formatting.`;

  async generateResponse(userText: string, conversationHistory: any[]): Promise<string> {
    try {
      const response = await groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.systemPrompt },
          ...conversationHistory,
          { role: "user", content: userText }
        ],
        // Groq specific optimization:
        temperature: 0.7,
        max_tokens: 150, 
      });
      
      const reply = response.choices[0]?.message?.content || "I didn't catch that.";
      logger.info(`Agent Reply: ${reply}`);
      return reply;
    } catch (error) {
      logger.error("Groq API Error", error);
      // Fallback response if the AI fails
      return "I'm having a little trouble connecting. Could you say that again?";
    }
  }
}
