# Real authentication

Login/register now use the backend. The preview auth instructions are historical;
`/__preview/auth` changes only isolated demo state and cannot authenticate product routes.

## Run

Start MongoDB and the backend from `server/` with its server-only `.env`, then
`npm run start:dev`. From `client/`, run `npm ci` and `npm run dev`.
Vite proxies `/api` to `http://localhost:3000`; an exported `API_PROXY_TARGET`
can override that development target. No backend files were changed by this integration.

Production requires a same-origin reverse proxy for `/api`, or a build-time
`VITE_API_BASE_URL` pointing at the backend plus backend CORS configuration.
`vite preview` does not provide the development proxy. Never put MongoDB,
JWT signing secrets or internal-tool keys in frontend environment variables.

## Files and behavior

- `src/auth/api.ts`: auth requests using the decisions API base URL and safe internal redirects.
- `src/auth/session.ts`, `AuthContext.tsx`: real user, restoration, logout and token lifecycle.
- `src/components/auth/AuthForm.tsx`: real submit, backend-compatible validation and errors.
- `src/decisions/api.ts`: shared token and 401 notification, with 403 left as permission errors.
- `src/main.tsx`, `App.tsx`, `layout/Navbar.tsx`: provider, guarded creation route and header.
- DecisionsPage, DecisionWorkspacePage and TemplatesPage: use the real session for ownership/access.

Registration returns a user without a token and directs to Login. Login returns
`accessToken` and `user`. Only the token is persisted under `decisionlab.accessToken`;
passwords stay transient and are cleared after submission. Restoration uses
`GET /auth/me`. Network restoration failures preserve the token and offer Retry
on protected creation. Invalid credentials clear the session; 403 does not.
Logout invalidates pending authentication results. Public browsing remains available.
LocalStorage is accessible to same-origin JavaScript; a future server-managed
HttpOnly cookie design would require a separate backend contract.

## Verification

Build and lint passed. Chromium against the actual Nest backend and a separate
MongoDB container/database verified registration, duplicate email, invalid password,
login, return destination including template query, refresh restoration, logout,
and authenticated creation. Browser fault injection separately verified restoration
network failure/retry and invalid stored tokens. These injected cases are not evidence
of actual network outages. No team database was used.

## Deferred

Direct reading of Finalized decision results still needs a backend read endpoint or
persisted breakdown; this auth change does not alter the calculation/result logic.
Production CORS/reverse proxy and deployment remain separate setup work.
