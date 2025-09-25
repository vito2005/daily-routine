import { Body, Controller, Post } from '@nestjs/common';
import { BillingService } from './billing.service';
import { EmailService } from '../email/email.service';
import dayjs from 'dayjs';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly email: EmailService,
  ) {}

  @Post('generate')
  async generate(
    @Body()
    body: {
      invoiceNumber?: string;
      dateISO?: string;
      clientName?: string;
      hours: number;
      rate?: number;
      currency?: string;
      to?: string;
    },
  ) {
    const invoiceNumber = body.invoiceNumber || dayjs().format('YYYYMMDDHHmm');
    const dateISO = body.dateISO || dayjs().format('YYYY-MM-DD');
    const clientName = body.clientName || process.env.CLIENT_NAME || 'Client';
    const rate = body.rate ?? Number(process.env.HOURLY_RATE || 50);
    const currency = body.currency || process.env.CURRENCY || 'USD';
    const to = body.to || process.env.CLIENT_EMAIL || '';

    const pdfPath = await this.billing.generateInvoice({
      invoiceNumber,
      dateISO,
      clientName,
      hours: body.hours,
      rate,
      currency,
    });

    const subject = `Invoice ${invoiceNumber}`;
    const bodyText = `Здравствуйте! Во вложении инвойс от ${dateISO}.`;
    const draft = await this.email.createInvoiceDraft({
      to,
      subject,
      body: bodyText,
      pdfPath,
    });

    return { ok: true, pdfPath, draftId: draft.id };
  }
}
