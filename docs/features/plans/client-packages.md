# Client packages

## Package options

Each organization has trainer-managed package options that define reusable session allowances, for example a single session, five sessions, or ten sessions. An option has a name, included session count, and active or archived status.

Options are organization-scoped. Archiving hides an option from future package assignment while preserving it for existing client records. Options that have already been used must not be deleted or changed in a way that rewrites a client's historical package.

## Current delivery

The first package slice provides trainer-managed options at `/packages`. Active organization members can create options with a name and one to one hundred included sessions, list active and archived options, and archive an option. When no options exist, the screen prompts the trainer to create their first package in a reusable dialog. The API is organization-scoped and requires an active Firebase-backed membership.

This slice intentionally does not create a client package, record a balance, restore an archived option, edit an existing option, or process an appointment. Those actions need the transaction and immutable audit-event rules described below.

## Client packages

When a trainer assigns a package to a client, ShwayFit creates a client-specific package instance. It copies the selected option's name and included-session count, then records the opening balance. Later edits to the reusable option never alter existing client balances or audit history.

Each client may have one active package. The opening operation runs as one Firestore transaction: it confirms that the selected option remains active, rejects a second active package, copies the allowance into the client package, sets the client's active-package reference, and writes an immutable `opened` audit event. Completed packages remain as history; package completion and session deductions are the next scheduling slice.

Prices, payments, expiry, transfers, refunds, and automatic package allocation are not part of this scope.
