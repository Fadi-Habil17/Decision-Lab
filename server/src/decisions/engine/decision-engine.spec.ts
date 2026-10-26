import { rankOptions, validateForCalculation, EngineInput } from './decision-engine.js';

const criteria = [
  { id: 1, name: 'Performance', weight: 60 },
  { id: 2, name: 'Price', weight: 40 },
];
const options = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
];
const mk = (s: [number, number][]): EngineInput => ({
  options,
  criteria,
  scores: s.flatMap(([a, b], i) => [
    { optionId: options[i].id, criterionId: 1, score: a },
    { optionId: options[i].id, criterionId: 2, score: b },
  ]),
});

describe('decision engine', () => {
  it('computes weighted totals and ranks', () => {
    const ranked = rankOptions(mk([[10, 5], [6, 6], [4, 4]]));
    expect(ranked.map((r) => r.optionName)).toEqual(['A', 'B', 'C']);
    expect(ranked[0].total).toBe(80); // 10*60/10 + 5*40/10
    expect(ranked[1].total).toBe(60);
    expect(ranked[1].gapToAbove).toBe(20);
    expect(ranked[0].gapToAbove).toBe(0);
  });

  it('breaks ties using the highest-weighted criterion', () => {
    // A: 8*60+4*40 = 640 ; B: 6*60+7*40 = 640  -> A wins on Performance
    const ranked = rankOptions(mk([[8, 4], [6, 7], [1, 1]]));
    expect(ranked[0].optionName).toBe('A');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[0].isTied).toBe(false);
  });

  it('shares a rank when still tied', () => {
    const ranked = rankOptions(mk([[5, 5], [5, 5], [1, 1]]));
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[0].isTied && ranked[1].isTied).toBe(true);
    expect(ranked[2].rank).toBe(3);
  });

  it('rejects weights that do not sum to 100 and lists missing scores', () => {
    const bad = { ...mk([[5, 5], [5, 5], [5, 5]]), criteria: [{ ...criteria[0], weight: 65 }, criteria[1]] };
    expect(validateForCalculation(bad)?.message).toContain('105');
    const missing = { options, criteria, scores: [{ optionId: 1, criterionId: 1, score: 5 }] };
    const issue = validateForCalculation(missing);
    expect((issue?.details.missingScores as unknown[]).length).toBe(5);
  });
});
