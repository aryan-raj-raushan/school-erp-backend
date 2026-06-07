import { PartialType } from '@nestjs/swagger';
import { CreateSyllabusDto } from './create-syllabus.dto';

export class UpdateSyllabusDto extends PartialType(CreateSyllabusDto) {}
