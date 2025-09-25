import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private apiKey = process.env.OPENAI_API_KEY || '';
  private baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  private model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  async summarizeCommits(commitsText: string): Promise<string> {
    if (!this.apiKey) {
      return commitsText; // фолбэк — без ИИ возвращаем исходный текст
    }
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'Ты помощник для разработчика. На основе списка commit messages сформируй краткий список пунктов для ежедневного отчёта. Пиши на русском. Формат: маркированные пункты, без воды.',
            },
            { role: 'user', content: commitsText },
          ],
          temperature: 0.2,
        }),
      });
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content || commitsText;
      return text.trim();
    } catch (e) {
      return commitsText;
    }
  }
}
