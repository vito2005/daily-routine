import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [GoogleModule],
  providers: [TimesheetService],
  controllers: [TimesheetController],
  exports: [TimesheetService],
})
export class TimesheetModule {}
