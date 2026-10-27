import { OmitType } from '@nestjs/swagger';
import { UpdateSchoolDto } from './update-school.dto';

export class UpdateSchoolProfileDto extends OmitType(UpdateSchoolDto, [
  'is_active',
  'admin_first_name',
  'admin_last_name',
  'admin_dial_code',
  'admin_phone',
  'admin_email',
] as const) {}
