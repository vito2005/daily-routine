import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubModule } from './github/github.module';
import { SlackModule } from './slack/slack.module';
import { AiModule } from './ai/ai.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { EmailModule } from './email/email.module';
import { BillingModule } from './billing/billing.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { GoogleModule } from './google/google.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GithubModule,
    SlackModule,
    TimesheetModule,
    EmailModule,
    BillingModule,
    SchedulerModule,
    GoogleModule,
    AiModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
