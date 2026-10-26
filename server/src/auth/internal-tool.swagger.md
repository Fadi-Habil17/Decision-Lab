# Template route Swagger note for the TemplatesModule owner

For each POST/PATCH/DELETE template handler protected by `InternalToolGuard`, document the two supported credentials. Add both decorators to the handler:

```ts
@ApiSecurity('access-token')
@ApiSecurity('internal-tool-key')
@ApiHeader({
  name: 'x-internal-tool-key',
  required: false,
  description: 'Internal automation key. Alternatively authenticate as an Admin with Bearer JWT.',
})
```

Use `@UseGuards(InternalToolGuard)`. Do not add this guard to GET template routes.
