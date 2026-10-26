# Templates API

The module uses the team's shared `TemplateSchema`, embedded `CriterionItemSchema`,
`CountersModule` and `AuthModule`. `AppModule` already imports it. MongoDB stores
all template data; the service performs the database operations.

## Routes

| Method | Path             | Access                      | Success                                   |
| ------ | ---------------- | --------------------------- | ----------------------------------------- |
| GET    | `/templates`     | Public                      | 200, array ordered by numeric template ID |
| GET    | `/templates/:id` | Public                      | 200, one template                         |
| POST   | `/templates`     | Admin OR valid internal key | 201, created template                     |
| PATCH  | `/templates/:id` | Admin OR valid internal key | 200, updated template                     |
| DELETE | `/templates/:id` | Admin OR valid internal key | 204, no body                              |

Both GET routes work without authentication. Mutations use Fadi's existing
`InternalToolGuard`: either a verified Bearer JWT for a current Admin in MongoDB,
or a valid `x-internal-tool-key`, is sufficient. The token's role claim is never
trusted. Missing or insufficient credentials return 403 under this guard's
contract. The two Swagger security entries are alternatives (OR), not cumulative
requirements. See `../auth/README.md` and `../auth/internal-tool.swagger.md`.

## Create request

```json
{
  "name": "Laptop Purchase",
  "description": "Choose a laptop for the bootcamp.",
  "criteria": [
    { "name": "Performance", "weight": 30 },
    { "name": "Battery", "weight": 25 },
    { "name": "Price", "weight": 20 },
    { "name": "Portability", "weight": 15 },
    { "name": "Display", "weight": 10 }
  ]
}
```

The server assigns the template ID through `CountersService.next('templates')`.
Criterion IDs are local to the template and assigned 1..N, matching the shared
seed convention. Clients do not send either kind of ID in the request body.

## Response contract for the frontend

```json
{
  "id": 1,
  "name": "Laptop Purchase",
  "description": "Choose a laptop for the bootcamp.",
  "criteria": [
    { "id": 1, "name": "Performance", "weight": 30 },
    { "id": 2, "name": "Battery", "weight": 25 },
    { "id": 3, "name": "Price", "weight": 20 },
    { "id": 4, "name": "Portability", "weight": 15 },
    { "id": 5, "name": "Display", "weight": 10 }
  ]
}
```

The example ID is illustrative; use the actual returned ID. Responses contain
only these fields, matching the frontend `DecisionTemplate` type. MongoDB `_id`,
version keys and any other internal fields are excluded, including nested ones.
List returns an array directly, without an envelope.

## PATCH and validation

PATCH accepts any supplied subset of `name`, `description`, and `criteria`.
Omitted fields keep their saved values. Sending `criteria` replaces the complete
array, with local criterion IDs assigned 1..N again. For example:

```json
{
  "criteria": [
    { "name": "Price", "weight": 60 },
    { "name": "Battery", "weight": 40 }
  ]
}
```

- Names and description are trimmed and must be non-empty strings.
- There must be 2..8 criteria. Each weight is a JSON number, integer 1..100.
- Weights must total exactly 100 before create or update. The 400 error reports
  the actual total when this rule fails.
- Criterion names must be unique after trimming and ignoring case; duplicates
  return 409. Template names are not required to be globally unique.
- Empty PATCH, explicit null values, unknown fields and malformed IDs return 400.
  IDs in paths must be positive safe integers.
- An absent template returns 404 for read, update and delete.

The application ValidationPipe validates DTO fields and nested objects; the
service then runs `validateTemplateCriteria` before writing. Partial updates
validate the complete criteria that would be saved. Only supplied fields are
written, using an atomic MongoDB update.

## Decision snapshots

`DecisionsService.create` copies `{ id, name, weight }` into the new decision.
Template update and delete write only the templates collection; they never
rewrite decisions. A deleted template's numeric ID can remain as the historical
`templateId` in an existing decision. New decisions cannot use that deleted ID.

## Verification

From `server/`, using the existing project dependencies:

```sh
npm ci
npm run build
npm test
npm run test:e2e -- test/templates.e2e-spec.ts
```

The end-to-end suite needs MongoDB. It defaults to `mongodb://127.0.0.1:27017`;
set `MONGODB_TEST_URI` for a different local test instance. It uses a uniquely
named `decisionlab_templates_test_*` database and drops only that database on
completion. Its generated JWT secret and internal key exist only for the test
run; no `.env` file or real credentials are read or written.

Coverage includes CRUD, public reads, all three guarded routes with both accepted
credentials and rejected cases, current database roles, field validation, weight
totals, duplicates, not-found errors, allow-listed responses, Swagger OR security,
unchanged decision snapshots after template edit/deletion, and persistence of
templates and counters across closing and recreating the backend application.

For a manual demo in Swagger (`/docs`), list templates without authorization,
create with an Admin token or internal key, try a total of 105 and duplicate
criterion names, then create a decision from a template and edit/delete that
template. The existing decision must keep its original criteria and weights.
