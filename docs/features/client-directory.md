# Client directory

The authenticated workspace presents a directory-first client page. Trainers can search active or archived records, scan responsive client cards, and open a selected record at `/clients/:clientId`. New records open at `/clients/new`. Cards show only data the client API provides: name, training goals, status, and optional preferred time window. Appointment timing and package balance summaries stay out of cards until the corresponding API data is available.

The same view adapts to a vertical card list on phones. The editor is a full page with Back navigation, one-column fields, safe-area-aware actions, and a full-width save control. Package assignment remains available for an existing client in the lower page content.

The directory does not add appointment scheduling, calendar views, client deletion, or fictional dashboard data.
