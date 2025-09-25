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

  async postDigestWithActions(params: {
    channel?: string;
    digest: string;
    dateISO: string;
  }): Promise<void> {
    const channel = params.channel ?? this.defaultChannel;
    if (!channel) return;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Ежедневный дайджест за ${params.dateISO}:\n\n${params.digest}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Start daily report' },
            style: 'primary',
            action_id: 'start_report',
            value: params.dateISO,
          },
        ],
      },
    ];
    await this.client.chat.postMessage({
      channel,
      text: 'Ежедневный дайджест',
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
              text: 'Dev tasks (можно отредактировать)',
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
            label: { type: 'plain_text', text: 'Meetings (опционально)' },
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
}
