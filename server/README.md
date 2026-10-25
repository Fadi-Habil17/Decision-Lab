# DecisionLab backend

NestJS, TypeScript and MongoDB/Mongoose backend for DecisionLab. Application
resources use numeric IDs while MongoDB manages internal document IDs.

## Local setup

Use a Node release supporting `process.loadEnvFile`. Start MongoDB, then run
these commands from `server/`:

```sh
Copy-Item .env.example .env
npm ci
npm run build
npm run start:dev
```

Swagger UI is available at <http://localhost:3000/docs>.

## API

| Method | Route | Access |
| --- | --- | --- |
| GET | `/decisions` | Public; optional `status` and `title` filters |
| GET | `/decisions/:id` | Public |
| POST | `/decisions` | Authenticated; creates for current user, optionally from a template |
| PATCH / DELETE | `/decisions/:id` | Owner only |
| POST / PATCH / DELETE | `/decisions/:id/options...` | Owner only |
| POST / PATCH / DELETE | `/decisions/:id/criteria...` | Owner only |
| PUT | `/decisions/:id/scores` | Owner only |
| DELETE | `/decisions/:id/scores/:optionId/:criterionId` | Owner only |
| POST | `/decisions/:id/calculate` | Authenticated owner |
| POST | `/decisions/:id/finalize` | Authenticated owner |
| POST | `/decisions/:id/reopen` | Authenticated owner |
| GET | `/templates` and `/templates/:id` | Public |

Send the access token as `Authorization: Bearer <token>`. Login and registration
return an access token and safe user profile. Public reads do not require a
token. Non-owners receive 403; missing, invalid or expired credentials receive
401. Finalized decisions reject edits until reopened.

An owner edit is represented by the collection of resource routes, rather than
a bulk `PATCH /decisions/:id` payload: create/update/delete options and criteria
individually, and upsert scores with `PUT /decisions/:id/scores`. Each successful
mutation returns the updated decision view.

Calculation response field definitions, weighting behavior, tie rules and
lifecycle notes are documented in [CALCULATION_HANDOFF.md](./CALCULATION_HANDOFF.md).
Example data and restart verification are documented in
[VERIFICATION.md](./VERIFICATION.md).

## Checks

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

The seed module creates sample templates and decisions only when the database
is empty. For explicit examples, use `npm run seed:examples`.
