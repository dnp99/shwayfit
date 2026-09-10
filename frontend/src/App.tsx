import { useEffect, useState } from 'react'
import './App.css'

type Connection = 'checking' | 'connected' | 'unavailable'

function App() {
  const [connection, setConnection] = useState<Connection>('checking')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    let active = true
    async function check() {
      setConnection('checking')
      try {
        const response = await fetch('/api/v1/health', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('API unavailable')
        const body: unknown = await response.json()
        if (typeof body !== 'object' || body === null || !('status' in body) || body.status !== 'ok'
          || !('service' in body) || body.service !== 'shwayfit-api') throw new Error('Unexpected service')
        if (active) setConnection('connected')
      } catch {
        if (active) setConnection('unavailable')
      } finally {
        window.clearTimeout(timeout)
      }
    }
    void check()
    return () => { active = false; window.clearTimeout(timeout); controller.abort() }
  }, [attempt])

  return (
    <div className="app-shell">
      <header className="brand"><span className="brand-mark" aria-hidden="true">s</span>ShwayFit<span className="badge">LOCAL PREVIEW</span></header>
      <main>
        <p className="eyebrow">A LITTLE MORE SPACE FOR WHAT MATTERS</p>
        <h1>Your clients.<br />Your rhythm.</h1>
        <p className="intro">Less time keeping records. More time helping people move forward.</p>
        <section className="welcome" aria-labelledby="welcome-title">
          <div className="section-icon" aria-hidden="true">↗</div>
          <p className="eyebrow">ONE STEP AT A TIME</p>
          <h2 id="welcome-title">A home for your training day.</h2>
          <p>We’re building your space for clients, appointments, and session balances. This first preview checks that the app and API can talk to each other.</p>
          <div className="connection" role="status" aria-live="polite">
            <span className={`dot ${connection}`} aria-hidden="true" />
            {connection === 'connected' ? 'App and API connected' : connection === 'checking' ? 'Checking connection…' : 'API unavailable. Start the Go server and try again.'}
          </div>
          <button onClick={() => setAttempt((value) => value + 1)} disabled={connection === 'checking'}>Check connection <span aria-hidden="true">↗</span></button>
        </section>
        <section className="next" aria-labelledby="next-title">
          <p className="eyebrow" id="next-title">THE FIRST WORKFLOW WE’RE BUILDING</p>
          <ol>{['Sign in', 'Create a client', 'Record a package', 'Book an appointment', 'Complete a session'].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>)}</ol>
          <p className="note">Coming next · Sign-in and client records are not available in this preview.</p>
        </section>
      </main>
      <footer>ShwayFit <span>Built with care. One step at a time.</span></footer>
    </div>
  )
}

export default App
