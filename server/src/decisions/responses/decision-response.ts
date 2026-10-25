import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptionResponse {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;
}

export class CriterionResponse {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 100 })
  weight: number;
}

export class ScoreResponse {
  @ApiProperty({ type: Number })
  optionId: number;

  @ApiProperty({ type: Number })
  criterionId: number;

  @ApiProperty({ type: Number, minimum: 1, maximum: 10 })
  score: number;
}

export class DecisionResponse {
  @ApiProperty({ type: Number, example: 101 })
  id: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ enum: ['Draft', 'Finalized'] })
  status: 'Draft' | 'Finalized';

  @ApiPropertyOptional({ type: Number })
  templateId?: number;

  @ApiProperty({ type: [OptionResponse] })
  options: OptionResponse[];

  @ApiProperty({ type: [CriterionResponse] })
  criteria: CriterionResponse[];

  @ApiProperty({ type: [ScoreResponse] })
  scores: ScoreResponse[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  finalizedAt?: string;

  @ApiProperty({ type: [String] })
  winnerNames: string[];
}
