import { PartialType } from '@nestjs/swagger';
import { CreateFeeMasterTypeDto } from './create-fee-master-type.dto';

export class UpdateFeeMasterTypeDto extends PartialType(CreateFeeMasterTypeDto) {}
