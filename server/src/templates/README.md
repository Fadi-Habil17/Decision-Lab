# Templates: module structure and validation preparation

This first step prepares the module structure and input validation while the
shared Template Mongoose schema is pending. `TemplatesModule` declares its
controller and service, but it is not yet imported by `AppModule`. The controller
and service have no handlers or database methods yet. This is the structure for
Fadi's review before database integration, not a working Templates API.

## Ready

- `TemplatesModule`, `TemplatesController` and `TemplatesService` structure;
  the controller has the `templates` route prefix and Swagger resource tag.
- `CreateTemplateDto`: required name, description and criteria; trims strings,
  validates nested criteria and integer weights from 1 to 100.
- Criteria count is 2 to 8, matching the decision criteria limit.
- `UpdateTemplateDto`: the same checks for supplied fields; omitted fields are
  allowed, but explicit `null` is rejected.
- DTO properties have Swagger descriptions. The application's existing
  `ValidationPipe` rejects unknown fields.
- `validateTemplateCriteria`: rejects a total other than 100 with HTTP 400 and
  duplicate criterion names with HTTP 409 (trimmed, case-insensitive).
- Tests exercise the same validation settings as `main.ts`, including implicit
  conversion. Non-string names and non-number weights remain invalid.
- Separate policy tests reuse Fadi's `InternalToolGuard`: ordinary Users and
  invalid keys are rejected; either a valid key or a fresh Admin role succeeds,
  even if the other optional credential does not authorize the request.

Example editable content from the project specification:

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

This is editable content, not a finalized API response. Templates and their
criteria will also have numeric IDs. Confirm ID allocation and the final
request/response contract with Fadi when the shared schema is available.

## Run from server/

```sh
npm ci
npm test -- test/templates.validation.spec.ts test/templates.guard.spec.ts
npm run build
```

## Planned routes from the assignment

These handlers are not implemented yet. Each will receive an `@ApiOperation`
summary when connected to the service.

| Method | Path             | Access                      | Purpose                                            |
| ------ | ---------------- | --------------------------- | -------------------------------------------------- |
| GET    | `/templates`     | Public                      | List templates, returning only intended fields.    |
| GET    | `/templates/:id` | Public                      | Read one template by numeric ID; 404 if absent.    |
| POST   | `/templates`     | Admin OR valid internal key | Validate and create a template.                    |
| PATCH  | `/templates/:id` | Admin OR valid internal key | Validate and update allowed fields; 404 if absent. |
| DELETE | `/templates/:id` | Admin OR valid internal key | Delete a template; 404 if absent.                  |

Validation failures use 400, duplicate criterion names use 409, and failed
template mutation authorization uses 403 under Fadi's shared guard policy.
DTO validation and the business-rule function must both run before saving.

## Integration still required

1. Review the module structure and use Fadi's shared Template schema; connect
   the module, service and controller without creating a competing schema.
2. After DTO validation, call `validateTemplateCriteria` before persistence.
   For PATCH, validate the complete criteria that would be saved. Omitted
   criteria keep their stored value.
3. Keep both GET routes public. Per `../auth/README.md`, use the shared
   `InternalToolGuard` on POST/PATCH/DELETE for Admin OR valid internal key.
   Follow `../auth/internal-tool.swagger.md` for credential documentation.
4. Test CRUD, not-found responses, public reads and protected mutations once
   the real routes exist.
5. Coordinate with the Decisions owner and test that template edits/deletion
   leave copied decision criteria and weights unchanged. The current tests
   do not claim to test persistence or decision snapshots.
