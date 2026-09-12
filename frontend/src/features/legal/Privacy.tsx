export function Privacy() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <a className="brand" href="/" aria-label="ShwayFit home"><span className="brand-mark" aria-hidden="true">s</span><span>ShwayFit</span></a>
      </header>
      <article className="legal-content">
        <p className="eyebrow">PRIVACY</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated September 12, 2026</p>

        <section>
          <h2>What this policy covers</h2>
          <p>ShwayFit is a phone-first client-management application for independent fitness trainers. This policy explains how ShwayFit handles information when trainers use the application and when they maintain records for their clients.</p>
        </section>

        <section>
          <h2>Information we handle</h2>
          <p>When a trainer signs in with Google, Firebase Authentication provides the trainer’s email address, name, profile image, and a unique account identifier. We use that information to authenticate the trainer and determine their ShwayFit access.</p>
          <p>As the POC features are enabled, ShwayFit may store organization details and trainer-entered client information such as names, contact details, goals, session packages, appointments, workout plans, progress notes, and measurements. Trainers are responsible for entering only information they are authorized to manage.</p>
        </section>

        <section>
          <h2>How information is used</h2>
          <p>We use information to provide the client-management service, maintain secure organization access, schedule and record training sessions, and improve the reliability of the product. We do not sell personal information or use client records for advertising.</p>
        </section>

        <section>
          <h2>Service providers and storage</h2>
          <p>ShwayFit uses Google Firebase Authentication for sign-in, Firebase Hosting for the website, Google Cloud Run for the application API, and Cloud Firestore for business data. Business data is configured to be stored in Canada. Authentication and infrastructure providers may process the information needed to operate their services under their own terms and privacy policies.</p>
          <p>When appointment reminders are introduced, ShwayFit will use Resend to deliver email. Reminder emails will contain only the information needed to communicate the appointment and will not accept or process replies.</p>
        </section>

        <section>
          <h2>Access and security</h2>
          <p>ShwayFit is designed so trainers access only records in their own organization. The application verifies sign-in identity and organization permissions before business data is read or changed. No system can guarantee absolute security, so trainers should use an account they control and contact us promptly about suspected unauthorized access.</p>
        </section>

        <section>
          <h2>Retention and requests</h2>
          <p>We retain information while it is needed to operate ShwayFit, meet applicable obligations, resolve disputes, and enforce agreements. Trainers can contact us to request access to, correction of, or deletion of their trainer account information. Client-data requests should normally be directed to the trainer responsible for that client’s record.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>For privacy questions, contact <a href="mailto:pateldeep1001@gmail.com">pateldeep1001@gmail.com</a>.</p>
        </section>
      </article>
    </main>
  )
}
