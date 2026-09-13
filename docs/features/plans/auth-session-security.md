# Authentication session security

## Current behavior

Firebase Authentication manages the browser session. Firebase ID tokens are short lived and renewed by the Firebase SDK while its refresh token remains valid. The API verifies a Firebase ID token on every protected request.

## Planned session policy

ShwayFit will add an explicit session policy for the trainer workspace because it contains sensitive client information:

1. Provide a visible **Sign out** action in the authenticated application shell.
2. Sign the trainer out after 30 minutes without meaningful activity in the workspace.
3. On shared devices, use browser-session persistence so closing the browser ends the session.
4. Later, allow a trainer to opt in to staying signed in on a trusted personal device.

Activity tracking must reset only after a real user action, such as a pointer, keyboard, touch, or approved navigation event. The timeout must show a brief warning before sign-out, clear local Firebase session data through Firebase Auth, and never place tokens in application-managed browser storage.

## Server-side enforcement

The frontend timeout improves local-device privacy but cannot invalidate a token already held elsewhere. For forced sign-out across devices, an administrative action must revoke the Firebase user's refresh tokens. The Go API must then verify token revocation for affected protected requests before returning organization or client data.

## Delivery order

Implement the visible sign-out control with the authenticated application shell. Add inactivity sign-out and its warning as a focused follow-up. Add the trusted-device choice and cross-device revocation administration only after their product copy and recovery flow are approved.
