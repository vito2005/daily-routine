import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from '../google-auth/google-auth.service';

@Injectable()
export class GoogleSheetsService {
  constructor(private readonly auth: GoogleAuthService) {}

  async appendRow(values: Array<string | number>) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID is not set');
    const authClient = await this.auth.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Time Tracking!A1:F1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  }

  async getLastWeekNumber() {
    const rows = await this.getRows('Time Tracking!A:A');
    // Find the last Monday header like "Week NN"
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const cell = (rows[i]?.[0] || '').toString();
      const m = cell.match(/^Week\s+(\d{1,2})/i);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  async getRows(range = 'Time Tracking!A:E') {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID is not set');
    const authClient = await this.auth.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return (res.data.values || []) as string[][];
  }

  async appendTo(range: string, values: Array<string | number>) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID is not set');
    const authClient = await this.auth.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
  }

  private getISOWeek(date: Date): number {
    const tmp = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return weekNo;
  }

  // Ensure a "Week NN" header row exists before Monday entries
  async ensureWeekHeaderBefore(dateISO: string) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    if (!spreadsheetId) return;
    const date = new Date(dateISO);
    const isMonday = date.getDay() === 1;
    if (!isMonday) return;

    const week = this.getISOWeek(date).toString().padStart(2, '0');
    const label = `Week ${week}`;

    const authClient = await this.auth.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Time Tracking!A:A',
    });
    const colA = (res.data.values || []).flat();
    if (colA.includes(label)) {
      console.log('Week header already exists', label);
      return;
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Time Tracking!A1:F1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[label, '', '', '', '', '']] },
    });
  }

  async updateLastPendingInvoiceToPaid() {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID is not set');
    const authClient = await this.auth.getAuthorizedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const range = 'Invoices!A:E';
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = (res.data.values || []) as string[][];
    if (values.length <= 1) return false;
    // Find the last row with status != Paid (or empty)
    for (let i = values.length - 1; i >= 1; i -= 1) {
      const row = values[i] || [];
      const status = row[4] || '';
      if (String(status).toLowerCase() !== 'paid') {
        const target = `Invoices!E${i + 1}`; // +1 due to A1 1-based index
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: target,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Paid']] },
        });
        return true;
      }
    }
    return false;
  }
}
