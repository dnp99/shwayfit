# ShwayFit frontend

React + TypeScript with Vite. See the [root README](../README.md) for local setup and verification.

`npm ci`, then `npm run dev`. Build using `npm run build`; check with `npm run lint`.

The sign-in screen leads to the authenticated organization setup and client workspace. The frontend never reads Firestore directly; business data comes from the Go API.
