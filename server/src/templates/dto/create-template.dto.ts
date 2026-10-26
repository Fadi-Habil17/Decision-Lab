import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TemplateCriterionDto } from './template-criterion.dto.js';
import { trimText } from './template-field.transforms.js';

export class CreateTemplateDto {
  @ApiProperty({
    type: String,
    description: 'Template name, trimmed before validation.',
    example: 'Laptop Purchase',
  })
  @Transform(trimText, { toClassOnly: true })
  @IsString({ message: 'Template name must be a string' })
  @IsNotEmpty({ message: 'Template name must not be empty' })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'Short template description.',
    example: 'Choose a laptop for the bootcamp.',
  })
  @Transform(trimText, { toClassOnly: true })
  @IsString({ message: 'Template description must be a string' })
  @IsNotEmpty({ message: 'Template description must not be empty' })
  description!: string;

  @ApiProperty({
    type: [TemplateCriterionDto],
    description:
      'Criteria with distinct names and integer weights totaling exactly 100.',
    minItems: 2,
    maxItems: 8,
  })
  @IsArray({ message: 'Template criteria must be an array' })
  @ArrayMinSize(2, { message: 'A template must have at least 2 criteria' })
  @ArrayMaxSize(8, { message: 'A template must have at most 8 criteria' })
  @IsObject({ each: true, message: 'Each criterion must be an object' })
  @ValidateNested({ each: true })
  @Type(() => TemplateCriterionDto)
  criteria!: TemplateCriterionDto[];
}
