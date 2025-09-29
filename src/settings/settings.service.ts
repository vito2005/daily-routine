import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type SettingsData = {
  googleSheetsId?: string;
  timeTrackingTab?: string;
  invoicesTab?: string;
};

@Injectable()
export class SettingsService {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), 'data', 'settings.json');
  }

  private read(): SettingsData {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as SettingsData;
    } catch {
      return {};
    }
  }

  private write(data: SettingsData): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getSheetsId(): string {
    const id = this.read().googleSheetsId;
    if (!id) {
      throw new Error(
        'Google Sheets ID is not configured. Use /settings to set it.',
      );
    }
    return id;
  }

  setSheetsId(id: string): void {
    const data = this.read();
    data.googleSheetsId = id.trim();
    this.write(data);
  }
}
