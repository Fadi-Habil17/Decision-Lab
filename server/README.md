# DecisionLab

A weighted decision-making engine. Define options and criteria, weight the criteria (total 100), score every option 1–10, and get a ranked result with a full explanation of why the winner won.

> **Stop guessing. Start weighing and let the numbers decide.**

**Stack:** NestJS 10 · MongoDB (Mongoose) · JWT auth (bcrypt) · Swagger · React 18 + TypeScript (Vite) · TailwindCSS. No external AI/cloud services, no chart libraries.

## Quick start

```bash
# 1) MongoDB (any local instance works; or use Docker)
docker compose up -d

# 2) Backend  → http://localhost:3000   (Swagger UI: /docs, JSON: /docs-json)
cd backend
npm install
cp .env.example .env        # a dev .env is already included — CHANGE JWT_SECRET and the admin password for real use
npm run start:dev

# 3) Frontend → http://localhost:5173   (proxies /api → backend)
cd ../frontend
npm install
npm run dev
```

On first start with an empty database the backend creates the **Admin** account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, 3 templates (Laptop Purchase, City Relocation, Project Idea) and 2 example decisions owned by the admin (one Draft with full scores, one Finalized — its winner is computed by the engine). Register a normal account in the UI to see the read-only "View Only" mode on those decisions.

**Upgrading an existing database:** on startup, decisions that have no `ownerId` are assigned to the admin account automatically.

### Environment (`backend/.env`)
| Variable | Purpose |
|---|---|
| `PORT` | API port (default 3000) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | **Required**, ≥16 chars. The server refuses to start without it |
| `JWT_EXPIRES_IN` | Token lifetime (default `1d`) |
| `INTERNAL_TOOL_KEY` | Alternative to an Admin JWT for template mutations (`x-internal-tool-key` header) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First Admin account, created at startup if missing |

## Security model

| Concern | Implementation |
|---|---|
| Passwords | `bcrypt`, 10 salt rounds; never logged, never returned (`passwordHash` has `select: false` and is stripped from `toJSON`) |
| Safe user output | `UsersService.toSafeUser()` — allow-list of `id, email, name, role` |
| Authentication | `JwtAuthGuard` verifies the signature with `jwtService.verifyAsync()` (never `decode`). Missing/invalid/expired → **401**. Payload `{sub, email}` is attached to `request.user`; read it with `@CurrentUser()` |
| Authorization (ownership) | Every decision mutation checks `decision.ownerId === currentUser.id`, otherwise **403** `"You do not have permission to modify this decision"` |
| Authorization (roles) | `@Roles('Admin')` + `RolesGuard`, which reads the role **fresh from MongoDB** (not from the token) |
| Template mutations | `InternalKeyOrJwtGuard` → valid `x-internal-tool-key` **or** a JWT whose user is currently `Admin`. No credentials → **403** and no log lines; bad token → 401; non-admin → 403 |

Check order for decision edits: **404** (not found) → **403** (not owner) → **409** (finalized).

## API overview
| Method & path | Access | Notes |
|---|---|---|
| `POST /auth/register` | public | `{email, password(8–72), name}` → safe user. 409 if email exists |
| `POST /auth/login` | public | → `{accessToken, user}`. 401 on bad credentials |
| `GET /auth/me` | 🔒 JWT | fresh user from the database |
| `GET /decisions?status=&title=` | public | newest first; `title` = partial, case-insensitive |
| `GET /decisions/:id`, `GET /decisions/:id/result` | public | read-only view / ranking + explanations |
| `POST /decisions` | 🔒 JWT | `ownerId` = current user; template criteria are **copied** |
| `PATCH/DELETE /decisions/:id` | 🔒 owner | 409 when finalized (PATCH) |
| `POST/PATCH/DELETE /decisions/:id/options[/:optionId]` | 🔒 owner | max 8, unique name (409) |
| `POST/PATCH/DELETE /decisions/:id/criteria[/:criterionId]` | 🔒 owner | weight 1–100, max 8 |
| `PUT /decisions/:id/scores` | 🔒 owner | `{optionId, criterionId, score 1–10}` |
| `POST /decisions/:id/calculate` | 🔒 owner | Draft only. 400 lists weights total / all missing pairs; 409 if finalized |
| `POST /decisions/:id/finalize` · `/reopen` | 🔒 owner | lock / unlock |
| `GET /templates`, `GET /templates/:id` | public | |
| `POST/PATCH/DELETE /templates` | 🔒 Admin or internal key | |

Status codes: **400** invalid input / weights ≠ 100 / missing scores / counts outside 2–8 · **401** not authenticated · **403** not allowed · **404** unknown decision/template · **409** duplicate name, duplicate email or finalized decision · **500** consistent JSON from `AllExceptionsFilter`.

In Swagger (`/docs`): log in via `POST /auth/login`, press **Authorize** and paste the `accessToken`.

## Math
`contribution = score × weight / 10`, `total = Σ contribution` (10.0–100.0). Ranking uses the exact integer `Σ score×weight` (no float drift). Ties are broken by the score on the highest-weight criterion; if still equal, options share a rank and get `isTied: true`. Each ranked option returns `contributions`, `strongestCriterion`, `weakestCriterion`, `gapToAbove`. The engine is a pure function in `backend/src/decisions/engine/decision-engine.ts` (unit-tested: `npm test`).

## Indexing (Session 14)

The list screen runs `GET /decisions?status=Draft&title=laptop`, i.e. a `status` equality filter plus a case-insensitive partial `title` regex, sorted by `updatedAt`. Indexes on `decisions`:

| Index | Purpose |
|---|---|
| `{ status: 1, updatedAt: -1 }` (original) | status filter + newest-first sort |
| `{ status: 1, title: 1 }` (**added**) | status filter **and** the title regex are both resolved inside the index: MongoDB scans only the `Draft` key range, tests the regex against the index keys, and fetches *only the matching documents* |
| `{ ownerId: 1 }` | owner lookups |

Measure it with `explain("executionStats")`:

```bash
cd backend
npm run explain -- 5000     # inserts 5000 temporary benchmark docs, prints A/B/C below, then removes them
```

```js
// equivalent in mongosh
const q = { status: "Draft", title: { $regex: "laptop", $options: "i" } };
db.decisions.find(q).sort({ updatedAt: -1 }).hint({ $natural: 1 }).explain("executionStats");              // A) no index
db.decisions.find(q).sort({ updatedAt: -1 }).hint({ status: 1, updatedAt: -1 }).explain("executionStats"); // B) before
db.decisions.find(q).sort({ updatedAt: -1 }).hint({ status: 1, title: 1 }).explain("executionStats");      // C) after
```

Paste **your measured** output here (it varies with data size and hardware):

| Plan | Stage chain | keys examined | docs examined | returned | time (ms) |
|---|---|---|---|---|---|
| A) no index | COLLSCAN + SORT | _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| B) before: `{status, updatedAt}` | IXSCAN → FETCH | _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| C) after: `{status, title}` | IXSCAN → FETCH → SORT | _fill in_ | _fill in_ | _fill in_ | _fill in_ |

What to look for: in **C**, `totalDocsExamined` should be close to `nReturned` (only matching documents are fetched), while in **B** every `Draft` document must be fetched to test its title.

## Relational comparison (Session 17)
`schema.sql` (repo root) is the PostgreSQL equivalent of the Mongoose model: `users`, `decisions`, `templates`, `options`, `criteria`, `scores` with primary keys, `UNIQUE`/`CHECK` constraints (`weight 1–100`, `score 1–10`, status/role enums) and foreign keys with `ON DELETE CASCADE` (e.g. `FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE`). Composite foreign keys guarantee a score's option and criterion belong to the same decision. It is documentation only — the app runs on MongoDB.

## Acceptance checklist — how to verify
1. **bcrypt:** `POST /auth/register` → response has no `passwordHash`; the stored hash starts with `$2b$10$`.
2. **401:** `POST /decisions` (or any owner-only route) without a token → 401.
3. **403:** user B calls `PATCH /decisions/:id/options/...` on user A's decision → 403.
4. **verifyAsync:** see `backend/src/auth/jwt-auth.guard.ts` (+ `auth.guards.spec.ts`: a forged token is rejected).
5. **Index docs:** section above (+ `npm run explain`).
6. **schema.sql:** repo root.
7. **Templates:** no credentials → 403 with zero service logs; wrong key → 403; Admin JWT or valid key → allowed.
8. **Earlier rules still hold:** template copy-on-create, missing scores → 400 listing all pairs, weights 105 → 400, finalized → 409, restart keeps data.

## Tests
```bash
cd backend && npm test
```
Covers the calculation engine (totals, tie-breaks), `JwtAuthGuard`, `InternalKeyOrJwtGuard`, `RolesGuard`, `toSafeUser`, and that the whole Nest dependency graph wires up.

## Project layout
```
backend/   NestJS API (auth, users, decisions, templates, seed, guards, filter, engine)
frontend/  React + TS + Tailwind UI (Vite): login/register, ownership-aware workspace & result
schema.sql PostgreSQL relational equivalent (documentation)
docker-compose.yml  MongoDB for local development
```
