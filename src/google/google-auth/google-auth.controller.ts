import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

@Controller('google-auth')
export class GoogleAuthController {
  constructor(private readonly auth: GoogleAuthService) {}

  @Get('init')
  @Redirect()
  init() {
    const url = this.auth.getAuthUrl();
    return { url };
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    if (!code) return { ok: false, error: 'Missing code' };
    await this.auth.exchangeCodeAndSaveToken(code);
    return { ok: true };
  }
}
