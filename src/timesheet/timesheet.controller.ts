import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';

@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheet: TimesheetService) {}

  // Web form will POST confirmed data for the day
  @Post('append')
  async append(
    @Body()
    body: {
      dateISO?: string;
      devTasks: string;
      devHours: number;
      meetings: string;
      meetingHours: number;
    },
  ) {
    await this.timesheet.appendEntry(body);
    return { ok: true };
  }

  @Get('form')
  form(@Query('dateISO') dateISO?: string) {
    const dateValue = dateISO ?? '';
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Timesheet</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; max-width: 720px; margin: 0 auto; }
      label { display: block; margin: 12px 0 6px; font-weight: 600; }
      textarea, input { width: 100%; padding: 10px; font-size: 14px; }
      button { margin-top: 16px; padding: 10px 16px; font-size: 14px; cursor: pointer; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    </style>
  </head>
  <body>
    <h1>Confirm daily report</h1>
    <form method="POST" action="/timesheet/append">
      <label>Date (YYYY-MM-DD)</label>
      <input name="dateISO" value="${dateValue}" placeholder="2025-06-24" />

      <label>Dev tasks</label>
      <textarea name="devTasks" rows="5" placeholder="Briefly describe development tasks"></textarea>
      <div class="row">
        <div>
          <label>Dev hours</label>
          <input name="devHours" type="number" step="0.25" min="0" value="0" />
        </div>
        <div>
          <label>Meeting hours</label>
          <input name="meetingHours" type="number" step="0.25" min="0" value="0" />
        </div>
      </div>
      <label>Meetings / discussions</label>
      <textarea name="meetings" rows="3" placeholder="Calls and discussions"></textarea>
      <button type="submit">Save</button>
    </form>
  </body>
 </html>`;
    return html;
  }
}
