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

  // Ежедневный дайджест в 18:00 локального времени
  //@Cron(CronExpression.EVERY_DAY_AT_6PM)
  @Cron('11 19 * * *')
  async handleDailyDigest() {
    this.logger.log('Running daily digest job...');
    const digest = await this.github.getDailyCommitDigest(new Date());
    const today = new Date().toISOString().slice(0, 10);
    await this.slack.postDigestWithActions({ digest, dateISO: today });
  }

  // Каждые две недели по пятницам в 18:00 — финальный отчёт и инвойс
  @Cron('0 18 * * 5')
  async handleBiweeklyInvoice() {
    // Если сегодня не конец двухнедельного периода — выходим
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
      body: `Здравствуйте! За последние 2 недели: ${hours.toFixed(2)} ч. Прошу оплатить инвойс во вложении.`,
      pdfPath,
    });

    // Логируем строку в лист Invoices (если Sheets настроен)
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

  // Ежедневно проверяем оплату и помечаем последнюю неоплаченную как Paid
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
