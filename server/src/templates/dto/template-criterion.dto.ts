import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { originalValue, trimText } from './template-field.transforms.js';

export class TemplateCriterionDto {
  @ApiProperty({
    type: String,
    description: 'Criterion name, trimmed before validation.',
    example: 'Performance',
  })
  @Transform(trimText, { toClassOnly: true })
  @IsString({ message: 'Criterion name must be a string' })
  @IsNotEmpty({ message: 'Criterion name must not be empty' })
  name!: string;

  @ApiProperty({
    type: Number,
    description: 'Integer weight from 1 to 100.',
    minimum: 1,
    maximum: 100,
    example: 30,
  })
  @Transform(originalValue, { toClassOnly: true })
  @IsInt({ message: 'Criterion weight must be a whole number' })
  @Min(1, { message: 'Criterion weight must be at least 1' })
  @Max(100, { message: 'Criterion weight must be at most 100' })
  weight!: number;
}
