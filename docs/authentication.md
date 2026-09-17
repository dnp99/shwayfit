# Authentication

Firebase Authentication provides trainer identity. The React app receives a Firebase ID token and sends it as `Authorization: Bearer <token>` to the Go API. The API verifies the token with the Firebase Admin SDK before any business authorization happens.

`GET /api/v1/me` is the first authenticated endpoint. It returns the verified Firebase identity only; it does not grant organization or client access. Future handlers must also check active membership, membership role, and client assignment in Firestore.

## Configuration

The Firebase web app is named `shwayfit-web`. Copy `frontend/.env.example` to `frontend/.env.local` for local work. Firebase web configuration is public browser metadata, not a server credential. Vite embeds `VITE_*` values in the browser bundle, so moving the Firebase web API key to a GitHub secret or removing its source fallback would not make it private and would break the current build unless an equivalent public configuration source were added.

The Firebase-created browser API key is protected in Google Cloud by both API and website restrictions. Its API allowlist includes Firebase Authentication (`identitytoolkit.googleapis.com` and `securetoken.googleapis.com`) and Firebase-managed services. Its browser referrer allowlist is limited to:

- `https://shwayfit.app/*`
- `https://shwayfit-f7f0b.web.app/*`
- `https://shwayfit-f7f0b.firebaseapp.com/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

Review API-key usage in Google Cloud before rotating the key. Rotate only for unexpected usage or an untrusted configuration change; rotating a Firebase browser key is an availability change and must be followed by a sign-in check on the production domain.

Browser clients cannot read or write Firestore. `firestore.rules` denies every direct request, and the Go API accesses business data with its server runtime identity after authenticating and authorizing each request.

Cloud Run uses Application Default Credentials from its runtime service account. No service-account JSON key belongs in this repository or the frontend.

## Session lifetime and sign-out

Each trainer session has an absolute 24-hour lifetime from sign-in. It is not extended by activity. By default, ShwayFit uses browser-session persistence, so closing the browser ends the session earlier. A trainer may select **Stay signed in on this personal device** at sign-in to persist the Firebase session across browser restarts; that choice does not extend the 24-hour deadline.

The application provides **Sign out** in navigation and Settings. Settings also offers **Sign out all devices**, which revokes the trainer's Firebase refresh tokens and ends the current browser session. The API verifies each protected Firebase ID token with revocation checking, so tokens issued before a completed revocation are rejected. Firebase ID tokens are short-lived; a browser cannot obtain a replacement token after its refresh token has been revoked.

## Google sign-in

On a refresh, the application waits for Firebase to restore the selected Firebase session persistence before deciding whether the trainer must sign in again. The React route guard improves navigation only; it does not replace server-side Firebase token, organization membership, role, or client-assignment checks.

The POC uses Google sign-in only. Email/password, phone authentication, and client sign-in are not enabled. Firebase Authentication authorizes `localhost`, `shwayfit.app`, and `shwayfit-f7f0b.web.app` for this flow.

The sign-in page is available at `/sign-in`. It tries a popup on desktop browsers and falls back to Firebase's redirect flow when a browser blocks popups, as mobile Safari commonly does. The first verified trainer creates one organization and receives its active `owner` membership through the authenticated setup screen. Later users require a provisioned membership; Firebase identity alone never grants client-data access.
