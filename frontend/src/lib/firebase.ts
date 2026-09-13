import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAKexkOxO8HzuCv8VgQWDYCQ9-p6ZuuRf4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shwayfit-f7f0b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shwayfit-f7f0b',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:552652876512:web:5c8245e8219635106c7e85',
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp()
  }

  return initializeApp(firebaseConfig)
}

// Firebase configuration is public browser metadata. Authentication and API
// authorization still depend on a signed Firebase ID token.
export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

// Explicit local persistence makes a refresh restore the Firebase session
// before route guards decide whether a trainer must sign in again.
export function restoreFirebaseAuthSession() {
  return setPersistence(getFirebaseAuth(), browserLocalPersistence)
}
