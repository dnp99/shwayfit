# Authentication session security

**Status:** Complete — September 17, 2026

## Delivered policy

ShwayFit trainer sessions expire 24 hours after sign-in. This is an absolute deadline, so normal workspace activity never extends it.

- **Shared-device default:** Firebase uses browser-session persistence. Closing the browser ends the session sooner.
- **Trusted personal device:** The sign-in page offers an explicit opt-in to retain Firebase's browser session across restarts. The 24-hour deadline still applies.
- **Automatic sign-out:** The application checks the deadline when it restores a session, while the app is open, and when a backgrounded tab becomes visible again.
- **Visible sign-out:** Desktop navigation, mobile navigation, and Settings provide a direct Sign out action.
- **Sign out all devices:** Settings can revoke the current trainer's Firebase refresh tokens. It then signs out the current browser.

## Server enforcement

The Go API validates protected Firebase ID tokens with revocation checking. Revoking refresh tokens prevents new ID tokens from being minted from previous Firebase sessions, and the API rejects revoked tokens before returning application data.

`POST /api/v1/session/revoke` is authenticated as the caller and only revokes that caller's Firebase sessions. It returns `204 No Content` on success and `503 authentication_unavailable` when Firebase cannot complete revocation.

## Privacy boundary

The frontend stores only the trusted-device preference and an expiry timestamp. Firebase Auth retains its own credentials; ShwayFit does not write Firebase tokens into application-managed local storage.
