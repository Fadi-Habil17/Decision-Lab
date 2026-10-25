# Decisions list preview

Run `npm run dev` from `client/`. `/decisions` is public and uses local demo data,
with no backend calls. The same in-memory store lives above all routes: deleting
a decision survives client-side navigation, while refreshing restores the four
original fixtures and the guest session. No localStorage or sessionStorage is used.

## Features and boundaries

The list combines case-insensitive, trimmed title search with All/Draft/Finalized
filtering. It displays title, status, UTC update date and sample winner names for
finalized entries. These names are fixtures, not calculated results. Details link
to the existing workspace route; Workspace, Results and Templates are unchanged.

Create New Decision and the existing New Decision navigation allow the demo user
to reach the local creation form. Guests go to Login with router state
`returnTo: '/decisions/new'`. Direct visits to the creation route follow the same
rule. Login/Register cross-links preserve this allow-listed internal destination.
Submitting the auth preview still does not sign in or automatically redirect.
Real authentication and its post-login redirect remain deferred.

Only the demo owner sees Delete. A native modal dialog focuses Cancel, contains
keyboard focus, supports Escape, and returns focus on cancellation. Confirming
removes the item and announces the result. The local service rechecks the numeric
owner ID; this is a demonstration, not a replacement for server authorization.

## Deterministic development scenarios

Open `/__preview/decisions` directly during development. The page is excluded
from production routing and has no link in the product navigation.

- **Preview as Hamid** selects user ID 1. Decisions 1 and 2 are owned by this user;
  decisions 3 and 4 belong to user ID 2 and remain read-only.
- **Reset to guest** removes all Delete controls while preserving public reads.
- **List scenario** selects Ready, Loading, Error or Empty. Follow **Open decisions**
  using the page's link so the in-memory selection survives navigation.
- Loading deliberately stays visible until another scenario is selected.
- Error displays Retry; retry switches back to Ready without a network request.
- Empty hides the stored items without deleting them. Switch to Ready to see them.
- Search for a nonexistent title to inspect the separate no-matching-results state.

Use browser Back to return to these controls after inspecting the list. Entering a
URL as a new document load or refreshing resets the preview. Authentication preview
tools remain available at `/__preview/auth`; the two tools pages link to each other.

## Implementation

- `src/decisions/models.ts`: local view models, not agreed API DTOs.
- `src/demo/decisionFixtures.ts`: separate sample data.
- `src/decisions/localDecisionService.ts`: synchronous local reads, subscriptions,
  owner-checked removal, scenario controls, and an `add` seam for stage 3. IDs are
  numeric, unique during the session, and not reused after deletion.
- `src/decisions/DecisionStoreProvider.tsx` and `store.ts`: shared reactive store.
- `src/pages/DecisionsPage.tsx`: list, filters, states and deletion UI.
- `src/pages/DecisionsPreviewPage.tsx`: development tools only.
- `src/styles/decisions.css`: list and modal presentation.

The new-decision form, template selection and creation UI are now implemented in stage 3; see [the frontend handoff](frontend-handoff.md).
Real API response shapes, persistence, authentication, authorization, server-side
title/status filtering and HTTP errors remain deferred. There is no fake fetch or
Axios client and no calculation/ranking logic.

## Checks

Run `npm run build` and `npm run lint`. Browser checks should cover combined search
and status filtering, clearing filters, empty/error/loading states, owner vs guest
and non-owner controls, delete confirmation and cancellation, navigation persistence,
refresh reset, preserved auth pages, and responsive/keyboard behavior.

Validated for this stage: build, lint, and diff whitespace checks passed. Chromium
checks passed for combined search/status, no-match reset, metadata/winner display,
guest creation redirects and preserved returnTo, owner/non-owner deletion controls,
dialog focus cycling/Escape/cancel/confirm, state retention across navigation and
logout, refresh reset, error/retry/loading/empty scenarios, and the service's add
seam and numeric-ID behavior. Layouts and dialogs were checked at 320, 375, 768,
1024 and 1440 px. Production list rendering and developer-route exclusion passed;
no application runtime errors, API calls or browser storage were observed.
