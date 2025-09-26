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
      range: 'Timesheet!A1:E1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  }

  async getRows(range = 'Timesheet!A:E') {
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
