import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto.js';

// PATCH may omit a field; explicitly sending null must still fail validation.
export class UpdateTemplateDto extends PartialType(CreateTemplateDto, {
  skipNullProperties: false,
}) {}
