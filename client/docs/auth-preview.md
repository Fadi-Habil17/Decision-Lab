# Authentication UI preview

> Historical static-stage documentation. Product forms now use [real authentication](auth-integration.md); demo controls do not sign users in.

This stage adds the login/register interface and a temporary demo session to the existing React application. It does not authenticate a user, create an account, or contact the backend. Decisions, Templates, Workspace, and Results remain publicly browsable. The subsequent [decisions list stage](decisions-preview.md) adds local list interactions and requires the demo user for New Decision. The subsequent creation stage adds the local form; see [the frontend handoff](frontend-handoff.md).

## Run and check

Run these commands from `client/`:

```bash
npm ci
npm run dev
```

Open `/login` or `/register` in the running client. Both forms work without a server or database. For static checks and the production build:

```bash
npm run lint
npm run build
npm run preview
```

## Updated visual design

Both auth pages use the supplied split-panel design: an introduction, lavender
waves and decorative option cards on the left, and a white form on the right.
On narrow screens, the form comes first and the introduction follows. The shared
navigation and public browsing link remain available.

- `src/components/ui/BrandLogo.tsx` and `src/styles/brand.css` provide the shared
  branching/checkmark logo in the header and introduction. This is a vector
  interpretation of the supplied image, using system-font lettering, rather than
  the original image file; the exact original asset can replace it later.
- `src/components/auth/AuthArtwork.tsx` contains decorative SVG cards. Their
  example scores are illustration text only, with no decision calculations or
  connection to the decision store. Decorative artwork is hidden from assistive
  technology.
- `src/components/auth/AuthIcon.tsx` provides local field and visibility icons.
  The password visibility button works with the keyboard, is disabled while
  submitting, and resets to hidden after the preview completes.
- `AuthForm.tsx` and `src/styles/auth.css` retain local validation, cancellation,
  waiting, error and explicit preview-only success feedback. The form labels are
  **Full name**, **Email address** and **Password**; actions are **Log in** and
  **Create account**. Existing `/login` and `/register` routes are unchanged.

The reference's password recovery link is deferred until a recovery flow is
defined; this version does not expose a nonfunctional link. No dependencies,
external fonts, remote images or API requests were added.

The visual update passed build/lint and Chromium checks of both auth forms,
validation, simulated errors, waiting and cancellation, keyboard navigation,
password visibility, mobile/desktop layouts and production preview behavior.

## Development-only controls

Open `/__preview/auth` directly while using `npm run dev`. This page is deliberately absent from the regular navigation. It is not available in the production build; the app's not-found page handles that route when using `npm run preview`.

- **Preview as Hamid** selects the fixed demo user and shows the user's name, a Demo badge, and Logout in the shared header.
- **Reset to guest** returns the header to Login/Register links.
- **Submission outcome** chooses a local form scenario:
  - `success`: resolves after approximately 700 ms and shows a preview-only success message.
  - `error`: rejects after approximately 700 ms and shows a general form error.
  - `slow`: resolves successfully after approximately 5 seconds, making the waiting and disabled-submit states easy to inspect.
- **Login form** and **Register form** navigate to the forms while keeping the selected scenario and demo session.

Use the app's links to navigate between pages when checking a selected session or scenario. A full refresh, opening a new tab, or entering a URL as a new document load starts over as a guest with the default success scenario. Normal client-side navigation retains the in-memory state. Logout clears the selected demo user without requiring a network request.

The fixture is intentionally limited to safe display fields:

```ts
{
  id: 1,
  name: 'Hamid Al Haj',
  email: 'hamid@example.test',
  role: 'User',
}
```

Submitting a form does not select this fixture or verify its identity. Use only the development controls to select the demo session. Production builds retain the static login/register pages and their default preview behavior, but exclude the developer controls.

## Form behavior

Login collects email and password. Register also collects name. Both forms validate required fields and email syntax locally; registration rejects a name consisting only of whitespace. No password-length policy is assumed before the backend contract is agreed.

The password exists only in the form's transient state. It is not saved to browser storage, passed to the preview service, or logged. The preview service receives only a scenario and a cancellation signal. There is no JWT, access token, stored session, or real API client in this stage.

Success feedback explicitly describes a preview. It must not imply that an account was created or that credentials were checked. Waiting prevents repeated submission, and leaving a form cancels its pending preview operation.

## Implementation boundaries

All changes for this stage live under `client/`:

- `src/demo/`: safe demo data, shared in-memory session/scenario state, and the cancellable local submission simulation.
- `src/pages/LoginPage.tsx` and `src/pages/RegisterPage.tsx`: route entry points for the shared auth form.
- `src/components/auth/` and `src/styles/auth.css`: shared form behavior and its presentation.
- `src/pages/AuthPreviewPage.tsx`: development-only scenario controls.
- Existing application routing, entry point, and shared header: integration with the current shell.

The demo state and simulation are intentionally separate from the UI so they can be replaced during backend integration. Their display models are not declarations of the final API response shape. This stage does not implement decision-list data, decision creation, Workspace, Results, or template functionality.

## Browser acceptance checklist

Run these checks against the current development build; this checklist is not a record of executed test results.

- Open `/login` and `/register` directly, then follow their cross-links. Confirm each route has the correct fields and keeps the shared navigation.
- Submit empty forms. Check field messages, accessible invalid state, and focus on the first invalid field. Check an invalid email and a whitespace-only registration name.
- Correct a field and confirm stale feedback is cleared appropriately. Confirm a short, nonempty password is not rejected by an invented length rule.
- Submit valid values in the success scenario. Confirm the button is disabled while waiting, the password is cleared after completion, feedback says preview only, and the header still shows a guest.
- Select the error scenario, follow a form link, and submit valid values. Confirm readable general error feedback and that another attempt is possible.
- Select slow mode and submit. Try repeated clicks/Enter, then navigate away before completion. Confirm no duplicate submission or stale success appears on the next form.
- Select the demo user and navigate through public routes. Confirm the name and Demo badge persist; Logout restores Login/Register links; a page refresh also restores the guest state.
- Inspect browser console, network requests, localStorage, and sessionStorage. Confirm no credential logs, API requests, tokens, or persisted form/session data. Vite assets and its development WebSocket are normal.
- At mobile widths, including 320 px, verify no horizontal overflow, readable controls, and usable navigation. Use keyboard navigation to inspect visible focus, field labels, submit, and route links.
- Build and run `npm run preview`. Confirm the auth pages still work as static previews and `/__preview/auth` shows the not-found page.

## Validation performed

Validation completed for this stage: `npm run build`, `npm run lint`, and
`git diff --check` passed. Chromium checks exercised both forms' required-field
and email validation, whitespace-only names, one-character passwords, waiting,
success, simulated error and recovery, duplicate-submit protection, and navigation
while a submission was pending. Header session changes, logout, refresh reset,
unchanged public routes, keyboard focus, and layouts at 320, 375, 768, 1024 and
1440 px were checked. Browser checks observed no application runtime errors,
fetch/XHR or POST requests, or local/session storage entries. The built production
client also passed form checks and rendered the not-found page for the development
preview route. These checks validate the static preview, not backend integration.

## Deferred backend integration

The next integration stage must agree the base URL, request/response shapes, registration outcome, token field, password validation, and error format with the backend team. Do not infer these from the demo models.

Then replace the preview simulation with real register/login calls; implement the real authentication context, session restoration from `localStorage`, `GET /auth/me`, token-aware Bearer headers, and consistent 401/403 handling. The safe user contract should remain limited to `id`, `email`, `name`, and `role`, with numeric IDs.

The backend remains responsible for identity verification, current roles, and decision ownership. The demo header and future frontend visibility rules are presentation behavior, not authorization. No backend or database changes are included in this stage.
