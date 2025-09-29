import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SlackService {
  private readonly client: WebClient;
  private readonly subscribersPath: string;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.subscribersPath = path.resolve(
      process.cwd(),
      'data',
      'subscribers.json',
    );
  }

  async postMessage(text: string, channel?: string): Promise<void> {
    const target = channel;
    if (!target) return;
    await this.client.chat.postMessage({ channel: target, text });
  }

  async postDigestWithActions(params: {
    channel?: string;
    digest: string;
    dateISO: string;
  }): Promise<void> {
    const channel = params.channel;
    if (!channel) return;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Daily digest for ${params.dateISO}:\n\n${params.digest}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Start report' },
            style: 'primary',
            action_id: 'start_report',
            value: params.dateISO,
          },
        ],
      },
    ];
    await this.client.chat.postMessage({
      channel,
      text: 'Daily digest',
      blocks,
    });
  }

  async openDailyModal(
    triggerId: string,
    defaults: {
      dateISO: string;
      devTasks?: string;
      devHours?: string;
      meetings?: string;
      meetingHours?: string;
    },
  ): Promise<void> {
    await this.client.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'daily_report_submit',
        title: { type: 'plain_text', text: 'Daily report' },
        submit: { type: 'plain_text', text: 'Save' },
        private_metadata: JSON.stringify({ dateISO: defaults.dateISO }),
        blocks: [
          {
            type: 'input',
            block_id: 'dev_tasks_block',
            label: {
              type: 'plain_text',
              text: 'Dev tasks (you can edit)',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'dev_tasks',
              multiline: true,
              initial_value: defaults.devTasks ?? '',
            },
          },
          {
            type: 'input',
            block_id: 'dev_hours_block',
            label: { type: 'plain_text', text: 'Dev hours' },
            element: {
              type: 'plain_text_input',
              action_id: 'dev_hours',
              initial_value: defaults.devHours ?? '0',
            },
          },
          {
            type: 'input',
            block_id: 'meetings_block',
            optional: true,
            label: { type: 'plain_text', text: 'Meetings (optional)' },
            element: {
              type: 'plain_text_input',
              action_id: 'meetings',
              multiline: true,
              initial_value: defaults.meetings ?? '',
            },
          },
          {
            type: 'input',
            block_id: 'meeting_hours_block',
            optional: true,
            label: { type: 'plain_text', text: 'Meeting hours' },
            element: {
              type: 'plain_text_input',
              action_id: 'meeting_hours',
              initial_value: defaults.meetingHours ?? '0',
            },
          },
        ],
      },
    });
  }

  // --- DM posting for specific userId ---
  async postDigestDM(
    userId: string,
    params: { digest: string; dateISO: string },
  ): Promise<void> {
    const dm = await this.client.conversations.open({ users: userId });
    const channel = dm.channel?.id;
    console.log('[Slack] DM channel:', channel);
    if (!channel) return;
    await this.postDigestWithActions({
      channel,
      digest: params.digest,
      dateISO: params.dateISO,
    });
  }

  // --- Simple subscribers file store ---
  private readSubscribers(): string[] {
    try {
      if (!fs.existsSync(this.subscribersPath)) return [];
      const raw = fs.readFileSync(this.subscribersPath, 'utf8');
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeSubscribers(list: string[]): void {
    const dir = path.dirname(this.subscribersPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.subscribersPath,
      JSON.stringify(Array.from(new Set(list)), null, 2),
    );
  }

  subscribeUser(userId: string): void {
    const list = this.readSubscribers();
    if (!list.includes(userId)) list.push(userId);
    this.writeSubscribers(list);
  }

  unsubscribeUser(userId: string): void {
    const list = this.readSubscribers();
    const next = list.filter((x) => x !== userId);
    this.writeSubscribers(next);
  }

  listSubscribers(): string[] {
    return this.readSubscribers();
  }
}
