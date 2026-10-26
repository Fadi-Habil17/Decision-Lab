import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CountersService } from '../common/counters/counters.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { TemplateCriterionDto } from './dto/template-criterion.dto.js';
import { TemplateResponseDto } from './dto/template-response.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { Template, type TemplateDocument } from './schemas/template.schema.js';
import { validateTemplateCriteria } from './validation/validate-template-criteria.js';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
    private readonly counters: CountersService,
  ) {}

  async findAll(): Promise<TemplateResponseDto[]> {
    const templates = await this.templateModel.find().sort({ id: 1 }).exec();
    return templates.map((template) => this.toResponse(template));
  }

  async findOne(id: number): Promise<TemplateResponseDto> {
    return this.toResponse(await this.load(id));
  }

  async create(dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    validateTemplateCriteria(dto.criteria);
    const template = await this.templateModel.create({
      id: await this.counters.next('templates'),
      name: dto.name,
      description: dto.description,
      criteria: this.withCriterionIds(dto.criteria),
    });
    return this.toResponse(template);
  }

  async update(
    id: number,
    dto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const existing = await this.load(id);
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.criteria === undefined
    ) {
      throw new BadRequestException(
        'Nothing to update: send name, description and/or criteria',
      );
    }
    validateTemplateCriteria(dto.criteria ?? existing.criteria);

    const changes: Partial<
      Pick<Template, 'name' | 'description' | 'criteria'>
    > = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.criteria !== undefined)
      changes.criteria = this.withCriterionIds(dto.criteria);

    // Only touch supplied fields; decisions keep their own copied criteria.
    const template = await this.templateModel
      .findOneAndUpdate(
        { id },
        { $set: changes },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!template) throw new NotFoundException(`Template ${id} not found.`);
    return this.toResponse(template);
  }

  async remove(id: number): Promise<void> {
    this.assertValidId(id);
    const template = await this.templateModel.findOneAndDelete({ id }).exec();
    if (!template) throw new NotFoundException(`Template ${id} not found.`);
  }

  private assertValidId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(
        'Template ID must be a positive safe integer',
      );
    }
  }

  private async load(id: number): Promise<TemplateDocument> {
    this.assertValidId(id);
    const template = await this.templateModel.findOne({ id }).exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found.`);
    }
    return template;
  }

  private withCriterionIds(
    criteria: readonly TemplateCriterionDto[],
  ): Template['criteria'] {
    // The shared seed uses local IDs 1..N. PATCH replaces the full criteria list.
    return criteria.map((criterion, index) => ({
      id: index + 1,
      name: criterion.name,
      weight: criterion.weight,
    }));
  }

  private toResponse(template: Template): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      criteria: template.criteria.map(({ id, name, weight }) => ({
        id,
        name,
        weight,
      })),
    };
  }
}
