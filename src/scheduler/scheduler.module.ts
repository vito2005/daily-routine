import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { GithubModule } from '../github/github.module';
import { SlackModule } from '../slack/slack.module';
import { BillingModule } from '../billing/billing.module';
import { EmailModule } from '../email/email.module';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [
    GithubModule,
    SlackModule,
    BillingModule,
    EmailModule,
    TimesheetModule,
    GoogleModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
