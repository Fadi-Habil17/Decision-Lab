# Yousef frontend handoff

The workspace, result, template-browse, and template-based creation screens now
use the API client in `src/decisions/api.ts`. During Vite development, `/api`
is proxied to `http://localhost:3000` by default; set `API_PROXY_TARGET` to
override that target. For another deployment origin, set `VITE_API_BASE_URL`.

## Expected API fields

- `GET /decisions` returns a list of decision summaries containing `id`,
  `title`, `status`, `updatedAt`, `winnerNames`, and optional `ownerId` and
  `ownerName`. `DELETE /decisions/:id` removes an owner-controlled decision.
- `GET /decisions/:id` returns the `DecisionResponse` fields: `id`, `title`,
  optional `description`, `status`, `options[{id,name}]`,
  `criteria[{id,name,weight}]`, `scores[{optionId,criterionId,score}]`,
  `createdAt`, `updatedAt`, optional `finalizedAt`, and `winnerNames`.
- `ownerId` (numeric) and `ownerName` (optional display string) are optional
  frontend extensions. Until `ownerId` is returned, the workspace deliberately
  stays read-only. The frontend never infers ownership from a title or fixture.
- The workspace saves title and description with `PATCH /decisions/:id`,
  options and criteria with their individual `POST`/`PATCH`/`DELETE` routes,
  and scores with `PUT /decisions/:id/scores`. Clearing a score uses the
  owner-only `DELETE /decisions/:id/scores/:optionId/:criterionId` route.
  Mutations are sequential because each response returns the latest decision
  and newly allocated IDs.
- `POST /decisions` accepts `{title, description?, templateId?}` and returns a
  decision with its numeric `id`.
- `GET /templates` returns `[{id,name,description,criteria:[{id,name,weight}]}]`.
- Calculation uses `POST /decisions/:id/calculate`. The UI renders the returned
  `ranked`, `winners`, `displayTotal`, contribution, strongest/weakest
  criterion, and `gapToAbove` fields without calculating rankings itself.
  Lifecycle actions use `POST /decisions/:id/finalize` and `/reopen`.
- A 400 readiness response may include `errors` and `missingScores` pairs.
  401 and 403 responses receive separate sign-in and permission messages.

## Integration status and remaining dependency

Decision and template routes, numeric `ownerId`, and owner-only server guards
are implemented in the backend. The UI compares `ownerId` to the current
session user and remains read-only otherwise. The frontend session and login
form are still an intentionally non-authenticating demo preview; no real
authentication provider is present in this checkout. The API client exposes
`setDecisionApiAccessToken(token)` to attach a JWT in memory, but the eventual
auth provider must call it on sign-in and clear it on sign-out. Until that is
wired, protected create/edit/delete/calculate/lifecycle requests correctly
receive 401 rather than treating the demo user as authenticated.

The backend enables CORS for same-origin development through Vite's `/api`
proxy. A separately hosted client/API deployment must configure its allowed
origin in the backend.

The calculation endpoint rejects finalized decisions and does not persist the
full breakdown. A direct reload of a finalized result therefore needs an agreed
read-only result endpoint or persisted calculation snapshot. Results reached
immediately after calculate/finalize use the backend response returned in
navigation state; no browser-side result cache or calculation was added.

## Verification

Run `npm run build` and `npm run lint` from `client/`. The client has no
configured unit-test runner in its package scripts. The backend's authenticated route tests exercise owner/non-owner access with
real HTTP requests and an in-memory database; a frontend end-to-end acceptance
test still requires wiring the demo UI to a real authentication provider.
