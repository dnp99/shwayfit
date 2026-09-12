# Authentication

Firebase Authentication provides trainer identity. The React app receives a Firebase ID token and sends it as `Authorization: Bearer <token>` to the Go API. The API verifies the token with the Firebase Admin SDK before any business authorization happens.

`GET /api/v1/me` is the first authenticated endpoint. It returns the verified Firebase identity only; it does not grant organization or client access. Future handlers must also check active membership, membership role, and client assignment in Firestore.

## Configuration

The Firebase web app is named `shwayfit-web`. Copy `frontend/.env.example` to `frontend/.env.local` for local work. Firebase web configuration is public browser metadata, not a server credential.

Cloud Run uses Application Default Credentials from its runtime service account. No service-account JSON key belongs in this repository or the frontend.

## Google sign-in

The POC uses Google sign-in only. Email/password, phone authentication, and client sign-in are not enabled. Firebase Authentication authorizes `localhost`, `shwayfit.app`, and `shwayfit-f7f0b.web.app` for this flow.

The sign-in page is available at `/sign-in`. A verified identity is not yet a ShwayFit trainer membership; organization provisioning is the next authorization step.
