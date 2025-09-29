import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth/google-auth.service';
import { GoogleSheetsService } from './google-sheets/google-sheets.service';
import { SettingsModule } from '../settings/settings.module';
import { GoogleAuthController } from './google-auth/google-auth.controller';

@Module({
  imports: [SettingsModule],
  providers: [GoogleAuthService, GoogleSheetsService],
  exports: [GoogleAuthService, GoogleSheetsService],
  controllers: [GoogleAuthController],
})
export class GoogleModule {}
