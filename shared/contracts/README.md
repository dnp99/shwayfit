# Shared contracts

This folder is the language-neutral contract between the React frontend and Go API.

Use it for:

- OpenAPI specifications for REST endpoints.
- Shared request and response examples.
- Stable error-code definitions.
- Contract fixtures used by frontend and backend tests.

The contract is the source of truth for API shapes. Go and TypeScript keep their own idiomatic types or generated clients; neither application imports the other's source code.

## Planned layout

```text
shared/contracts/
  openapi.yaml            API paths, schemas, and authentication requirements
  examples/               Request and response examples
  fixtures/               Test data shared across applications
```

Add `openapi.yaml` when the first authenticated client endpoint is designed. Keep it synchronized with [API documentation](../../docs/api.md).
