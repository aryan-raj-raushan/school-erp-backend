import { PartialType } from '@nestjs/swagger';
import { CreateAdmissionSourceDto } from './create-admission-source.dto';

export class UpdateAdmissionSourceDto extends PartialType(CreateAdmissionSourceDto) {}