import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
  private readonly client: WebClient;
  private readonly defaultChannel: string | undefined;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.defaultChannel = process.env.SLACK_CHANNEL_ID;
  }

  async postMessage(text: string, channel?: string): Promise<void> {
    const target = channel ?? this.defaultChannel;
    if (!target) return;
    await this.client.chat.postMessage({ channel: target, text });
  }
}
