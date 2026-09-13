# Cloud Run deployment

The API service is named `shwayfit-api` and runs in `northamerica-northeast1`, alongside the Firestore database. Firebase Hosting proxies `/api/**` to this service. The service needs public invocation because the browser calls it through Hosting; application handlers verify Firebase ID tokens and organization authorization for every business endpoint.

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

## Remaining deployment hardening

- Replace the default Cloud Run runtime identity with a dedicated service account that has only the Firestore permissions the API needs.
- Keep the `/api/**` Firebase Hosting rewrite aligned with the Cloud Run service name and region.
- Treat the billing budget alert as an early warning, not a spending cap.

## GitHub Actions deployment

`.github/workflows/firebase-hosting-merge.yml` is the production release workflow. On a push to `main`, it validates the React and Go applications, deploys the API to Cloud Run, then deploys Firebase Hosting. This order prevents Hosting from serving a frontend that requires an API revision which is not live yet. Pull requests deploy only a Firebase Hosting preview; they never change the shared Cloud Run service.

GitHub authenticates to Google Cloud through Workload Identity Federation, rather than a downloaded service-account key. The bootstrap uses a dedicated `github-actions-deployer` identity and restricts federation to this repository:

```sh
PROJECT_ID=shwayfit-f7f0b
PROJECT_NUMBER=552652876512
POOL_ID=github-actions
PROVIDER_ID=github-actions-shwayfit
SERVICE_ACCOUNT=github-actions-deployer

gcloud iam service-accounts create "$SERVICE_ACCOUNT" --project "$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --role roles/run.sourceDeveloper
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --role roles/serviceusage.serviceUsageConsumer
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --role roles/artifactregistry.reader
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --role roles/firebasehosting.admin
gcloud iam service-accounts add-iam-policy-binding "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --project "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --role roles/iam.serviceAccountUser
gcloud iam workload-identity-pools create "$POOL_ID" --project "$PROJECT_ID" --location global --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" --project "$PROJECT_ID" --location global --workload-identity-pool "$POOL_ID" --display-name GitHub --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" --attribute-condition "assertion.repository=='dnp99/shwayfit'" --issuer-uri https://token.actions.githubusercontent.com
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" --project "$PROJECT_ID" --role roles/iam.workloadIdentityUser --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/dnp99/shwayfit"
```

The former `FIREBASE_SERVICE_ACCOUNT_SHWAYFIT_F7F0B` GitHub secret is no longer needed after the federation setup succeeds and can be deleted from the repository settings.
