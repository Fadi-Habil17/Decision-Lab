import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Safe trim: only touches strings, so non-strings still fail the @IsString checks. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const LIST_STATUSES = ['Draft', 'Finalized'] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

// ---------------------------------------------------------------- decisions

export class CreateDecisionDto {
  @ApiProperty({ example: 'Which laptop should I buy?', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required and cannot be blank' })
  @MaxLength(150, { message: 'title cannot be longer than 150 characters' })
  title: string;

  @ApiPropertyOptional({ example: 'Work + travel machine for the next 3-4 years.', maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description cannot be longer than 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Create the decision from this template (copies its criteria and weights). Omit for a blank decision.',
  })
  @IsOptional()
  @IsInt({ message: 'templateId must be a whole number' })
  @Min(1, { message: 'templateId must be at least 1' })
  templateId?: number;
}

/** PATCH body: title/description only (templateId is inherited but rejected by the service). */
export class UpdateDecisionDto extends PartialType(CreateDecisionDto) {}

/** Query string of GET /decisions (public). Both filters are optional and combined with AND. */
export class ListDecisionsQueryDto {
  @ApiPropertyOptional({ enum: LIST_STATUSES, description: 'Only decisions with this status. Omit for all decisions' })
  @IsOptional()
  @Type(() => String)
  @IsIn(LIST_STATUSES, { message: 'status must be Draft or Finalized' })
  status?: ListStatus;

  @ApiPropertyOptional({ example: 'laptop', description: 'Case-insensitive partial match on the title' })
  @IsOptional()
  @Type(() => String)
  @Transform(trim)
  @IsString({ message: 'title must be a string' })
  @MaxLength(150, { message: 'title cannot be longer than 150 characters' })
  title?: string;
}

// ------------------------------------------------------------------ options

export class CreateOptionDto {
  @ApiProperty({ example: 'MacBook Air M3', maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required and cannot be blank' })
  @MaxLength(100, { message: 'name cannot be longer than 100 characters' })
  name: string;
}

export class UpdateOptionDto extends CreateOptionDto {}

// ----------------------------------------------------------------- criteria

export class CreateCriterionDto {
  @ApiProperty({ example: 'Performance', maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required and cannot be blank' })
  @MaxLength(100, { message: 'name cannot be longer than 100 characters' })
  name: string;

  @ApiProperty({ example: 30, minimum: 1, maximum: 100, description: 'Whole number from 1 to 100' })
  @IsInt({ message: 'weight must be a whole number' })
  @Min(1, { message: 'weight must be at least 1' })
  @Max(100, { message: 'weight cannot be more than 100' })
  weight: number;
}

/** PATCH body: rename and/or change the weight. */
export class UpdateCriterionDto extends PartialType(CreateCriterionDto) {}

// ------------------------------------------------------------------- scores

export class UpsertScoreDto {
  @ApiProperty({ example: 1, description: 'id of an option that belongs to this decision' })
  @IsInt({ message: 'optionId must be a whole number' })
  @Min(1, { message: 'optionId must be at least 1' })
  optionId: number;

  @ApiProperty({ example: 2, description: 'id of a criterion that belongs to this decision' })
  @IsInt({ message: 'criterionId must be a whole number' })
  @Min(1, { message: 'criterionId must be at least 1' })
  criterionId: number;

  @ApiProperty({ example: 8, minimum: 1, maximum: 10, description: 'Whole number from 1 to 10 (10 = best for me)' })
  @IsInt({ message: 'score must be a whole number' })
  @Min(1, { message: 'score must be at least 1' })
  @Max(10, { message: 'score cannot be more than 10' })
  score: number;
}