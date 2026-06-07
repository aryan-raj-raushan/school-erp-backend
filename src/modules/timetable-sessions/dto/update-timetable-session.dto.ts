import { PartialType } from '@nestjs/swagger';
import { CreateTimetableSessionDto } from './create-timetable-session.dto';

export class UpdateTimetableSessionDto extends PartialType(CreateTimetableSessionDto) {}
