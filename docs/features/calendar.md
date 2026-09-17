# Calendar

The authenticated Calendar route provides responsive Today, Week, and Month views, date navigation, and a weekday time grid. The wide time and month grids scroll within their own bounded containers on smaller screens so the application page does not overflow. Selecting a day in the Month view opens it in Today view.

Authenticated trainers can book appointments only for active clients with an active package that has at least one remaining session. A booking stores the client, start timestamp, duration, and optional notes; it does not reserve or reduce the package balance. The calendar loads the authenticated organization's appointments for the visible period and joins them with the authorized client directory for display. Its Today, Week, and Month views include keyboard-accessible hour slots; choosing an open hour opens the booking form with that date and time prefilled.

Overlapping appointments are permitted. The booking form detects and warns about overlaps within the currently loaded period, but the API does not reject them.

Selecting a scheduled appointment in the Today or Week view opens its completion confirmation. Completion uses one active package session in a Firestore transaction: it marks the appointment `completed`, reduces the package balance by one, and writes an immutable `session_completed` audit event. When the final session is used, the package becomes `completed` and the client no longer has an active package. A zero balance blocks completion and instructs the trainer to assign a new package.

The completion request requires an `Idempotency-Key` header. Retrying the same appointment with the same key returns the original completion result without a second balance reduction. Reusing a key for a different appointment is rejected. Cancellation, no-show charges, corrections, and reopening a completed session remain out of scope.
