import { useEffect, useRef } from 'react'
import { remainingSessionMs } from '../../lib/firebase'

export function SessionExpiryGuard({ onExpired }: { onExpired: () => Promise<void> }) {
  const signingOut = useRef(false)

  useEffect(() => {
    let timer: number | undefined
    const expire = () => {
      if (signingOut.current) return
      signingOut.current = true
      void onExpired()
    }
    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      const remaining = remainingSessionMs()
      if (remaining === null) return
      if (remaining <= 0) {
        expire()
        return
      }
      timer = window.setTimeout(expire, remaining)
    }
    const verifyWhenVisible = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', verifyWhenVisible)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', verifyWhenVisible)
    }
  }, [onExpired])

  return null
}
