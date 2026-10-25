# DecisionLab backend

Majed Hmoud's calculation and decision-lifecycle workstream: NestJS, TypeScript and MongoDB/Mongoose. This checkout provides calculation, finalization and reopening; teammates' general editing/template/frontend features are outside this workstream.

- [Calculation and lifecycle handoff](CALCULATION_HANDOFF.md): response contract, formulas, tie/lifecycle policies, relationships/indexes and integration requirements.
- [Verification results](VERIFICATION.md): executed checks, example data and real process-restart evidence.

## Local setup

Use a Node release providing `process.loadEnvFile`; Node 26.11.1 was verified here. Start your MongoDB server, then run from `server/`:

```bash
cp .env.example .env
npm ci
npm run build
npm run start:dev
```

Copy the environment file once during initial setup. The backend loads `server/.env`; existing process environment variables take precedence. Defaults are `mongodb://127.0.0.1:27017/decisionlab` and port 3000. `.env` stays local; `.env.example` is shareable. No local database username/password was configured for this training setup.

Nest Observe is optional and disabled while its two environment values are blank. Actual service credentials must come from that service if it is enabled; no account is needed for local training.

Swagger UI: <http://localhost:3000/docs>. OpenAPI JSON: <http://localhost:3000/docs-json>.

## Implemented actions

| Route | Successful response |
| --- | --- |
| POST /decisions/:id/calculate | 200 ranked results and explanations from current persisted Draft data |
| POST /decisions/:id/finalize | 200 Decision JSON with Finalized status, timestamp and computed winner names |
| POST /decisions/:id/reopen | 200 Decision JSON with Draft status and cleared finalization metadata |

IDs are numeric application IDs; MongoDB keeps its internal primary keys. Invalid input/readiness returns 400, missing decisions 404, and prohibited lifecycle operations or changed-update conflicts 409. These actions have no request body or login requirement. Full field definitions and examples are in Swagger and the handoff.

Tie policies, result field names and lifecycle choices are implemented provisionally and still require shared team confirmation. The shared editing lock remains an integration dependency until Eyad/Fadi's actual editing routes are available; finalization alone does not protect against unconditional editing writes elsewhere.

## Requested examples

After building, explicitly seed the gym and guitar examples:

```bash
npm run seed:examples
```

Inputs and assumptions are in `examples/decisions.json`. Both decisions start as Draft with complete score matrices. Re-running the command keeps matching-title decisions without overwriting later edits. Existing database records are preserved and the application does not seed automatically on startup. Ratings are illustrative; quiet electric practice assumes headphone-capable equipment and the cost score includes accessories.

The verified local IDs are 3 (gym) and 4 (guitar); another database will allocate its own IDs. Use those IDs in Swagger or find the documents in Compass.

## Checks

```bash
npm run build
npm run lint
npm test -- src/decisions
npm run test:e2e
npm run verify:restart
```

The final run passed build, warning-free lint, 98 unit/mocked tests and 16 HTTP/MongoDB tests. The e2e suite creates and removes a uniquely named test database on local MongoDB. Set MONGODB_TEST_URI in the process environment to use a different test connection.

The restart check requires built files and the normal configured database. It starts dedicated backend processes on available ports, verifies persistence/Swagger/logs through a temporary decision, and removes that fixture. It leaves your existing development server and decisions alone; a consumed numeric-ID gap is expected.
