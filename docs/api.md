# API contract

## Implemented

### GET /api/v1/health

Public, dependency-free liveness check. Does not access client data, Firebase, Firestore, or Resend. A successful response is not evidence those integrations are ready.

- Status: `200 OK`
- Content-Type: `application/json`
- Cache-Control: `no-store`

```json
{"status":"ok","service":"shwayfit-api"}
```

Go's router also supports HEAD for this GET route. Other methods return 405; unknown paths return 404. Those router errors currently use Go's standard plain-text responses.

The endpoint is deployed through Firebase Hosting at `/api/v1/health`, which proxies to the `shwayfit-api` Cloud Run service in `northamerica-northeast1`.

Shared endpoint contracts will live in [`../shared/contracts/`](../shared/contracts/) as the API expands. The OpenAPI specification will be the language-neutral source of truth between the React frontend and Go backend.

## `GET /api/v1/me`

Requires `Authorization: Bearer <Firebase ID token>`. The API verifies the token and returns the authenticated Firebase identity. It does not itself authorize organization data; the organization and client endpoints below enforce membership, role, and client assignment.

## Organization and client records

The POC has a one-time, authenticated organization bootstrap: `POST /api/v1/organizations` accepts a 2–80-character business name and creates the caller's organization plus an active `owner` membership. A caller with a membership receives `409 organization_already_exists` rather than being able to create another organization.

`GET /api/v1/organizations/current` returns the organization attached to the verified identity. Client routes deliberately use `current`, rather than accepting an organization ID from the browser:

- `GET /api/v1/organizations/current/clients`
- `POST /api/v1/organizations/current/clients`
- `GET /api/v1/organizations/current/clients/{clientID}`
- `PATCH /api/v1/organizations/current/clients/{clientID}`

The API bounds JSON requests to 64 KiB, rejects unknown fields, and returns the common JSON error shape. First and last name are required. Email, phone, goals, private notes, and a preferred local time window are optional; client status is `active` or `archived`. When present, the time window has a `preferredStartTime` and `preferredEndTime` in zero-padded 24-hour `HH:MM` format, and the end must follow the start. It records a scheduling preference only; it does not book an appointment. Delete is intentionally not available.

The verified Firebase identity is mapped to `trainerMemberships/{uid}`. Client data is stored at `organizations/{organizationId}/clients/{clientId}` and includes an assigned trainer UID. Each route checks active membership and role; non-owner trainers are limited to records assigned to their UID. Browser Firestore access remains denied, including to memberships and client contact details.

## Appointments

`GET /api/v1/organizations/current/appointments?from=<RFC3339>&to=<RFC3339>` returns appointments in the requested visible calendar period. `POST /api/v1/organizations/current/appointments` creates a scheduled appointment with `clientId`, an RFC3339 `startAt`, a duration from 15 to 240 minutes in five-minute increments, and optional notes.

Appointments are stored under `organizations/{organizationId}/appointments`. Booking requires an active client with an active client package but does not consume a package session. The service permits overlapping appointments; the authenticated UI detects overlap with appointments already loaded for the selected period and warns before saving. Completion, cancellation, package deduction, and immutable audit events are intentionally not included yet.
