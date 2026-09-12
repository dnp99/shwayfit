# Cloud infrastructure

ShwayFit uses the Google Cloud project `shwayfit-f7f0b`. It is separate from Routefy: services, data, IAM configuration, and budget tracking belong to this project only. It shares the approved Google Cloud billing account with Routefy.

## Live services

| Service | Configuration | Purpose |
| --- | --- | --- |
| Firebase Hosting | `https://shwayfit-f7f0b.web.app` | Hosts the React/Vite frontend. Requests to `/api/**` are forwarded to Cloud Run. |
| Cloud Run | `shwayfit-api`, `northamerica-northeast1` | Runs the Go REST API. It scales to zero when idle and is limited to one instance for the POC. |
| Cloud Firestore | `(default)`, `northamerica-northeast1` | Stores ShwayFit business data. Browser access is denied; the Go API will access it with server credentials. |
| Firebase Authentication | Not configured in the app yet | Will authenticate trainers and supply the ID tokens verified by the Go API. |

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

The TXT record verifies domain ownership for Firebase Hosting and should remain in DNS. Firebase must complete verification and issue the TLS certificate before `https://shwayfit.app` becomes live.

## Cost controls

- Cloud Run has `min-instances=0` and `max-instances=1`.
- A monthly **CAD $10** Cloud Billing budget applies only to `shwayfit-f7f0b` and alerts billing-account recipients when current spend reaches the budget.
- The budget is a notification, not a hard cap. It does not automatically stop services.

## Next setup work

1. Wait for Firebase to verify `shwayfit.app` and mint its TLS certificate.
2. Configure Firebase Authentication for trainer sign-in.
3. Create a dedicated Cloud Run runtime service account with the smallest Firestore permissions needed, before business data access is added.
4. Add the first authenticated API flow: trainer sign-in, create a client, add a session package, book an appointment, and complete it.
