# Application navigation

## Route map

ShwayFit has a public site and five authenticated product areas:

| Route | Purpose |
| --- | --- |
| `/` | Public marketing site |
| `/sign-in` | Trainer sign-in |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/home` | Trainer overview, upcoming sessions, balance attention, and quick actions |
| `/clients` | Client directory and selected-client details |
| `/packages` | Reusable package-option setup and client package balances |
| `/schedule` | Appointment booking and calendar workflows |
| `/settings` | Trainer, organization, theme, and future preferences |

## Authentication and authorization

The five product routes require a signed-in Firebase user. A frontend route guard improves navigation by directing an unauthenticated visitor to `/sign-in`, but it does not authorize access to data. The Go API remains responsible for Firebase token verification, active organization membership, membership role, and client assignment checks on every business request.

## Current navigation shell

Authenticated pages share a responsive application shell. Desktop uses a persistent sidebar with Today, Clients, Calendar, and Packages; Settings is a secondary item near the trainer identity. Mobile keeps Today, Clients, and Calendar in its bottom navigation and places Packages and Settings under More. The header retains the ShwayFit brand and theme control on narrow screens, while desktop has a compact workspace utility bar.

The shell deliberately uses the existing React Router routes and does not change API calls, authentication, or domain behaviour. Future appointment work can add a dedicated primary action without changing route ownership.

## Delivery slices

1. **Application foundation:** add React Router, preserve the public routes, protect the product routes, and add the shared phone-first authenticated shell.
2. **Client migration:** move the existing client directory and detail workflow to `/clients` without changing its API behavior.
3. **Package options:** allow a trainer to create and archive reusable package options at `/packages`.
4. **Client packages:** assign an option to a client, create its opening balance, and write the immutable opening audit event in one transaction.
5. **Scheduling:** book appointments against a client package, then complete a session with an idempotent balance adjustment and audit event.
6. **Home and settings:** the Today dashboard now combines the current day's agenda, weekly session count, active-client count, real package-balance attention items, direct client links, and the existing idempotent session-completion flow. Settings displays the Firebase/Google name and email, manages an optional trainer phone number, and includes session-security controls. Organization preferences remain future work.
