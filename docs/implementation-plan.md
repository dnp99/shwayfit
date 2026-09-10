# Implementation plan

## Starting state and source authority

On September 10, 2026, the local checkout and `git ls-remote origin` showed no tracked files or remote refs. No applicable AGENTS.md was present.

The user's request governs implementation. BRD v0.2 is a draft requirement source; proposed defaults remain proposals. The supplied Markdown BRD, PDF BRD, and proposal were copied unchanged into this directory. The removed introductory registrar and pending-domain lines remain absent. Historical mentions elsewhere in the original documents are preserved as supplied.

## 1. Local foundation (implemented)

- Separate Vite/React/TypeScript application and Go module.
- Phone-first connection screen with real API check, retry, timeout, and unavailable state.
- Versioned health endpoint, server timeouts, graceful shutdown, boundary tests.
- Local setup, separate builds, and API documentation.

No Firebase, GCP, Resend, DNS, or Routefy resources have been changed.

## 2. Sign-in and first client

First decide sign-in and initial provisioning: recommendation for review is Google sign-in with a manually provisioned owner membership, no public registration. Also agree required client fields before building forms. These are not approved choices.

Use Firebase Authentication and Firestore emulators with an isolated demo project for local work. Add a seed command for two organizations and test identities. Before cloud setup, select a dedicated ShwayFit GCP/Firebase project and region, separate from Routefy.

Design organization-owned collections and membership roles from the start. Keep business access in the Go API; browser Firestore access should be denied. Verify identity, active membership, permitted role, and assigned trainer. Include cross-organization and same-organization/unassigned-client negative tests. Implement create/list/detail/edit after field validation is agreed; defer archive/delete until retention is decided.

## 3. First complete flow

Trainer sign-in → create client → record package with opening usage → book appointment → complete session.

Resolve charging point, zero-balance behavior, multiple packages/allocation/expiry, timezone, duration, and overlap policy before affected behavior is built. Implement package/session events with Firestore transactions: status change, package accounting, and immutable audit event must commit together. Use a stable operation identity and transaction-safe callback; never send email inside a transaction. Verify simultaneous completion, repeated requests, and traceable corrections. Cancellation/no-show accounting requires its own policy decision.

## 4. Trainer evaluation

Add phone agenda/calendar, history pagination, workout plans, and agreed progress fields. Decide archive rules. Then implement reminders through Resend, after deciding timing and late-booking behavior. Recheck allowance before launch; record retries, delivery failures, quota blocks, cancellation/reschedule eligibility, and duplicate prevention. Reminder emails explain that replies are not monitored and tell clients to contact their trainer directly. No Reply-To header or inbound mailbox.

Domain verification, cloud provisioning, and production deployment are later work requiring an explicit request. Confirm operating budget and backup/restore expectations before live records. Do not assume free allowances imply zero cost.

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

Passed with Go 1.27.1 and Node 20.20.1: Go race-enabled tests, go vet, backend binary build, frontend lint, and TypeScript/Vite production build. npm reported zero known vulnerabilities at installation. Browser verification covered 390px phone and 1280px desktop layouts, real proxy connectivity, API unavailable after shutdown, and successful retry after restart. Supplied document copies were byte-compared with their originals.
