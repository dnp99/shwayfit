import './App.css'
import { ThemeToggle } from './components/ThemeToggle'
import { SignIn } from './features/auth/SignIn'

const features = [
  ['01', 'Plan your day', 'See today at a glance, book sessions, and keep every change in one calendar.'],
  ['02', 'Know every balance', 'Record session packages and make completed sessions and remaining visits easy to follow.'],
  ['03', 'Keep care connected', 'Bring goals, workout plans, notes, and appointment history together for each client.'],
]

function App() {
  if (window.location.pathname === '/sign-in') {
    return <SignIn />
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ShwayFit home"><span className="brand-mark" aria-hidden="true">s</span><span>ShwayFit</span></a>
        <nav aria-label="Main navigation"><a href="#how-it-helps">How it helps</a><a href="#pilot">The pilot</a><a href="/sign-in">Sign in</a><ThemeToggle /></nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">FOR INDEPENDENT FITNESS TRAINERS</p>
            <h1 id="hero-title">More time with your clients.</h1>
            <p className="hero-intro">ShwayFit is a phone-first home for your client records, sessions, plans, and training day.</p>
            <a className="button" href="#pilot">Explore the pilot <span aria-hidden="true">↓</span></a>
          </div>
          <div className="agenda-card" aria-label="Example of the ShwayFit daily agenda">
            <div className="agenda-topline"><span>THURSDAY</span><span>SEPT 10</span></div>
            <h2>Good morning.</h2><p className="agenda-subtitle">3 sessions on your calendar</p>
            <div className="appointment"><time>9:00</time><div><strong>Camille R.</strong><span>Strength session · 60 min</span></div><i aria-hidden="true">↗</i></div>
            <div className="appointment"><time>11:30</time><div><strong>Jordan M.</strong><span>Movement &amp; mobility · 45 min</span></div><i aria-hidden="true">↗</i></div>
            <div className="appointment"><time>16:00</time><div><strong>Samira K.</strong><span>Strength session · 60 min</span></div><i aria-hidden="true">↗</i></div>
            <p className="preview-note">Illustrative preview</p>
          </div>
        </section>
        <section className="promise" aria-label="ShwayFit promise"><p>Less time keeping separate records. More time helping people move forward.</p></section>
        <section className="features" id="how-it-helps" aria-labelledby="features-title">
          <div className="section-heading"><p className="eyebrow">MADE FOR THE DAY-TO-DAY</p><h2 id="features-title">The details of training,<br />kept in one place.</h2></div>
          <div className="feature-list">{features.map(([number, title, description]) => <article className="feature" key={number}><span className="feature-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
        <section className="pilot" id="pilot" aria-labelledby="pilot-title">
          <div><p className="eyebrow">A SMALL PILOT, BUILT AROUND FEEDBACK</p><h2 id="pilot-title">A simpler rhythm for your training business.</h2></div>
          <div className="pilot-copy"><p>ShwayFit is being shaped around one trainer’s real workflow, from the first client record to the last session of the day. It will work beautifully on a phone and feel at home on a laptop.</p><p>Client access, payments, photo storage, external calendar sync, and SMS are planned for later. The first version focuses on the work that happens between you and your clients.</p></div>
        </section>
      </main>
      <footer><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">s</span><span>ShwayFit</span></a><p>Built with care. One step at a time.</p><p>© {new Date().getFullYear()} ShwayFit</p></footer>
    </div>
  )
}

export default App
