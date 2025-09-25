import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { GithubModule } from '../github/github.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [TimesheetModule, GithubModule, AiModule],
  providers: [SlackService],
  exports: [SlackService],
  controllers: [SlackController],
})
export class SlackModule {}
