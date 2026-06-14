import { PartialType } from '@nestjs/swagger';
import { CreateFeeLateRuleDto } from './create-fee-late-rule.dto';

export class UpdateFeeLateRuleDto extends PartialType(CreateFeeLateRuleDto) {}
