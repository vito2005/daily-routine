import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  // Google AI Studio (Gemini)
  private googleApiKey = process.env.GOOGLE_AI_API_KEY || '';
  private googleModel = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
  private googleAi = new GoogleGenAI({ apiKey: this.googleApiKey });

  async summarizeCommits(commitsText: string): Promise<string> {
    // 1) Try Google AI Studio first
    if (this.googleApiKey) {
      try {
        const response = await this.googleAi.models.generateContent({
          model: this.googleModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Ты помощник для разработчика. На основе списка commit messages сформируй КРАТКИЙ список пунктов для ежедневного отчёта. Пиши на английском. Формат: название репо и маркированные пункты без лишнего текста. ' +
                    commitsText,
                },
              ],
            },
          ],
          config: {
            thinkingConfig: {
              thinkingBudget: 0, // Disables thinking
            },
          },
        });
        const text = response?.text;
        if (typeof text === 'string' && text.trim()) return text.trim();
      } catch (e) {
        console.error('[Ai] summarizeCommits error', e);
      }
    }

    return commitsText;
  }
}
