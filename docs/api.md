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

## `POST /api/v1/session/revoke`

Requires `Authorization: Bearer <Firebase ID token>`. Revokes the current trainer's Firebase refresh tokens and returns `204 No Content`. The browser then signs itself out locally. Every protected API request verifies Firebase token revocation, so an ID token issued before revocation is rejected once Firebase reports it revoked. The endpoint returns `503 authentication_unavailable` if Firebase cannot perform the revocation.

## Organization and client records

The POC has a one-time, authenticated organization bootstrap: `POST /api/v1/organizations` accepts a 2–80-character business name and creates the caller's organization plus an active `owner` membership. A caller with a membership receives `409 organization_already_exists` rather than being able to create another organization.

`GET /api/v1/organizations/current` returns the organization attached to the verified identity. Client routes deliberately use `current`, rather than accepting an organization ID from the browser:

- `GET /api/v1/organizations/current/clients`
- `POST /api/v1/organizations/current/clients`
- `GET /api/v1/organizations/current/clients/{clientID}`
- `PATCH /api/v1/organizations/current/clients/{clientID}`

`GET` and `PATCH /api/v1/organizations/current/trainer-profile` manage the signed-in trainer's workspace profile. The response returns the Firebase/Google name and verified email for display, while the update endpoint accepts only an optional phone number. ShwayFit does not duplicate the trainer's Google identity in Firestore; the navigation shell uses the Firebase name and email.

The API bounds JSON requests to 64 KiB, rejects unknown fields, and returns the common JSON error shape. First and last name are required. Email, phone, goals, private notes, and a preferred local time window are optional; client status is `active` or `archived`. When supplied, email must be a valid mailbox address. A phone number must use normal phone formatting characters and contain 7–15 digits. When present, the time window has a `preferredStartTime` and `preferredEndTime` in zero-padded 24-hour `HH:MM` format, and the end must follow the start. It records a scheduling preference only; it does not book an appointment.

Optional baseline measurements include `heightCm` (50–300 cm) and a dated `startingWeightKg` (20–500 kg). A starting weight requires an ISO `startingMeasurementDate` and may include 500 characters of context. Height is stored with the client profile. A starting weight is also written to the client’s `measurements/starting` record so a later measurement-history feature has a dated first entry. Delete is intentionally not available.

The verified Firebase identity is mapped to `trainerMemberships/{uid}`. Client data is stored at `organizations/{organizationId}/clients/{clientId}` and includes an assigned trainer UID. Each route checks active membership and role; non-owner trainers are limited to records assigned to their UID. Browser Firestore access remains denied, including to memberships and client contact details.

## Appointments

`GET /api/v1/organizations/current/appointments?from=<RFC3339>&to=<RFC3339>` returns appointments in the requested visible calendar period. `POST /api/v1/organizations/current/appointments` creates a scheduled appointment with `clientId`, an RFC3339 `startAt`, a duration from 15 to 240 minutes in five-minute increments, and optional notes.

Appointments are stored under `organizations/{organizationId}/appointments`. Booking requires an active client with an active package containing at least one remaining session; it does not reserve or consume a package session. The service permits overlapping appointments; the authenticated UI detects overlap with appointments already loaded for the selected period and warns before saving.

`POST /api/v1/organizations/current/appointments/{appointmentID}/complete` requires an `Idempotency-Key` header (8–200 characters). In one Firestore transaction it marks a scheduled appointment completed, deducts one session from the client’s active package, and creates an immutable `session_completed` audit event under that package. If the last session is consumed, the package is marked completed and removed as the client’s active package. A zero balance blocks completion; ShwayFit does not allow negative balances.

Completion idempotency keys are stored organization-scoped. Retrying the same appointment with the same key returns the already-completed appointment and updated package without another debit. Reusing a key for another appointment returns a conflict. Cancellation, no-show charges, expiry, allocation changes, corrections, and reopening completed appointments remain out of scope.
