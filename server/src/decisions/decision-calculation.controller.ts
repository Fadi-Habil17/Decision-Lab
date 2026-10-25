import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DecisionCalculationService } from './decision-calculation.service.js';
import { DecisionResultResponse } from './responses/decision-result.response.js';
import type { DecisionDocument } from './schemas/decision.schema.js';
import { DecisionResponse } from './responses/decision-response.js';

@ApiTags('Decision calculation and lifecycle')
@ApiNotFoundResponse({ description: 'Decision not found.' })
@ApiBadRequestResponse({
  description:
    'Invalid numeric ID. Calculation/finalization also reject invalid readiness; missing-score errors list every missing pair.',
})
@ApiConflictResponse({
  description:
    'Operation conflicts with lifecycle state, or the decision changed during an update.',
})
@Controller('decisions')
export class DecisionCalculationController {
  constructor(
    @Inject(DecisionCalculationService)
    private readonly calculationService: DecisionCalculationService,
  ) {}

  @Post(':id/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate rankings and explanations',
    description:
      'Uses current persisted Draft data. Does not save calculated results. Finalized decisions return 409.',
  })
  @ApiParam({ name: 'id', type: Number, example: 101 })
  @ApiOkResponse({ type: DecisionResultResponse })
  calculate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DecisionResultResponse> {
    return this.calculationService.calculate(id);
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalize a ready Draft decision',
    description:
      'Validates current data and persists Finalized status, finalization time, and computed winner names.',
  })
  @ApiParam({ name: 'id', type: Number, example: 101 })
  @ApiOkResponse({ type: DecisionResponse })
  finalize(@Param('id', ParseIntPipe) id: number): Promise<DecisionDocument> {
    return this.calculationService.finalize(id);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reopen a Finalized decision',
    description:
      'Persists Draft status, clears winner names, and removes finalizedAt. An already-Draft decision returns 409.',
  })
  @ApiParam({ name: 'id', type: Number, example: 101 })
  @ApiOkResponse({ type: DecisionResponse })
  reopen(@Param('id', ParseIntPipe) id: number): Promise<DecisionDocument> {
    return this.calculationService.reopen(id);
  }
}
