import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { GithubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TimesheetModule, GithubModule, AiModule, SettingsModule],
  providers: [SlackService],
  exports: [SlackService],
  controllers: [SlackController],
})
export class SlackModule {}
