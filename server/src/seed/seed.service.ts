import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from '../common/counters/counter.schema.js';
import { CountersService } from '../common/counters/counters.service.js';
import { rankOptions } from '../decisions/engine/decision-engine.js';
import { Decision, DecisionDocument } from '../decisions/schemas/decision.schema.js';
import { Template, TemplateDocument } from '../templates/schemas/template.schema.js';

const TEMPLATES = [
  {
    name: 'Laptop Purchase',
    description: 'Compare laptops by what matters most for daily use.',
    criteria: [
      ['Performance', 30], ['Battery', 25], ['Price', 20], ['Portability', 15], ['Display', 10],
    ],
  },
  {
    name: 'City Relocation',
    description: 'Decide where to live based on career, cost and quality of life.',
    criteria: [
      ['Job Opportunities', 35], ['Cost of Living', 25], ['Safety', 20], ['Climate', 10], ['Culture/Nightlife', 10],
    ],
  },
  {
    name: 'Project Idea',
    description: 'Evaluate project ideas on demand, feasibility, profit and passion.',
    criteria: [
      ['Market Demand', 30], ['Feasibility', 25], ['Profit Potential', 25], ['Personal Interest', 20],
    ],
  },
] as const;

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Template.name) private readonly templates: Model<TemplateDocument>,
    @InjectModel(Decision.name) private readonly decisions: Model<DecisionDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<Counter>,
    private readonly counters: CountersService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed only on a truly fresh database (also guards against re-seeding after the user
    // deliberately deleted everything, because the id counters persist).
    const [t, d, c] = await Promise.all([
      this.templates.countDocuments(),
      this.decisions.countDocuments(),
      this.counterModel.countDocuments(),
    ]);
    if (t !== 0 || d !== 0 || c !== 0) return;

    const templateDocs: TemplateDocument[] = [];
    for (const tpl of TEMPLATES) {
      templateDocs.push(
        await this.templates.create({
          id: await this.counters.next('templates'),
          name: tpl.name,
          description: tpl.description,
          criteria: tpl.criteria.map(([name, weight], i) => ({ id: i + 1, name, weight })),
        }),
      );
    }

    await this.seedDecision(templateDocs[0], {
      title: 'Which laptop should I buy?',
      description: 'Work + travel machine for the next 3-4 years.',
      options: ['MacBook Air M3', 'ThinkPad X1 Carbon', 'Dell XPS 13'],
      // rows = options, columns = criteria (Performance, Battery, Price, Portability, Display)
      scores: [
        [8, 10, 6, 9, 9],
        [7, 8, 7, 9, 8],
        [8, 7, 6, 8, 10],
      ],
      finalize: false,
    });

    await this.seedDecision(templateDocs[1], {
      title: 'Where should I move next year?',
      description: 'Shortlist after two months of research.',
      options: ['Berlin', 'Lisbon', 'Amsterdam'],
      // Job, Cost, Safety, Climate, Culture
      scores: [
        [9, 6, 7, 5, 10],
        [7, 8, 8, 9, 8],
        [9, 4, 8, 5, 8],
      ],
      finalize: true,
    });

    this.logger.log('Database was empty — seeded 3 templates and 2 example decisions');
  }

  private async seedDecision(
    template: TemplateDocument,
    data: { title: string; description: string; options: string[]; scores: number[][]; finalize: boolean },
  ) {
    const options = data.options.map((name, i) => ({ id: i + 1, name }));
    const criteria = template.criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight }));
    const scores = options.flatMap((o, oi) =>
      criteria.map((c, ci) => ({ optionId: o.id, criterionId: c.id, score: data.scores[oi][ci] })),
    );

    let status: 'Draft' | 'Finalized' = 'Draft';
    let finalizedAt: Date | undefined;
    let winnerNames: string[] = [];
    if (data.finalize) {
      // Winner is computed by the engine, never hardcoded.
      const ranked = rankOptions({ options, criteria, scores });
      winnerNames = ranked.filter((r) => r.rank === 1).map((r) => r.optionName);
      status = 'Finalized';
      finalizedAt = new Date();
    }

    await this.decisions.create({
      id: await this.counters.next('decisions'),
      title: data.title,
      description: data.description,
      status,
      templateId: template.id,
      options,
      criteria,
      scores,
      finalizedAt,
      winnerNames,
    });
  }
}
