# Decision calculation and lifecycle handoff

Updated 2026-10-25. Owner: Majed Hmoud. This describes the current local implementation. Shared schema ownership and contract choices still need confirmation with Fadi/Eyad/Yousef.

## Implemented scope

- Readiness validation, exact weighted totals, ranking/ties, contribution explanations and winners.
- MongoDB-backed calculate/finalize/reopen service and HTTP routes.
- Finalization timestamp/winner persistence, reopening metadata cleanup and selective logging.
- Numeric application IDs alongside MongoDB primary keys; supporting counter service and schema registration.
- Swagger response models and route documentation.

Frontend, template CRUD, general decision editing and nested option/criterion/score editing are outside this workstream. Their routes are not implemented in this checkout.

## Run locally

From `server/`, copy `.env.example` to `.env` once, install dependencies and start the backend:

```bash
cp .env.example .env
npm install
npm run start:dev
```

MongoDB must be running. Defaults are `mongodb://127.0.0.1:27017/decisionlab` and HTTP port 3000. The application loads `server/.env`; existing process environment variables take precedence. `.env.example` is shareable; `.env` is ignored. Node 26.11.1 was verified during setup; the environment loader requires a Node version providing `process.loadEnvFile`.

Observe is optional: leave its two environment values empty for local training. The backend enables it only when both credentials are supplied.

Swagger UI: <http://localhost:3000/docs>. OpenAPI JSON: <http://localhost:3000/docs-json>. Adjust the port when configured differently.

## Routes and response contract

These public action routes have no request body or login requirement. Route IDs are numeric application IDs, parsed with `ParseIntPipe`.

| Method/path | Success | Business errors |
| --- | --- | --- |
| `POST /decisions/:id/calculate` | 200 calculation response; no persistence changes | 400 invalid readiness; 404 absent; 409 Finalized |
| `POST /decisions/:id/finalize` | 200 updated Decision JSON | 400 invalid readiness; 404 absent/deleted; 409 already Finalized or changed during update |
| `POST /decisions/:id/reopen` | 200 updated Decision JSON | 404 absent/deleted; 409 already Draft or changed during update |

All three return 400 for invalid integer route syntax. `ParseIntPipe` does not establish a positive-ID minimum.

Calculation response shape:

```ts
type Contribution = {
  criterionId: number;
  criterionName: string;
  weight: number;
  score: number;
  points: number;
};

type CalculationResponse = {
  decisionId: number;
  title: string;
  status: 'Draft' | 'Finalized';
  ranked: Array<{
    optionId: number;
    optionName: string;
    rank: number;
    exactTotal: number;
    displayTotal: string;
    isTied: boolean;
    contributions: Contribution[];
    strongestCriterion: Contribution;
    weakestCriterion: Contribution;
    gapToAbove: number;
  }>;
  winners: string[];
};
```

`exactTotal` is the actual numeric total, not the integer comparison numerator. `displayTotal` preserves one decimal, including `"72.0"`. Internal `weightedSum` is excluded. `winners` contains names of every rank-one option. No `hasTie`, calculation timestamp, neighbor-name or below-gap fields were adopted.

Readiness errors have `statusCode: 400`, `error: 'Bad Request'`, `message`, `errors: string[]` and `missingScores`. Each missing pair contains optionId/optionName/criterionId/criterionName. All missing pairs are included. Route parsing errors use Nest's normal 400 response instead.

Finalize/reopen return the Decision document, not the calculation wrapper. Root `_id`/`__v` are hidden from normal JSON; MongoDB keeps its primary key. Dates serialize as ISO strings. Finalize stores Finalized status, finalizedAt and computed winnerNames. Reopen stores Draft, empties winnerNames and removes finalizedAt.

## Rules and provisional choices

Readiness requires 2–8 options and criteria, integer weights 1–100 totaling exactly 100, and an integer score 1–10 for every pair. Missing values are not zero. Duplicate embedded IDs/score pairs and orphan score references are rejected. Incomplete Drafts remain permissible outside calculation/finalization.

Contribution = score × weight / 10. Compare the integer sum of score × weight; divide by 10 for the real total. Formatting happens afterward.

| Example | A | B | Outcome |
| --- | --- | --- | --- |
| Weights 60/40; scores A 8/6, B 7/9 | 48 + 24 = 72 | 42 + 36 = 78 | B wins |
| Same scores, weights 80/20 | 64 + 12 = 76 | 56 + 18 = 74 | A wins |
| Weights 60/40; scores A 8/6, B 6/9 | 72 | 72 | A wins on the 60-weight criterion |

Majed approved these choices provisionally; they still need team agreement:

- Equal totals compare scores on the first stored criterion with maximum weight.
- Remaining ties share competition ranks, e.g. 1, 1, 3; ID ascending determines presentation only.
- Strongest/weakest use contributions. Equal contributions select the first stored criterion.
- First/shared-tied rows have gapToAbove 0; other rows use the exact gap from the immediately preceding row. A resolved equal-total tie can still have gap 0.
- Calculating/finalizing a Finalized decision returns 409. Reopening Draft returns 409.
- Reopening clears finalization metadata. Result field names/types and action 200 responses are provisional integration choices.

## Storage relationships and indexes

Options, criteria and scores are embedded in one Decision. This supports reading the complete calculation input and changing lifecycle fields in one document. Embedded items disable `_id`; their numeric IDs are local to the decision. Score identity is the local option/criterion pair.

Decision and Template retain MongoDB ObjectId primary keys and also have unique numeric application IDs. Counter uses a string `_id` for each named sequence. Its increment is atomic, but allocation and later entity insertion are separate: unused ID gaps are possible. It does not allocate embedded IDs.

`templateId` is a logical provenance field, not a Mongoose ref/foreign key. Template-copy behavior belongs to the creation owner; it is not implemented by this calculation service.

Declared indexes: unique root numeric `id` for Decision/Template; Decision `{ status: 1, updatedAt: -1 }` for the intended status-filtered/newest-first access pattern; built-in `_id` indexes. No embedded-pair/name or text-search uniqueness/index guarantee is declared. Index existence/performance in teammates' databases has not been measured; `unique` is not a request validator.

## Required shared editing-lock integration

Status on 2026-10-25: Majed confirmed teammates' editing routes are not available yet. This integration remains unfinished.

Eyad/Fadi's metadata, option, criterion and score writes—including nested removals—must return 409 while the decision is Finalized. Saving incomplete Drafts should remain allowed. Request DTOs must not permit clients to set status, winners or calculated values directly.

Check lifecycle state at the actual database write, not only during an earlier read. Include the expected Draft status in the write predicate and handle unmatched updates. Finalization already checks expected state/timestamp/title/input arrays before its atomic update; this does not protect against a separate editor performing a later unconditional write.

When the agreed editing routes are available, test each operation: finalize, attempt the edit and confirm 409 with unchanged data, reopen, then confirm the permitted edit succeeds and recalculation reflects it. Whole-decision deletion policy and exact shared route/service ownership still need agreement.

## Requested example decisions

The requested gym and guitar comparisons are defined in `examples/decisions.json`. Each has 2–8 criteria, integer weights totaling 100 and a complete score matrix. Higher scores always mean a more desirable outcome, including affordability and neighbour-friendliness. Their assumptions are illustrative, especially gym prices/maintenance and quiet electric practice with headphones.

After building, insert the examples explicitly:

```bash
npm run build
npm run seed:examples
```

The script uses the configured MongoDB database and numeric-ID counter, advances a lagging sequence to at least the highest existing ID, and never resets it backwards. Re-running preserves matching titles without overwriting edits or status; it is a single-operator example seeder, not a concurrent import/migration system. Nothing is automatically seeded during ordinary application startup. No templates or teammate CRUD features are created.

In the verified local database, the gym decision is ID 3 and the guitar decision is ID 4, both Draft. Teammates' IDs may differ. The computed gym totals are Fitness 69, STAR 66 and Golds 60.5; guitar totals are electric 69 and classical 67. Totals/ranks are calculated rather than persisted as input data.

## Validation evidence and commands

The final assistant-run checks passed: build, warning-free lint, 98 unit/mocked tests and 16 real HTTP/MongoDB tests. Extra regression cases reject null stored arrays/entries and invalid numeric identities; this prevents stored-data failures from becoming an unexpected 500. Numeric identities must be safe integers; no new positive minimum was imposed on route IDs. Existing deprecated options use `returnDocument: 'after'`. Exact results and evidence boundaries are recorded in [VERIFICATION.md](VERIFICATION.md).

```bash
npm run build
npm run lint
npm test -- src/decisions
npm run test:e2e
npm run verify:restart
```

The e2e suite starts its own Nest application and uses a uniquely named `decisionlab_e2e_*` database on local MongoDB; it cleans up that test database. `MONGODB_TEST_URI` in the process environment overrides its default local connection. It does not use the application's normal database. Its recreation test closes/recreates the Nest application and connection and reads persisted state. `verify:restart` additionally verifies separate Node processes, live Swagger schemas and lifecycle logs using its own removable fixture in the normal configured database. Editing-lock coverage waits for the actual editing routes.

## Separate backend process-restart checklist

The repeatable `npm run verify:restart` check passed on 2026-10-25; it requires built files and local MongoDB. The manual equivalent below remains useful for presentation.

Prerequisite: a designated ready Draft test decision in the database selected by `server/.env`; know its numeric ID. Creation/seed endpoints are not part of this branch.

1. Start the backend and finalize the test decision through Swagger. Record its ID, returned winnerNames and finalizedAt.
2. In Compass, confirm the same document stores Finalized status and those values.
3. Stop the backend process with Ctrl+C, then start it again using the same configuration.
4. In Compass, confirm the stored status/winners/timestamp are unchanged.
5. Calculate that ID: expect 409. Reopen: expect 200, Draft, empty winnerNames and absent finalizedAt. Calculate again: expect 200 with current data.
6. Record the date, numeric ID and observed statuses for handoff. Do not label this checklist as executed until its results are recorded.

## Handoff and presentation

Fadi/Eyad: confirm shared schema/file ownership, lifecycle rules and guarded editing integration. Yousef: confirm response names/types, display string, tie semantics and an example response from Swagger. No teammate contact or merge was performed automatically.

For the English presentation, explain the user flow, calculate 72/78 by hand, show the equal-total criterion tie-break, explain a shared rank, demonstrate a complete missing-score error, then show finalize/reopen and describe what each test layer proves. Prepare the focused PR only after the team's merge process is agreed.

A short speaking outline:

1. "My backend reads the latest decision inputs from MongoDB and validates every option, criterion and score before calculation."
2. "A contribution is score times weight divided by ten. I compare integer weighted sums so display formatting cannot change the ranking."
3. "Equal totals use the selected highest-weight criterion. Remaining ties share a rank and all first-place options become winners."
4. "Finalize stores the status, time and computed winner names together. Reopen clears that snapshot and permits the editing workflow again."
5. "I verified unit behavior, real HTTP/database behavior and persistence across different Node processes. Shared editing routes still need the guarded-write integration owned with Eyad/Fadi."
