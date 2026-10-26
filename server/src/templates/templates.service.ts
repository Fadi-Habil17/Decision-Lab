import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Template, type TemplateDocument } from './schemas/template.schema.js';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
  ) {}

  findAll(): Promise<TemplateDocument[]> {
    return this.templateModel.find().sort({ id: 1 }).exec();
  }

  async findOne(id: number): Promise<TemplateDocument> {
    const template = await this.templateModel.findOne({ id }).exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found.`);
    }
    return template;
  }
}
