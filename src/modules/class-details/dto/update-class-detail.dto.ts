import { PartialType } from '@nestjs/swagger';
import { CreateClassDetailDto } from './create-class-detail.dto';

export class UpdateClassDetailDto extends PartialType(CreateClassDetailDto) {}
