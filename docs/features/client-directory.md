# Client directory

The authenticated workspace presents a directory-first client page. Trainers can search active or archived records, scan responsive client cards, and open a selected record at `/clients/:clientId`. New records open at `/clients/new`. Cards show only data the client API provides: name, training goals, status, and optional preferred time window. Appointment timing and package balance summaries stay out of cards until the corresponding API data is available.

The full client page is a review dashboard, with the client header, package balance, contact details, training focus, and real appointment history. It includes a direct session-booking action that opens the calendar with that client selected. Editing is a separate full-page route at `/clients/:clientId/edit`, so the detail dashboard does not present a long editable form by default.

Save and Cancel actions appear only after the trainer changes an edit-form field. The action bar remains fixed above phone navigation or at the bottom of the desktop application viewport so the primary save action stays reachable without requiring a scroll to the end of the client package section. Cancel restores the persisted values in place. Optional email and phone fields validate as the trainer types, and phone values format visually after focus leaves the field. Updating an existing client returns to that client’s detail dashboard and dismisses the action bar after a successful save; creating a client opens its new detail page.

The same view adapts to a vertical card list on phones. The editor is a full page with Back navigation, one-column fields, safe-area-aware actions, and a full-width save control. For existing clients, Client status and package balance share one responsive card immediately after Profile; they sit side by side on larger screens and stack on phones.

The directory does not add appointment scheduling, calendar views, client deletion, or fictional dashboard data.
