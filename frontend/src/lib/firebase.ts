import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAKexkOxO8HzuCv8VgQWDYCQ9-p6ZuuRf4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shwayfit.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shwayfit-f7f0b",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:552652876512:web:5c8245e8219635106c7e85",
};

const trustedDeviceKey = "shwayfit.auth.trusted-device";
const sessionExpiryKey = "shwayfit.auth.expires-at";
export const maxSessionAgeMs = 24 * 60 * 60 * 1000;
let sessionRestore: Promise<void> | undefined;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// Firebase configuration is public browser metadata. Authentication and API
// authorization still depend on a signed Firebase ID token.
export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
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

// Default to browser-session persistence. A trusted-device choice restores a
// browser-local Firebase session, but the separate 24-hour expiry still applies.
export async function restoreFirebaseAuthSession() {
  if (sessionRestore) return sessionRestore;
  sessionRestore = (async () => {
    const trusted = isTrustedDevice();
    await setPersistence(
      getFirebaseAuth(),
      trusted ? browserLocalPersistence : browserSessionPersistence,
    );
    const remaining = remainingSessionMs();
    if (remaining !== null && remaining <= 0) {
      await endFirebaseAuthSession();
      return;
    }
    if (getFirebaseAuth().currentUser && remaining === null)
      beginFirebaseAuthSession();
  })().catch((error: unknown) => {
    sessionRestore = undefined;
    throw error;
  });
  return sessionRestore;
}
