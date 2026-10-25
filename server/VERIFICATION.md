# Backend verification

Executed by the assistant on 2026-10-25 after Majed explicitly authorized completing, testing, seeding and pushing his backend work. No frontend or teammate editing feature was added.

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm test -- src/decisions` | 98 tests passed across 7 files |
| `npm run test:e2e` | 16 real HTTP/MongoDB tests passed |
| Node syntax checks for the three scripts | Passed |
| `npm run seed:examples` | Created requested Draft decisions in local `decisionlab` |
| Second `npm run seed:examples` | Kept the same records without duplicates |
| `npm run verify:restart` | Passed using distinct backend process IDs 12255 and 12257 |

The initial e2e attempt was blocked by sandbox loopback permissions. The authorized run with local network access passed; no application fix was needed for that environment restriction.

## Requested decisions

IDs below describe this database at verification time; other databases allocate their own numeric IDs.

| Local ID | Decision | Computed ranking |
| --- | --- | --- |
| 3 | Which gym should I join? | Fitness Gym 69; STAR Gym 66; Golds Gym 60.5 |
| 4 | Buy an electric guitar or keep my classical guitar? | Electric 69; classical 67 |

Both remain Draft. Weights, all option/criterion scores and assumptions are in `examples/decisions.json`. Scores are illustrative personal judgments, not verified business/product claims. The electric-guitar noise score assumes headphone-capable practice equipment; its cost score includes accessories. Calculated values are computed by the real engine and are not stored as production totals/ranks.

## What the evidence establishes

Unit tests cover readiness, invalid stored-array structure/numeric identities, exact calculations, shared/resolved ties, explanations, public formatting, the two examples and mocked lifecycle orchestration. Real HTTP tests cover path parsing, errors, serialization, stored readiness failures, finalize/reopen and persistence across Nest application/connection recreation.

The separate restart script starts a dedicated backend on an available port, creates its own temporary decision in the configured MongoDB database, calculates/finalizes it through HTTP, terminates that Node process, starts a different Node process, verifies persisted winners/timestamp and the 409 lock, reopens/recalculates, checks lifecycle logs and removes only its temporary decision. It also verifies the live OpenAPI route schemas and numeric/string total types. It leaves any existing development server alone. Counter gaps after the temporary fixture are expected.

Existing database decisions were preserved. Local `.env`, dependencies/builds, coaching notes and design/agent tooling are excluded from the backend commit.

## Remaining team integration

Eyad/Fadi's decision/option/criterion/score editing routes are not available in this checkout. Applying and testing their actual Draft-guarded writes remains a team integration dependency; this work does not implement competing editing routes or claim full shared editing-lock coverage. Schema ownership and provisional API/tie/lifecycle choices still require team confirmation. See `CALCULATION_HANDOFF.md` for the exact guard requirements and acceptance cases.
