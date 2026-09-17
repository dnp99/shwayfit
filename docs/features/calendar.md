# Calendar

The authenticated Calendar route provides responsive Today, Week, and Month views, date navigation, and a weekday time grid. The wide time and month grids scroll within their own bounded containers on smaller screens so the application page does not overflow. Selecting a day in the Month view opens it in Today view.

Authenticated trainers can book appointments for active clients that have an active client package. A booking stores the client, start timestamp, duration, and optional notes; it does not reduce the package balance. The calendar loads the authenticated organization's appointments for the visible period and joins them with the authorized client directory for display.

Overlapping appointments are permitted. The booking form detects and warns about overlaps within the currently loaded period, but the API does not reject them. Editing, cancellation, completion, package deductions, and immutable session audit events remain separate follow-up work.
