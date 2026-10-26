import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ExplanationResult } from './engine/calculation.types.js';
import { explainOptions } from './engine/explain-options.js';
import type { DecisionResultResponse } from './responses/decision-result.response.js';
import { formatDecisionResult } from './responses/format-decision-result.js';
import { Decision, type DecisionDocument } from './schemas/decision.schema.js';

type CalculationOperation = 'calculate' | 'finalize';

type SuccessfulExplanation = Extract<ExplanationResult, { success: true }>;

@Injectable()
export class DecisionCalculationService {
  private readonly logger = new Logger(DecisionCalculationService.name);

  constructor(
    @InjectModel(Decision.name)
    private readonly decisionModel: Model<Decision>,
  ) {}

  async calculate(id: number): Promise<DecisionResultResponse> {
    const decision = await this.findDecision(id, 'calculate');

    this.assertDraft(decision, 'calculate');

    const calculation = this.calculateCurrent(decision, 'calculate');

    return formatDecisionResult(decision, calculation);
  }

  async finalize(id: number): Promise<DecisionDocument> {
    const decision = await this.findDecision(id, 'finalize');

    this.assertDraft(decision, 'finalize');

    const calculation = this.calculateCurrent(decision, 'finalize');
    const snapshot = decision.toObject();

    const finalized = await this.decisionModel
      .findOneAndUpdate(
        {
          _id: decision._id,
          status: 'Draft',
          updatedAt: snapshot.updatedAt,
          title: snapshot.title,
          options: { $eq: snapshot.options },
          criteria: { $eq: snapshot.criteria },
          scores: { $eq: snapshot.scores },
        },
        {
          $set: {
            status: 'Finalized',
            finalizedAt: new Date(),
            winnerNames: [...calculation.winners],
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    if (!finalized) {
      this.logger.warn(
        `Rejected finalization for decision ${id}: decision changed during finalization.`,
      );

      return this.rejectChangedDecision(decision);
    }

    this.logger.log(
      `Finalized decision ${id} "${finalized.title}". Winners: ${finalized.winnerNames.join(', ')}.`,
    );

    return finalized;
  }

  async reopen(id: number): Promise<DecisionDocument> {
    const decision = await this.findDecision(id, 'reopen');

    if (decision.status !== 'Finalized') {
      throw new ConflictException('Only a Finalized decision can be reopened.');
    }

    const reopened = await this.decisionModel
      .findOneAndUpdate(
        {
          _id: decision._id,
          status: 'Finalized',
          updatedAt: decision.updatedAt,
          finalizedAt: decision.finalizedAt,
        },
        {
          $set: {
            status: 'Draft',
            winnerNames: [],
          },
          $unset: {
            finalizedAt: 1,
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    if (!reopened) {
      return this.rejectChangedDecision(decision);
    }

    this.logger.log(`Reopened decision ${id} "${reopened.title}".`);

    return reopened;
  }

  private async findDecision(
    id: number,
    operation: CalculationOperation | 'reopen',
  ): Promise<DecisionDocument> {
    const decision = await this.decisionModel.findOne({ id }).exec();

    if (!decision) {
      if (operation === 'calculate') {
        this.logger.warn(
          `Rejected calculation for decision ${id}: decision not found.`,
        );
      }

      throw new NotFoundException(`Decision ${id} was not found.`);
    }

    return decision;
  }

  private assertDraft(
    decision: DecisionDocument,
    operation: CalculationOperation,
  ): void {
    if (decision.status === 'Finalized') {
      this.logger.warn(
        `Rejected ${operation} for decision ${decision.id} "${decision.title}": decision is finalized.`,
      );

      throw new ConflictException(
        'Reopen the decision before calculating or finalizing again.',
      );
    }
  }

  private calculateCurrent(
    decision: DecisionDocument,
    operation: CalculationOperation,
  ): SuccessfulExplanation {
    const calculation = explainOptions(decision);

    if (!calculation.success) {
      this.logger.warn(
        `Rejected ${operation} for decision ${decision.id} "${decision.title}": ${calculation.validation.errors.join('; ')}`,
      );

      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Decision is not ready for calculation.',
        errors: calculation.validation.errors,
        missingScores: calculation.validation.missingScores,
      });
    }

    return calculation;
  }

  private async rejectChangedDecision(
    decision: DecisionDocument,
  ): Promise<never> {
    const stillExists = await this.decisionModel
      .exists({ _id: decision._id })
      .exec();

    if (!stillExists) {
      throw new NotFoundException(`Decision ${decision.id} was not found.`);
    }

    throw new ConflictException(
      'The decision changed during the operation. Reload and retry.',
    );
  }
}
