import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SlackService } from './slack.service';
import { GithubService } from '../github/github.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { AiService } from '../ai/ai.service';

// Типы Slack interactivity
interface SlackUser {
  id: string;
}
interface SlackAction {
  action_id: string;
  value?: string;
}
interface SlackViewState {
  values: Record<string, Record<string, { value?: string }>>;
}
interface SlackView {
  callback_id?: string;
  private_metadata?: string;
  state?: SlackViewState;
}
interface BlockActionsPayload {
  type: 'block_actions';
  user?: SlackUser;
  actions?: SlackAction[];
  trigger_id: string;
  message?: {
    blocks?: Array<{
      type?: string;
      text?: { type?: string; text?: string };
    }>;
  };
}
interface ViewSubmissionPayload {
  type: 'view_submission';
  user?: SlackUser;
  view?: SlackView;
}

// Простое in-memory состояние сессии по пользователю (или каналу)
const session: Record<string, { dateISO: string; devTasks?: string }> = {};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBlockActionsPayload(v: unknown): v is BlockActionsPayload {
  if (!isObject(v)) return false;
  return v.type === 'block_actions';
}

function isViewSubmissionPayload(v: unknown): v is ViewSubmissionPayload {
  if (!isObject(v)) return false;
  return v.type === 'view_submission';
}

@Controller('slack')
export class SlackController {
  constructor(
    private readonly slack: SlackService,
    private readonly github: GithubService,
    private readonly timesheet: TimesheetService,
    private readonly ai: AiService,
  ) {}

  // Тестовый эндпоинт для отправки дайджеста с кнопками
  @Post('send-digest')
  async sendDigest(@Body() body: { channel?: string; dateISO?: string }) {
    const dateISO = body.dateISO || new Date().toISOString().slice(0, 10);
    const digest = await this.github.getDailyCommitDigest(new Date(dateISO));
    const summarized = await this.ai.summarizeCommits(digest);
    console.log('[Slack] summarized', summarized);

    await this.slack.postDigestWithActions({
      channel: body.channel,
      digest: summarized,
      dateISO,
    });
    return { ok: true };
  }

  // Slack interactivity endpoint (actions + view_submission)
  @Post('interactivity')
  @HttpCode(200)
  async interactivity(@Body('payload') payloadRaw: string) {
    console.log('[Slack] interactivity raw len:', payloadRaw?.length || 0);
    const parsedUnknown: unknown = payloadRaw ? JSON.parse(payloadRaw) : {};

    if (isBlockActionsPayload(parsedUnknown)) {
      const action = parsedUnknown.actions?.[0];
      const userId = parsedUnknown.user?.id || 'unknown';
      const dateISO =
        typeof action?.value === 'string'
          ? action.value
          : new Date().toISOString().slice(0, 10);
      session[userId] = { dateISO };
      const openModal = async () => {
        // Пробуем вытащить уже подготовленный текст из блока сообщения
        const section = parsedUnknown.message?.blocks?.find(
          (b) =>
            b.type === 'section' &&
            b.text?.type === 'mrkdwn' &&
            typeof b.text.text === 'string',
        );
        const rawText = section?.text?.text || '';
        // Ожидаемый формат: "Ежедневный дайджест за YYYY-MM-DD:\n\n<контент>"
        const content = rawText.includes('\n\n')
          ? rawText.split('\n\n').slice(1).join('\n\n').trim()
          : rawText.trim();

        await this.slack.openDailyModal(parsedUnknown.trigger_id, {
          dateISO,
          devTasks: content || '—',
          devHours: '0',
          meetings: '',
          meetingHours: '0',
        });
      };
      if (action?.action_id === 'start_report') {
        openModal().catch((e) =>
          console.error('[Slack] openDailyModal error', e),
        );

        return '';
      }
    }

    if (
      isViewSubmissionPayload(parsedUnknown) &&
      parsedUnknown.view?.callback_id === 'daily_report_submit'
    ) {
      const stateValues = parsedUnknown.view?.state?.values || {};
      const userId = parsedUnknown.user?.id || 'unknown';

      let dateISO = new Date().toISOString().slice(0, 10);
      const metaUnknown: unknown = parsedUnknown.view?.private_metadata
        ? JSON.parse(parsedUnknown.view.private_metadata)
        : {};
      if (isObject(metaUnknown)) {
        const maybeDateISO = metaUnknown.dateISO;
        if (typeof maybeDateISO === 'string') {
          dateISO = maybeDateISO;
        }
      }

      const devTasks =
        typeof stateValues?.dev_tasks_block?.dev_tasks?.value === 'string'
          ? stateValues.dev_tasks_block.dev_tasks.value
          : '';
      const devHoursStr =
        typeof stateValues?.dev_hours_block?.dev_hours?.value === 'string'
          ? stateValues.dev_hours_block.dev_hours.value
          : '0';
      const devHours = Number(devHoursStr) || 0;
      const meetings =
        typeof stateValues?.meetings_block?.meetings?.value === 'string'
          ? stateValues.meetings_block.meetings.value
          : '';
      const meetingHoursStr =
        typeof stateValues?.meeting_hours_block?.meeting_hours?.value ===
        'string'
          ? stateValues.meeting_hours_block.meeting_hours.value
          : '0';
      const meetingHours = Number(meetingHoursStr) || 0;

      this.timesheet
        .appendEntry({ dateISO, devTasks, devHours, meetings, meetingHours })
        .then(() =>
          this.slack.postMessage(
            `Сохранил отчёт за ${dateISO}: ${devHours}ч разработки и ${meetingHours}ч встреч.`,
          ),
        )
        .catch((e) => console.error('[Slack] save entry error', e));

      session[userId] = { dateISO, devTasks };
      return '';
    }

    return '';
  }
}
