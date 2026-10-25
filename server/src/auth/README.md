# Authentication integration contract

- `POST /auth/register`: `{ email, name, password }` -> `{ user: { id, email, name, role } }`.
- `POST /auth/login`: `{ email, password }` -> `{ accessToken, user }`.
- `GET /auth/me`: Bearer token -> `{ user }`.
- JWT payload is exactly `{ sub: number, email: string }`. Role is always loaded from MongoDB; never trust a role claim in the token.
- Protected controllers should use `@UseGuards(JwtAuthGuard)` and `@CurrentUser()`.
- Admin-only handlers should use `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles('Admin')`.
- Template POST/PATCH/DELETE handlers use `@UseGuards(InternalToolGuard)`. This accepts either a current Admin account or `x-internal-tool-key`; GET template routes remain public.
- Decision write handlers use `JwtAuthGuard` plus the owner check agreed with the Decisions/calculation owners. Exact non-owner response: `You do not have permission to modify this decision` (403).
