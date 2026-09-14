import { getFirebaseAuth } from './firebase'

// The browser supplies a short-lived Firebase ID token; authorization remains
// in the Go API and never relies on a client-provided organization identifier.
export async function api(path: string, options: RequestInit = {}) {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error('Your sign-in has ended. Please sign in again.')
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'ShwayFit could not complete this request.')
  }
  return response.status === 204 ? null : response.json()
}
