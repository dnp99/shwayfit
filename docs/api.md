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

## Next contract, not yet implemented

Business endpoints will live under `/api/v1/organizations/{organizationId}/...`. The backend must verify Firebase ID tokens, active organization membership, membership role, and client assignment on every business operation. A path identifier or frontend-selected organization never proves access. Owner status does not implicitly grant access to another trainer's clients.

Before adding business routes: choose the initial sign-in/provisioning approach, define a common JSON error contract, bound request sizes and queries, and add negative authorization tests. Future native apps use the same REST API.
