# Implementation plan

## Starting state and source authority

On September 10, 2026, the local checkout and `git ls-remote origin` showed no tracked files or remote refs. No applicable AGENTS.md was present.

The user's request governs implementation. BRD v0.2 is a draft requirement source; proposed defaults remain proposals. The supplied Markdown BRD, PDF BRD, and proposal were copied unchanged into this directory. The removed introductory registrar and pending-domain lines remain absent. Historical mentions elsewhere in the original documents are preserved as supplied.

The future authenticated frontend will use Tailwind CSS, shadcn/ui, semantic CSS tokens, and System/Light/Dark mode. See [Frontend design system direction](frontend-design-system.md).

## 1. Local foundation (implemented)

- Separate Vite/React/TypeScript application and Go module.
- Phone-first connection screen with real API check, retry, timeout, and unavailable state.
- Versioned health endpoint, server timeouts, graceful shutdown, boundary tests.
- Local setup, separate builds, and API documentation.

## Cloud foundation (implemented)

- Firebase project: `shwayfit-f7f0b`, kept separate from Routefy resources.
- Firestore Standard in `northamerica-northeast1` with deletion protection enabled, point-in-time recovery disabled, and browser access denied by rules.
- Firebase Hosting serves the React landing page and proxies `/api/**` to Cloud Run.
- Cloud Run service: `shwayfit-api` in `northamerica-northeast1`, scale-to-zero, one instance maximum, 256 MiB memory, 1 CPU, and a 30-second request timeout.
- The Routefy billing account is linked to the ShwayFit project as a billing source only.
- A project-only CAD 10 monthly budget alert is configured.
- `shwayfit.app` is connected to Firebase Hosting and serves the landing page and API health check.

Resend is not configured.

## 2. Authentication (implemented)

- Firebase Authentication uses Google sign-in only; email/password, phone authentication, and client login are not enabled.
- The sign-in page obtains a Firebase ID token and calls the Go API's authenticated `GET /api/v1/me` endpoint.
- The API verifies the token using the Firebase Admin SDK. A verified identity does not by itself grant access to organization data.
- `localhost`, `shwayfit.app`, and `shwayfit-f7f0b.web.app` are authorized for Google sign-in.

## 3. Organization authorization and first client (next)

Create the first organization and active `owner` membership for the existing trainer account. There is no public registration, invitation, or organization-management screen in the POC.

Build organization-owned collections and membership role checks. Keep business access in the Go API and browser Firestore access denied. Every business endpoint verifies identity, active membership, permitted role, and client assignment. Add negative tests for cross-organization access and same-organization, unassigned clients.

Agree the required client fields before building forms. Then implement create, list, detail, and edit. Defer archive/delete behavior until the retention rule is agreed. Add a local Firestore-emulator workflow and a seed command for two organizations and test identities.

## 4. First complete flow

Trainer sign-in → create client → record package with opening usage → book appointment → complete session.

Resolve charging point, zero-balance behavior, multiple packages/allocation/expiry, timezone, duration, and overlap policy before affected behavior is built. Implement package/session events with Firestore transactions: status change, package accounting, and immutable audit event must commit together. Use a stable operation identity and transaction-safe callback; never send email inside a transaction. Verify simultaneous completion, repeated requests, and traceable corrections. Cancellation/no-show accounting requires its own policy decision.

## 5. Trainer evaluation

Add phone agenda/calendar, history pagination, workout plans, and agreed progress fields. Decide archive rules. Then implement reminders through Resend, after deciding timing and late-booking behavior. Recheck allowance before launch; record retries, delivery failures, quota blocks, cancellation/reschedule eligibility, and duplicate prevention. Reminder emails explain that replies are not monitored and tell clients to contact their trainer directly. No Reply-To header or inbound mailbox.

Confirm backup/restore expectations before storing live client records. Do not assume free allowances imply zero cost.

## Go choices

- `net/http` is enough for the initial REST surface; no framework needed.
- `cmd/api` owns process lifecycle; `internal/httpapi` cannot be imported by unrelated external modules and owns the HTTP boundary.
- Construct a router per instance instead of using a global default mux; tests remain isolated.
- `context` supplies a bounded graceful-shutdown window. Future database calls should carry request contexts for cancellation.
- Add service and storage interfaces when business operations require them, rather than creating unused abstractions now.

## Reference documentation

- [Vite setup and requirements](https://vite.dev/guide/)
- [Go net/http](https://pkg.go.dev/net/http)
- [Official Go downloads](https://go.dev/dl/)

The scaffold uses the versions resolved in `frontend/package-lock.json`; it does not assume floating latest versions at install time.

## Foundation verification

Passed with Go 1.27.1 and Node 20.20.1: Go race-enabled tests, go vet, backend binary build, frontend lint, and TypeScript/Vite production build. Browser verification covered 390px phone and 1280px desktop layouts, real proxy connectivity, API unavailable after shutdown, successful retry after restart, and Google sign-in followed by a verified `/api/v1/me` request. Supplied document copies were byte-compared with their originals.
