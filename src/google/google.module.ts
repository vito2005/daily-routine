import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth/google-auth.service';
import { GoogleSheetsService } from './google-sheets/google-sheets.service';
import { GoogleAuthController } from './google-auth/google-auth.controller';

@Module({
  providers: [GoogleAuthService, GoogleSheetsService],
  exports: [GoogleAuthService, GoogleSheetsService],
  controllers: [GoogleAuthController],
})
export class GoogleModule {}
