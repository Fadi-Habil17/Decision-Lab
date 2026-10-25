import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { CountersService } from '../common/counters/counters.service';
import { CriterionItem } from '../common/schemas/criterion.schema';
import { TemplatesService } from '../templates/templates.service';
import {
  CreateCriterionDto,
  CreateDecisionDto,
  CreateOptionDto,
  ListDecisionsQueryDto,
  UpdateCriterionDto,
  UpdateDecisionDto,
  UpdateOptionDto,
  UpsertScoreDto,
} from './dto/decision.dto';
import { MAX_ITEMS, sumWeights } from './engine/decision-engine';
import { Decision, DecisionDocument, OptionItem, ScoreItem } from './schemas/decision.schema';

export type DecisionView = Decision & { weightTotal: number; weightDifference: number };

/** Exact text required by the upgrade spec for a non-owner. */
export const NOT_OWNER_MESSAGE = 'You do not have permission to modify this decision';

const nextId = (items: { id: number }[]) => items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
const normalize = (name: string) => name.trim().toLowerCase();
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(
    @InjectModel(Decision.name) private readonly model: Model<DecisionDocument>,
    private readonly counters: CountersService,
    private readonly templates: TemplatesService,
  ) {}

  // ------------------------------------------------------------ shared helpers

  /** Loads a decision by its numeric app id or throws 404. */
  async load(id: number): Promise<DecisionDocument> {
    const doc = await this.model.findOne({ id });
    if (!doc) throw new NotFoundException(`Decision ${id} not found`);
    return doc;
  }

  assertOwner(doc: DecisionDocument, userId: number): void {
    if (doc.ownerId !== userId) throw new ForbiddenException(NOT_OWNER_MESSAGE);
  }

  assertEditable(doc: DecisionDocument): void {
    if (doc.status === 'Finalized') {
      throw new ConflictException(
        `Decision ${doc.id} is finalized and locked. Reopen it before making changes`,
      );
    }
  }

  async loadForEdit(id: number, userId: number): Promise<DecisionDocument> {
    const doc = await this.load(id);
    this.assertOwner(doc, userId);
    this.assertEditable(doc);
    return doc;
  }

  view(doc: DecisionDocument): DecisionView {
    const plain = doc.toJSON() as unknown as Decision;
    const weightTotal = sumWeights(plain.criteria);
    return { ...plain, weightTotal, weightDifference: weightTotal - 100 };
  }

  private async persist(doc: DecisionDocument): Promise<DecisionView> {
    await doc.save();
    return this.view(doc);
  }

  private options(doc: DecisionDocument): OptionItem[] {
    return doc.options.map((o) => ({ id: o.id, name: o.name }));
  }
  private criteria(doc: DecisionDocument): CriterionItem[] {
    return doc.criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight }));
  }
  private scores(doc: DecisionDocument): ScoreItem[] {
    return doc.scores.map((s) => ({ optionId: s.optionId, criterionId: s.criterionId, score: s.score }));
  }

  private assertUniqueName(
    items: { id: number; name: string }[],
    name: string,
    kind: 'option' | 'criterion',
    ignoreId?: number,
  ): void {
    const key = normalize(name);
    if (items.some((i) => i.id !== ignoreId && normalize(i.name) === key)) {
      throw new ConflictException(`A ${kind} named "${name}" already exists in this decision`);
    }
  }

  private assertBelowLimit(count: number, plural: 'options' | 'criteria'): void {
    if (count >= MAX_ITEMS) {
      throw new BadRequestException(`A decision can have at most ${MAX_ITEMS} ${plural}`);
    }
  }

  // ---------------------------------------------------------------- decisions

  async findAll(query: ListDecisionsQueryDto): Promise<DecisionView[]> {
    const filter: FilterQuery<Decision> = {};
    if (query.status) filter.status = query.status;
    if (query.title) filter.title = { $regex: escapeRegex(query.title), $options: 'i' };
    // status + title are combined with AND. Sort matches the { status: 1, updatedAt: -1 } index
    // (see README "Indexing" for the measured explain() results).
    const docs = await this.model.find(filter).sort({ updatedAt: -1 });
    return docs.map((d) => this.view(d));
  }

  async findOne(id: number): Promise<DecisionView> {
    return this.view(await this.load(id));
  }

  async create(dto: CreateDecisionDto, ownerId: number): Promise<DecisionView> {
    const template = dto.templateId !== undefined ? await this.templates.findOne(dto.templateId) : undefined;
    const criteria = template
      ? template.criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight })) // copy: later template edits don't affect this decision
      : [];

    const id = await this.counters.next('decisions');
    const doc = await this.model.create({
      id,
      ownerId,
      title: dto.title,
      description: dto.description ?? '',
      status: 'Draft',
      templateId: template?.id,
      options: [],
      criteria,
      scores: [],
    });

    if (template) {
      this.logger.log(`Decision ${id} created from template ${template.id} ("${template.name}") by user ${ownerId}`);
    }
    return this.view(doc);
  }

  async update(id: number, dto: UpdateDecisionDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    if (dto.templateId !== undefined) {
      throw new BadRequestException('templateId cannot be changed after the decision is created');
    }
    if (dto.title === undefined && dto.description === undefined) {
      throw new BadRequestException('Nothing to update: send title and/or description');
    }
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    return this.persist(doc);
  }

  async remove(id: number, userId: number): Promise<void> {
    const doc = await this.load(id);
    this.assertOwner(doc, userId); 
    await this.model.deleteOne({ id });
  }

  // ------------------------------------------------------------------ options

  async addOption(id: number, dto: CreateOptionDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const options = this.options(doc);
    this.assertBelowLimit(options.length, 'options');
    this.assertUniqueName(options, dto.name, 'option');
    options.push({ id: nextId(options), name: dto.name });
    doc.options = options;
    return this.persist(doc);
  }

  async renameOption(id: number, optionId: number, dto: UpdateOptionDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const options = this.options(doc);
    if (!options.some((o) => o.id === optionId)) {
      throw new NotFoundException(`Option ${optionId} not found in decision ${id}`);
    }
    this.assertUniqueName(options, dto.name, 'option', optionId);
    doc.options = options.map((o) => (o.id === optionId ? { id: o.id, name: dto.name } : o));
    return this.persist(doc);
  }

  async removeOption(id: number, optionId: number, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const options = this.options(doc);
    if (!options.some((o) => o.id === optionId)) {
      throw new NotFoundException(`Option ${optionId} not found in decision ${id}`);
    }
    doc.options = options.filter((o) => o.id !== optionId);
    doc.scores = this.scores(doc).filter((s) => s.optionId !== optionId); // cascade
    return this.persist(doc);
  }

  // ----------------------------------------------------------------- criteria

  async addCriterion(id: number, dto: CreateCriterionDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const criteria = this.criteria(doc);
    this.assertBelowLimit(criteria.length, 'criteria');
    this.assertUniqueName(criteria, dto.name, 'criterion');
    criteria.push({ id: nextId(criteria), name: dto.name, weight: dto.weight });
    doc.criteria = criteria;
    return this.persist(doc);
  }

  async updateCriterion(id: number, criterionId: number, dto: UpdateCriterionDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const criteria = this.criteria(doc);
    if (!criteria.some((c) => c.id === criterionId)) {
      throw new NotFoundException(`Criterion ${criterionId} not found in decision ${id}`);
    }
    if (dto.name === undefined && dto.weight === undefined) {
      throw new BadRequestException('Nothing to update: send name and/or weight');
    }
    if (dto.name !== undefined) this.assertUniqueName(criteria, dto.name, 'criterion', criterionId);
    doc.criteria = criteria.map((c) =>
      c.id === criterionId ? { id: c.id, name: dto.name ?? c.name, weight: dto.weight ?? c.weight } : c,
    );
    return this.persist(doc);
  }

  async removeCriterion(id: number, criterionId: number, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    const criteria = this.criteria(doc);
    if (!criteria.some((c) => c.id === criterionId)) {
      throw new NotFoundException(`Criterion ${criterionId} not found in decision ${id}`);
    }
    doc.criteria = criteria.filter((c) => c.id !== criterionId);
    doc.scores = this.scores(doc).filter((s) => s.criterionId !== criterionId); // cascade
    return this.persist(doc);
  }

  // ------------------------------------------------------------------- scores

  async upsertScore(id: number, dto: UpsertScoreDto, userId: number): Promise<DecisionView> {
    const doc = await this.loadForEdit(id, userId);
    if (!doc.options.some((o) => o.id === dto.optionId)) {
      throw new BadRequestException(`Option ${dto.optionId} is not part of decision ${id}`);
    }
    if (!doc.criteria.some((c) => c.id === dto.criterionId)) {
      throw new BadRequestException(`Criterion ${dto.criterionId} is not part of decision ${id}`);
    }
    const scores = this.scores(doc);
    const existing = scores.find((s) => s.optionId === dto.optionId && s.criterionId === dto.criterionId);
    if (existing) existing.score = dto.score;
    else scores.push({ optionId: dto.optionId, criterionId: dto.criterionId, score: dto.score });
    doc.scores = scores;
    return this.persist(doc);
  }


}