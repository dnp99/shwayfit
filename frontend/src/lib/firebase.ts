import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  setPersistence,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAKexkOxO8HzuCv8VgQWDYCQ9-p6ZuuRf4",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "shwayfit-f7f0b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shwayfit-f7f0b",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:552652876512:web:5c8245e8219635106c7e85",
};

const trustedDeviceKey = "shwayfit.auth.trusted-device";
const sessionExpiryKey = "shwayfit.auth.expires-at";
export const maxSessionAgeMs = 24 * 60 * 60 * 1000;
let sessionRestore: Promise<void> | undefined;
let cachedAuth: Auth | undefined;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// Firebase configuration is public browser metadata. Authentication and API
// authorization still depend on a signed Firebase ID token.
//
// Persistence is specified here, at Auth initialization, rather than via a
// later setPersistence() call. Firebase's SDK begins hydrating auth state
// from storage the moment the Auth instance is created; a setPersistence()
// call issued afterward can race that hydration and win before it finds an
// existing session, leaving currentUser stuck at null even though the
// session is sitting in storage. Passing an ordered persistence array here
// makes hydration itself check all three backends, removing the race.
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = initializeAuth(getFirebaseApp(), {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
    ],
  });
  return cachedAuth;
}

function isTrustedDevice() {
  return window.localStorage.getItem(trustedDeviceKey) === "true";
}

function sessionStorageFor(trusted: boolean) {
  return trusted ? window.localStorage : window.sessionStorage;
}

export function sessionExpiresAt() {
  const expiry = Number(
    sessionStorageFor(isTrustedDevice()).getItem(sessionExpiryKey),
  );
  return Number.isFinite(expiry) ? expiry : null;
}

export function remainingSessionMs() {
  const expiry = sessionExpiresAt();
  return expiry === null ? null : expiry - Date.now();
}

function clearSessionMetadata() {
  window.localStorage.removeItem(trustedDeviceKey);
  window.localStorage.removeItem(sessionExpiryKey);
  window.sessionStorage.removeItem(sessionExpiryKey);
}

// A trainer explicitly chooses whether Firebase may retain credentials across
// browser restarts. The choice itself is non-sensitive; tokens remain Firebase-owned.
// This call happens before any session exists (ahead of signInWithPopup), so it
// cannot race hydration the way a post-hoc setPersistence() call can.
export async function configureFirebaseAuthPersistence(trusted: boolean) {
  if (trusted) window.localStorage.setItem(trustedDeviceKey, "true");
  else window.localStorage.removeItem(trustedDeviceKey);
  await setPersistence(
    getFirebaseAuth(),
    trusted ? browserLocalPersistence : browserSessionPersistence,
  );
}

// The 24-hour deadline is absolute rather than activity-based. It protects a
// forgotten open workspace without silently extending a sensitive session.
export function beginFirebaseAuthSession() {
  if (sessionExpiresAt() !== null) return;
  sessionStorageFor(isTrustedDevice()).setItem(
    sessionExpiryKey,
    String(Date.now() + maxSessionAgeMs),
  );
}

export async function endFirebaseAuthSession() {
  clearSessionMetadata();
  await signOut(getFirebaseAuth());
}

// Persistence itself is now set once, at Auth initialization (see getFirebaseAuth).
// This function's remaining job is just the 24-hour expiry check: if a previous
// session has passed its absolute deadline, sign it out before the app trusts it.
export async function restoreFirebaseAuthSession() {
  if (sessionRestore) return sessionRestore;
  sessionRestore = (async () => {
    const remaining = remainingSessionMs();
    if (remaining !== null && remaining <= 0) {
      await endFirebaseAuthSession();
    }
  })().catch((error: unknown) => {
    sessionRestore = undefined;
    throw error;
  });
  return sessionRestore;
}
