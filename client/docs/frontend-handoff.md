# Hamid's static frontend handoff

## Run

From `client/`: `npm ci`, then `npm run dev`. Validation commands are
`npm run build` and `npm run lint`. `npm run preview` serves the built static client.
No backend, database, tokens, or API credentials are required for this preview.

## Completed frontend scope

- Shared shell/header/navigation: guest links and in-memory demo user with Logout.
- `/login`, `/register`: local required/email validation, preview-only feedback,
  waiting, simulated error, and cancellation. Forms never authenticate anyone.
- `/decisions`: local list, combined title/status filters, metadata/winner fixtures,
  owner-only demo deletion and accessible confirmation, loading/error/empty states.
- `/decisions/new`: demo-user-only form; title and optional description; blank or
  template choice, criteria/weight preview, validation, waiting, retryable errors,
  creation into the shared store and navigation to the returned numeric ID.

Workspace, Results, and the public Templates page keep their existing contents;
they remain the other frontend workstream's responsibility. Creating a decision
opens the existing workspace placeholder. It does not implement criteria editing,
scoring, calculation, ranking, finalizing, or reopening.

## Preview controls

Open `/__preview/auth` or `/__preview/decisions` directly while running the dev
server. They link to each other and are absent from normal product navigation and
production routing. Use the tools' links for navigation to preserve memory state.

Choose **Preview as Hamid** before opening **New decision form**. Guests, including
direct visitors to `/decisions/new`, are redirected to Login with the allow-listed
internal `returnTo` retained in router state. Real post-login navigation is deferred.

The decisions tools include:

- **List scenario**: Ready, Loading, Error, Empty; list Retry clears the error.
- **Creation outcome**: success after 700 ms, failure once then retry successfully,
  or slow success after 5 seconds. Failure preserves inputs and creates no record.
- **Template loading**: success after 400 ms or failure until **Try again**. Retrying
  clears the failure setting and reloads the local templates.
- **Inspect local decisions**: development-only JSON to inspect generated IDs,
  current-owner assignment, timestamps and copied criteria.

Leaving a form or logging out while creation is waiting cancels it without adding
a record. Switching back to Blank discards the selected template. Refreshing
resets decisions, templates displayed by the form, scenario settings, and session.
No data is persisted to localStorage/sessionStorage or sent to an API.

Production builds retain public/static auth and list screens, but do not include
developer tools to select a demo user. The creation route therefore remains gated
for a fresh production guest until real authentication is integrated.

## Files and shared components

- `src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `components/auth/AuthForm.tsx`:
  authentication presentation and local form validation.
- `src/pages/DecisionsPage.tsx`, `NewDecisionPage.tsx`: list/create flows.
- `src/demo/decisionFixtures.ts`, `templateFixtures.ts`, `fixtures.ts`: example
  decisions, three templates, and the safe user fixture.
- `src/demo/authPreview.ts`, `creationPreview.ts`: cancellable local simulations.
- `src/demo/DemoSessionProvider.tsx`, `session.ts`: temporary session state.
- `src/decisions/models.ts`: local view/storage models, not final API DTOs.
- `src/decisions/localDecisionService.ts`, `DecisionStoreProvider.tsx`, `store.ts`:
  one shared in-memory source of decisions. `add(input, currentUserId)` takes the
  active identity separately, validates title/template, assigns a unique ID and
  timestamps, and copies every template criterion. New drafts have no winner.
- `src/pages/AuthPreviewPage.tsx`, `DecisionsPreviewPage.tsx`: dev-only controls.
- `src/App.tsx`, `main.tsx`, `layout/Navbar.tsx`: shared integration points.
- Existing Button, TextInput, StatusBadge, LoadingState, ErrorState, EmptyState,
  and ConfirmDialog are reused. Styles live in `src/styles/`.

Coordinate changes to shared routing, types, session and data access with Yousef
before API integration. This work does not change his domain screens or backend files.

## Validation completed

`npm run build`, `npm run lint` (without warnings), and `git diff --check` passed.
Chromium checks covered blank and template creation, whitespace-only titles,
missing template selection, all three template previews, switching back to Blank,
duplicate-submit prevention, correct owner/timestamps, list search/filter/delete
of new decisions, template and creation failure/retry, and cancellation/logout
while waiting. Store checks verified independent criterion copies, numeric IDs,
invalid-template rejection and owner assignment from the active identity.

Layouts were checked at 320, 375, 768 and 1440 px with keyboard navigation. The
previous auth and decision-list browser checks were rerun, including production
preview behavior and absence of developer routes. No application runtime errors,
API requests or browser-storage writes were observed. These are static/frontend
checks, not tests against the real backend.

## Deferred API integration

Agree the Base URL and request/response contracts for decisions, templates and
errors with the backend team. Replace demo fixtures/simulations/data service with
real reads, creation, deletion and persistence; do not assume these local models
are response DTOs.

Connect register/login after confirming the token field and whether registration
also signs in. Add the real AuthContext, session restoration, `GET /auth/me`, and
Bearer headers. Handle 401 (authentication) and 403 (permission) distinctly. Keep
safe user fields limited to numeric id, name, email and role. Server-side identity
and ownership checks remain authoritative.

Send search as `title`. Send `status` only for Draft or Finalized; omit it for All.
Complete integration tests against the actual backend, including failed requests,
permissions, refresh/session behavior and persisted records. No backend readiness
or integration is claimed by this static handoff.
