# Cloud Run deployment

The API service is named `shwayfit-api` and runs in `northamerica-northeast1`, alongside the Firestore database. Firebase Hosting proxies `/api/**` to this service. The service needs public invocation because the browser calls it through Hosting; application handlers will enforce Firebase ID-token authentication and organization authorization for every business endpoint.

The API's public health endpoint is intentionally unauthenticated. It contains no client data and supports Cloud Run health checks.

## Deployment command

With Google Cloud CLI authentication available, deploy from the repository root:

```sh
gcloud run deploy shwayfit-api \
  --source backend \
  --project shwayfit-f7f0b \
  --region northamerica-northeast1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --min-instances 0 \
  --memory 256Mi \
  --cpu 1
```

`--source backend` builds the container from `backend/Dockerfile`. The instance limits keep the proof of concept scale-to-zero while bounding surprise spend. A request timeout and concurrency will be selected when an endpoint has real database work to measure.

## Before adding business endpoints

- Configure Firebase Authentication and verify Firebase ID tokens in the API.
- Replace the default Cloud Run runtime identity with a dedicated service account that has only the Firestore permissions the API needs.
- Keep the `/api/**` Firebase Hosting rewrite aligned with the Cloud Run service name and region.
- Treat the billing budget alert as an early warning, not a spending cap.
