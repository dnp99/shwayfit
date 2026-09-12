# Cloud infrastructure

ShwayFit uses the Google Cloud project `shwayfit-f7f0b`. It is separate from Routefy: services, data, IAM configuration, and budget tracking belong to this project only. It shares the approved Google Cloud billing account with Routefy.

## Live services

| Service | Configuration | Purpose |
| --- | --- | --- |
| Firebase Hosting | `https://shwayfit.app` and `https://shwayfit-f7f0b.web.app` | Hosts the React/Vite frontend. Requests to `/api/**` are forwarded to Cloud Run. |
| Cloud Run | `shwayfit-api`, `northamerica-northeast1` | Runs the Go REST API. It scales to zero when idle and is limited to one instance for the POC. |
| Cloud Firestore | `(default)`, `northamerica-northeast1` | Stores ShwayFit business data. Browser access is denied; the Go API accesses it with Cloud Run credentials. |
| Firebase Authentication | Google sign-in | Authenticates trainers and supplies ID tokens verified by the Go API. |

The public health endpoint is available at:

```text
https://shwayfit-f7f0b.web.app/api/v1/health
```

## Domain

`shwayfit.app` is configured as a Firebase Hosting custom domain. DNS uses these root-domain records:

| Type | Host | Value |
| --- | --- | --- |
| A | blank (root) | `199.36.158.100` |
| TXT | blank (root) | `hosting-site=shwayfit-f7f0b` |

The Firebase TXT record verifies domain ownership and should remain in DNS. `https://shwayfit.app` is connected and serving the application. A separate Google Search Console TXT record verifies ownership for OAuth branding and should also remain in DNS.

## Cost controls

- Cloud Run has `min-instances=0` and `max-instances=1`.
- A monthly **CAD $10** Cloud Billing budget applies only to `shwayfit-f7f0b` and alerts billing-account recipients when current spend reaches the budget.
- The budget is a notification, not a hard cap. It does not automatically stop services.

## Next infrastructure work

1. Replace the default Cloud Run runtime identity with a dedicated service account holding only the Firestore permissions the API needs.
2. Complete Google OAuth branding verification for the ShwayFit name, custom domain, privacy page, and logo.
3. Deploy the organization/client API revision to Cloud Run after its feature branch is merged.
