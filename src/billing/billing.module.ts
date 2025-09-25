import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [BillingService],
  exports: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
