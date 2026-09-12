import { getRedirectResult, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '../../components/ThemeToggle'
import { getFirebaseAuth } from '../../lib/firebase'

type Identity = {
  uid: string
  email: string
  emailVerified: boolean
}

export function SignIn() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true)

  async function completeSignIn(user: { getIdToken: () => Promise<string> }) {
    const token = await user.getIdToken()
    const response = await fetch('/api/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      throw new Error('ShwayFit could not verify this sign-in. Please try again.')
    }
    setIdentity(await response.json() as Identity)
  }

  useEffect(() => {
    let active = true
    getRedirectResult(getFirebaseAuth())
      .then(async (credential) => {
        if (active && credential) await completeSignIn(credential.user)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
      })
      .finally(() => {
        if (active) setIsCheckingRedirect(false)
      })
    return () => { active = false }
  }, [])

  async function signIn() {
    setError(null)
    setIsSigningIn(true)
    try {
      const auth = getFirebaseAuth()
      try {
        const credential = await signInWithPopup(auth, new GoogleAuthProvider())
        await completeSignIn(credential.user)
      } catch (caught) {
        if (typeof caught === 'object' && caught !== null && 'code' in caught && caught.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, new GoogleAuthProvider())
          return
        }
        throw caught
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="sign-in-page">
      <header className="sign-in-header">
        <a className="brand" href="/" aria-label="ShwayFit home"><span className="brand-mark" aria-hidden="true">s</span><span>ShwayFit</span></a>
        <ThemeToggle />
      </header>
      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <p className="eyebrow">TRAINER ACCESS</p>
        <h1 id="sign-in-title">Welcome to ShwayFit</h1>
        {identity ? (
          <p>You are signed in as <strong>{identity.email}</strong>. Trainer access will be available once your organization is set up.</p>
        ) : isCheckingRedirect ? (
          <p>Checking your sign-in…</p>
        ) : (
          <>
            <p>Sign in with the Google account connected to your training business.</p>
            <button className="button" type="button" onClick={signIn} disabled={isSigningIn}>
              {isSigningIn ? 'Signing in…' : 'Continue with Google'}
            </button>
          </>
        )}
        {error && <p className="sign-in-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}
