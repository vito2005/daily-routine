import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { GoogleSheetsService } from '../google/google-sheets/google-sheets.service';

export type HoursSummary = {
  devHours: number;
  meetingHours: number;
  total: number;
};

@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);
  constructor(private readonly sheets: GoogleSheetsService) {}

  private getFilePath(): string {
    const configuredPath =
      process.env.TIMESHEET_XLSX_PATH || './data/timesheet.xlsx';
    return path.resolve(process.cwd(), configuredPath);
  }

  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private parseCellDate(cell: unknown): dayjs.Dayjs | null {
    if (typeof cell === 'number') {
      const ms = Math.round((cell - 25569) * 24 * 60 * 60 * 1000);
      const d = new Date(ms);
      return dayjs(d);
    }
    if (typeof cell === 'string') {
      const dateStr = cell.slice(0, 11);
      const parsed = dayjs(dateStr, 'DD MMM YYYY');
      return parsed.isValid() ? parsed : null;
    }
    return null;
  }

  async appendEntry(params: {
    dateISO?: string; // YYYY-MM-DD
    devTasks: string;
    devHours: number;
    meetings: string;
    meetingHours: number;
  }): Promise<void> {
    const filePath = this.getFilePath();
    this.ensureDirectoryExists(filePath);

    const date = params.dateISO ? dayjs(params.dateISO) : dayjs();
    const dateDisplay = date.format('DD MMM YYYY');
    const day = date.format('dddd');

    const newRow: Array<string | number> = [
      dateDisplay,
      day,
      params.devTasks || '',
      params.devHours ?? 0,
      params.meetings || '',
      params.meetingHours ?? 0,
    ];

    try {
      await this.sheets.ensureWeekHeaderBefore(date.toISOString());
      await this.sheets.appendRow(newRow);
    } catch (err: unknown) {
      this.logger.warn(`Google Sheets append failed: ${String(err)}`);
    }
  }

  async sumHoursForLastTwoWeeks(): Promise<HoursSummary> {
    // First, try Google Sheets
    try {
      const rows = await this.sheets.getRows();
      // Expect header in the first row
      const data = rows.slice(1);
      const twoWeeksAgo = dayjs().subtract(14, 'day');
      let devHours = 0;
      let meetingHours = 0;
      for (const row of data) {
        const parsed = this.parseCellDate(row[0]);
        if (!parsed || parsed.isBefore(twoWeeksAgo)) continue;
        const d = Number(row[2]) || 0;
        const m = Number(row[4]) || 0;
        devHours += d;
        meetingHours += m;
      }
      return { devHours, meetingHours, total: devHours + meetingHours };
    } catch (err: unknown) {
      this.logger.warn(
        `Sheets not available, fallback to Excel: ${String(err)}`,
      );
    }

    // Fallback: read local Excel file
    const filePath = this.getFilePath();
    if (!fs.existsSync(filePath)) {
      return { devHours: 0, meetingHours: 0, total: 0 };
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'Time Tracking';
    const worksheet =
      workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const data = rows.slice(1);
    const twoWeeksAgo = dayjs().subtract(14, 'day');
    let devHours = 0;
    let meetingHours = 0;
    for (const rowAny of data) {
      const row = rowAny as unknown[];
      const parsed = this.parseCellDate(row[0]);
      if (!parsed || parsed.isBefore(twoWeeksAgo)) continue;
      const d = Number(row[2]) || 0;
      const m = Number(row[4]) || 0;
      devHours += d;
      meetingHours += m;
    }
    return { devHours, meetingHours, total: devHours + meetingHours };
  }
}
