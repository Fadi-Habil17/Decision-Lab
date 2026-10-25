import { ApiProperty } from '@nestjs/swagger';

export class CriterionContributionResponse {
  @ApiProperty({ type: Number })
  criterionId: number;

  @ApiProperty({ type: String })
  criterionName: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 100 })
  weight: number;

  @ApiProperty({ type: Number, minimum: 1, maximum: 10 })
  score: number;

  @ApiProperty({ type: Number })
  points: number;
}

export class RankedOptionResponse {
  @ApiProperty({ type: Number })
  optionId: number;

  @ApiProperty({ type: String })
  optionName: string;

  @ApiProperty({
    type: Number,
    description: 'Competition rank: shared ranks can produce 1, 1, 3.',
  })
  rank: number;

  @ApiProperty({ type: Number, example: 72 })
  exactTotal: number;

  @ApiProperty({
    type: String,
    example: '72.0',
    description: 'One-decimal display value. Never used for ranking.',
  })
  displayTotal: string;

  @ApiProperty({ type: Boolean })
  isTied: boolean;

  @ApiProperty({ type: [CriterionContributionResponse] })
  contributions: CriterionContributionResponse[];

  @ApiProperty({ type: CriterionContributionResponse })
  strongestCriterion: CriterionContributionResponse;

  @ApiProperty({ type: CriterionContributionResponse })
  weakestCriterion: CriterionContributionResponse;

  @ApiProperty({
    type: Number,
    description:
      'Zero for first/shared-tied options; otherwise the exact gap from the row above.',
  })
  gapToAbove: number;
}

export class DecisionResultResponse {
  @ApiProperty({ type: Number, example: 101 })
  decisionId: number;

  @ApiProperty({ type: String, example: 'Laptop comparison' })
  title: string;

  @ApiProperty({ enum: ['Draft', 'Finalized'] })
  status: 'Draft' | 'Finalized';

  @ApiProperty({ type: [RankedOptionResponse] })
  ranked: RankedOptionResponse[];

  @ApiProperty({
    type: [String],
    description: 'Names of every option sharing first rank.',
  })
  winners: string[];
}
