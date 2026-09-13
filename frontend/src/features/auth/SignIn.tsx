import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, type User } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ThemeToggle } from '../../components/ThemeToggle'
import { getFirebaseAuth, restoreFirebaseAuthSession } from '../../lib/firebase'

export function SignIn() {
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true)
  const navigate = useNavigate()

  const completeSignIn = useCallback(async (user: User) => {
    const token = await user.getIdToken()
    const response = await fetch('/api/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      throw new Error('ShwayFit could not verify this sign-in. Please try again.')
    }
    await response.json()
    navigate('/clients', { replace: true })
  }, [navigate])

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    restoreFirebaseAuthSession()
      .then(() => {
        const auth = getFirebaseAuth()
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!active) return
          if (!user) {
            setIsCheckingRedirect(false)
            return
          }
          void completeSignIn(user).catch((caught: unknown) => {
            if (active) setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
          }).finally(() => { if (active) setIsCheckingRedirect(false) })
        })
        return getRedirectResult(auth)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.')
      })
    return () => { active = false; unsubscribe() }
  }, [completeSignIn])

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
        {isCheckingRedirect ? (
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
