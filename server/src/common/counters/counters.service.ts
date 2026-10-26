import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from './counter.schema.js';

@Injectable()
export class CountersService {
  constructor(
    @InjectModel(Counter.name)
    private readonly counterModel: Model<Counter>,
  ) {}

  async next(sequence: 'decisions' | 'templates' | 'users'): Promise<number> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        { _id: sequence },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    if (!counter) {
      throw new InternalServerErrorException(
        'Unable to allocate an application ID.',
      );
    }

    return counter.seq;
  }
}
