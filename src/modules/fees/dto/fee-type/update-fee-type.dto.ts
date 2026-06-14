import { PartialType } from '@nestjs/swagger';
import { CreateFeeTypeDto } from './create-fee-type.dto';

export class UpdateFeeTypeDto extends PartialType(CreateFeeTypeDto) {}
