import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GoogleAuthService {
  private tokenPath = path.resolve(process.cwd(), 'data', 'google-token.json');

  private buildOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/google-auth/callback';
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  async getAuthorizedClient() {
    const oAuth2Client = this.buildOAuth2Client();
    if (fs.existsSync(this.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }
    // If there is no token — ask for authorization
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
    throw new Error(`Google authorization required. Open: ${authUrl}`);
  }

  getAuthUrl(): string {
    const oAuth2Client = this.buildOAuth2Client();
    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }

  async exchangeCodeAndSaveToken(code: string): Promise<void> {
    const oAuth2Client = this.buildOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    const dir = path.dirname(this.tokenPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
  }
}
