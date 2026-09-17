# Client intake

**Status:** Complete — September 17, 2026

## Agreed scope

The new-client form includes an optional **Starting measurements** section. Trainers can create a client without entering measurements.

- Height is an optional profile measurement because it changes infrequently.
- Weight is optional and represents the client's initial, dated measurement rather than a mutable profile value.
- A supplied starting weight creates the first dated `measurements/starting` entry for a future measurement-history feature.

The form also includes an optional **Preferred time window**. It consists of one local start and end time, recorded only when both values are present and the end follows the start. It is a general scheduling preference; it does not reserve a slot, create an appointment, or add recurring scheduling.

## Deferred scope

Viewing measurement history, recording subsequent measurements, trends, and progress charts belong to the later progress-tracking feature. This completed intake work does not add those workflows.

## Privacy

Measurements are sensitive client data. They remain organization-scoped, are available only through the authenticated API, and must not be included in URLs, browser storage, logs, or error messages.
