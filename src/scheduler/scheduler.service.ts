import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GithubService } from '../github/github.service';
import { SlackService } from '../slack/slack.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import dayjs from 'dayjs';
import { TimesheetService } from '../timesheet/timesheet.service';
import { GoogleSheetsService } from '../google/google-sheets/google-sheets.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(
    private readonly github: GithubService,
    private readonly slack: SlackService,
    private readonly billing: BillingService,
    private readonly email: EmailService,
    private readonly timesheet: TimesheetService,
    private readonly sheets: GoogleSheetsService,
  ) {}

  // Daily digest at 18:00 local time
  //@Cron(CronExpression.EVERY_DAY_AT_6PM)
  @Cron('30 20 * * 1-5')
  async handleDailyDigest() {
    this.logger.log('Running daily digest job...');
    const digest = await this.github.getDailyCommitDigest(new Date());
    const today = new Date().toISOString().slice(0, 10);
    // If there are subscribers, DM each; otherwise fallback to default channel/DM env
    try {
      const subs = this.slack.listSubscribers();
      if (subs.length > 0) {
        for (const userId of subs) {
          await this.slack.postDigestDM(userId, { digest, dateISO: today });
        }
        return;
      }
    } catch (e) {
      this.logger.warn(`Fetching subscribers failed: ${String(e)}`);
    }
    await this.slack.postDigestWithActions({ digest, dateISO: today });
  }

  // Every two weeks on Friday at 18:00 — final report and invoice
  @Cron('0 18 * * 5')
  async handleBiweeklyInvoice() {
    // Exit if this Friday is not the end of a 2-week period
    const weekNumber = Number.parseInt(dayjs().format('W'), 10);
    if (weekNumber % 2 !== 0) return;

    const hoursSummary = await this.timesheet.sumHoursForLastTwoWeeks();
    const hours: number = Number(hoursSummary.total || 0);
    const rate = Number(process.env.HOURLY_RATE || 50);
    const currency = process.env.CURRENCY || 'USD';
    const clientName = process.env.CLIENT_NAME || 'Client';
    const invoiceNumber = `${dayjs().format('YYYYMMDD')}`;
    const dateISO = dayjs().format('YYYY-MM-DD');

    const pdfPath = await this.billing.generateInvoice({
      invoiceNumber,
      dateISO,
      clientName,
      hours,
      rate,
      currency,
    });

    const to = process.env.CLIENT_EMAIL || '';
    await this.email.createInvoiceDraft({
      to,
      subject: `Invoice ${invoiceNumber}`,
      body: `Hello! For the last 2 weeks: ${hours.toFixed(2)}h. Please find the invoice attached.`,
      pdfPath,
    });

    // Append row to Invoices sheet (if Sheets is configured)
    try {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const invoiceRow = [
        dateISO,
        invoiceNumber,
        hours.toFixed(2),
        `${rate} ${currency}`,
        `${baseUrl}`,
      ];
      await this.sheets.appendTo('Invoices!A1:E1', invoiceRow);
    } catch (err: unknown) {
      this.logger.warn(`Failed to append invoice row: ${String(err)}`);
    }
  }

  // Check payment daily and mark the last unpaid invoice as Paid
  @Cron('0 9 * * 1-5')
  async handlePaymentCheck() {
    const paid: boolean = await this.email.checkPaymentReceived({
      from: process.env.CLIENT_EMAIL_FROM || undefined,
      subjectIncludes:
        process.env.PAYMENT_SUBJECT_INCLUDES || 'payment received',
      days: 14,
    });
    if (!paid) return;
    try {
      await this.sheets.updateLastPendingInvoiceToPaid();
    } catch (err: unknown) {
      this.logger.warn(`Failed to mark invoice as paid: ${String(err)}`);
    }
  }
}
