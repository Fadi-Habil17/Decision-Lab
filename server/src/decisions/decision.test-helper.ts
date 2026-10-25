/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

// Test-only helpers: an in-memory stand-in for the Mongoose Decision model (no MongoDB needed).
export type Plain = Record<string, any>;

export const OWNER = 7;
export const OTHER = 8;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Minimal stand-in for a Mongoose document: plain fields + save() + toJSON(). */
export function makeDoc(data: Plain): Plain {
  const doc: Plain = {
    status: 'Draft',
    description: '',
    options: [],
    criteria: [],
    scores: [],
    winnerNames: [],
    ...clone(data),
  };
  doc.save = vi.fn(async () => doc);
  doc.toJSON = () =>
    clone(Object.fromEntries(Object.entries(doc).filter(([k]) => k !== 'save' && k !== 'toJSON')));
  return doc;
}

export const TEMPLATE = {
  id: 1,
  name: 'Laptop Purchase',
  criteria: [
    { id: 1, name: 'Performance', weight: 60 },
    { id: 2, name: 'Battery', weight: 40 },
  ],
};

/** A small valid Draft decision owned by OWNER: 2 options x 2 criteria, fully scored. */
export const draft = (over: Plain = {}): Plain => ({
  id: 1,
  ownerId: OWNER,
  title: 'Laptop',
  status: 'Draft',
  options: [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
  ],
  criteria: [
    { id: 1, name: 'Price', weight: 60 },
    { id: 2, name: 'Battery', weight: 40 },
  ],
  scores: [
    { optionId: 1, criterionId: 1, score: 5 },
    { optionId: 1, criterionId: 2, score: 6 },
    { optionId: 2, criterionId: 1, score: 7 },
    { optionId: 2, criterionId: 2, score: 8 },
  ],
  ...over,
});

export function createFakeModel(seed: Plain[] = []) {
  const docs: Plain[] = seed.map(makeDoc);
  const model = {
    findOne: vi.fn(async (f: { id: number }) => docs.find((d) => d.id === f.id) ?? null),
    create: vi.fn(async (data: Plain) => {
      const d = makeDoc(data);
      docs.push(d);
      return d;
    }),
    find: vi.fn((filter: Plain = {}) => ({
      sort: async () =>
        docs.filter((d) => {
          if (filter.status && d.status !== filter.status) return false;
          if (filter.title && !new RegExp(filter.title.$regex, filter.title.$options).test(d.title)) return false;
          return true;
        }),
    })),
    deleteOne: vi.fn(async (f: { id: number }) => {
      const i = docs.findIndex((d) => d.id === f.id);
      if (i >= 0) docs.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    }),
  };
  return { docs, model };
}