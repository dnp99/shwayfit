# Shared contracts

This folder is the language-neutral contract between the React frontend and Go API.

Use it for:

- OpenAPI specifications for REST endpoints.
- Shared request and response examples.
- Stable error-code definitions.
- Contract fixtures used by frontend and backend tests.

The contract is the source of truth for API shapes. Go and TypeScript keep their own idiomatic types or generated clients; neither application imports the other's source code.

## Layout

```text
shared/contracts/
  openapi.yaml            API paths, schemas, and authentication requirements
  examples/               Request and response examples
  fixtures/               Test data shared across applications
```

`openapi.yaml` documents the live health, identity, organization, and client endpoints. Keep it synchronized with [API documentation](../../docs/api.md) whenever public API behaviour changes.
