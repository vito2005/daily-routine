import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from '../google/google-auth/google-auth.service';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  constructor(private readonly auth: GoogleAuthService) {}

  private encodeMessageRaw(
    to: string,
    subject: string,
    body: string,
    attachments?: { filename: string; content: Buffer; contentType: string }[],
  ): string {
    const boundary = 'foo_bar_baz';
    const parts: string[] = [];
    parts.push(`Content-Type: multipart/mixed; boundary=${boundary}`);
    parts.push('MIME-Version: 1.0');
    parts.push(`To: ${to}`);
    parts.push(`Subject: ${subject}`);
    parts.push('');
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset=UTF-8');
    parts.push('');
    parts.push(body);

    for (const a of attachments || []) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${a.contentType}; name="${a.filename}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${a.filename}"`);
      parts.push('');
      parts.push(a.content.toString('base64'));
    }
    parts.push(`--${boundary}--`);
    const raw = Buffer.from(parts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return raw;
  }

  async createInvoiceDraft(params: {
    to: string;
    subject: string;
    body: string;
    pdfPath: string;
  }) {
    const authClient = await this.auth.getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    const pdfContent = fs.readFileSync(params.pdfPath);
    const raw = this.encodeMessageRaw(params.to, params.subject, params.body, [
      {
        filename: 'invoice.pdf',
        content: pdfContent,
        contentType: 'application/pdf',
      },
    ]);
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw,
        },
      },
    });
    return res.data;
  }

  async checkPaymentReceived(params: {
    from?: string;
    subjectIncludes?: string;
    days?: number;
  }): Promise<boolean> {
    const authClient = await this.auth.getAuthorizedClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    const from = params.from ? `from:${params.from}` : '';
    const subject = params.subjectIncludes
      ? `subject:${params.subjectIncludes}`
      : '';
    const afterDays = params.days ?? 14;
    const after = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000);
    const q = [`newer_than:${afterDays}d`, from, subject]
      .filter(Boolean)
      .join(' ');
    const res = await gmail.users.messages.list({ userId: 'me', q });
    return (res.data.messages?.length || 0) > 0;
  }
}
