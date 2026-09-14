# AGENT.md

Standing rules for anyone working in this repository.

## Documentation rule

Document every material change in the same work session.

1. Update a relevant file in [`docs/`](docs/) when changing an API, data model, authentication flow, infrastructure setting, product decision, or developer workflow.
2. Keep [`shared/contracts/openapi.yaml`](shared/contracts/openapi.yaml) aligned with public API behaviour. The contract is the frontend/backend source of truth.
3. Add comments for non-obvious decisions and safety constraints. Explain why the code exists, not what a line of code does.
4. Use `docs/` for current behaviour and `plans/` for approved future work. Add `plans/` only when a plan needs to be recorded.

## Branch and push workflow

1. Before a non-trivial change, update the current branch from its remote when it is safe to do so.
2. Work on the shared `develop` branch for feature work unless the user explicitly requests another branch.
3. Never force-push.
4. Never push without the user's explicit request in the current conversation.
5. Before an approved push, run and pass:

   ```sh
   npm --prefix frontend run lint
   npm --prefix frontend run build
   cd backend && go test -race ./... && go vet ./...
   ```

## Client-data protection

ShwayFit will hold client contact details, workout information, notes, and measurements. Treat this as sensitive data.

1. Do not put client data in URLs, browser storage, analytics, logs, exception messages, screenshots, fixtures, or documentation.
2. Use realistic-looking but fictional names only in examples, seed data, and tests.
3. Never store service-account keys, access tokens, refresh tokens, or secrets in the repository. Firebase web configuration is public client metadata; it is not a secret.
4. Every business endpoint must verify the Firebase ID token, active organization membership, membership role, and client assignment. A client or organization ID supplied by the browser never proves access.
5. Browser clients do not access Firestore directly. The Go API owns business data access.

## Architecture and contracts

- `frontend/` is the React and TypeScript application.
- `backend/` is the Go REST API, deployed independently to Cloud Run.
- `shared/contracts/` holds language-neutral OpenAPI contracts, examples, error codes, and shared fixtures. Go and TypeScript own their own types.
- `docs/` describes the current product, API, cloud configuration, and design decisions.
- Keep HTTP handlers thin: parse and validate input, call domain logic, and return a contract-defined response.
- Use dependency injection at infrastructure boundaries so tests can use fakes without Firebase, Firestore, or network calls.

## Firestore and session accounting

1. Use Firestore transactions for session completion and any balance adjustment. Operations must be retry-safe and record an audit event.
2. Do not implement cancellation charges, no-show charges, expiry, allocation order, or zero-balance behaviour until their business rules are approved.
3. Do not add client-facing access, payments, photos, external calendar sync, group bookings, or recurring series unless the scope is explicitly expanded.

## Frontend design system

Before authenticated trainer screens expand, adopt the direction in [`docs/design-system.md`](docs/design-system.md): Tailwind CSS, shadcn/ui, semantic CSS tokens, and System/Light/Dark mode.

1. Use semantic tokens rather than hard-coded colours in new authenticated UI components.
2. Components must work in light and dark mode through the same token names.
3. Design phone-first with 44px minimum touch targets; add laptop layouts without making a separate product experience.

## Code hygiene

1. Keep files focused. Split a file that grows beyond roughly 500 lines or begins to own unrelated responsibilities.
2. Extract repeated behaviour into a tested helper, hook, or component as soon as it appears twice.
3. Keep Go domain logic outside HTTP handlers and test it independently. Keep React components presentational where practical.
