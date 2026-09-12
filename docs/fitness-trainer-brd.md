# Business Requirements Document

## ShwayFit — Fitness Trainer Client Management App

**Version:** 0.3 — Draft for review  
**Date:** September 12, 2026  
**Product name:** ShwayFit  
**Domain:** https://shwayfit.app  

## 1. Purpose

Provide independent fitness trainers with a mobile-first application to manage clients, appointments, workout plans, purchased sessions, and client progress in one place. The initial proof of concept (POC) serves one trainer. The design must accommodate five independent trainers and later organizations with multiple trainers and a client-facing application.

The POC should validate the daily workflow and reduce manual administration while aiming for minimal hosting costs. Zero operating cost is a target, not a guarantee.

## 2. Business objectives

- Make it easy to schedule and review appointments from a phone.
- Maintain one accessible record for each client.
- Make completed and remaining package sessions clear and auditable.
- Keep workout plans and appointment history associated with the correct client.
- Support appointment reminders to reduce missed sessions.
- Establish isolated business accounts and permissions that can support future growth.

## 3. Users and access model

| User | Business need | Release scope |
|---|---|---|
| Independent trainer / owner | Manage their own clients and business | POC |
| Trainer within an organization | Manage assigned clients under organization permissions | Future |
| Client | Access their own workouts, appointments, balances, and progress | Future |

Each independent trainer starts with an organization containing only themselves. Records belong to that organization. Trainers operating independent businesses do not share clients or data.

Roles belong to organization memberships rather than being a single global role on a user. An owner can also perform trainer duties. Organization membership, role, and client assignment determine access; a trainer role alone does not grant access to every client.

The POC does not require invitations, organization administration screens, or client login. Future owner access to other trainers’ client records must be explicitly defined before shared organizations launch.

## 4. Scope

### Included in the POC

1. Trainer authentication and isolated business access.
2. Appointment creation, rescheduling, cancellation, and completion.
3. Appointment calendar and daily agenda.
4. Client create, read, update, and delete functionality, subject to history-retention rules.
5. A workout plan for each client.
6. Appointment history for each client.
7. Purchased session packages, opening balances, used sessions, and remaining sessions.
8. Dated progress notes and measurements as a proposed lightweight substitute for photos.
9. Send-only email appointment reminders through Resend; exact timing remains open.
10. Phone-first responsive operation with laptop support.

### Excluded from the POC

- Progress photo uploads, storage, galleries, or embedded external images.
- Google Drive and iCloud integrations.
- SMS reminders, including Twilio integration; deferred beyond the POC.
- Inbound email, reply processing, and a hosted reminder mailbox.
- Client-facing login or portal.
- Dedicated iOS or Android applications.
- Multiple-trainer organization administration, invitations, and client sharing.
- Payments, invoicing, subscriptions, payroll, and accounting.
- Video sessions, wearable integrations, nutrition planning, and advanced analytics.
- External calendar synchronization, group bookings, and recurring appointment series unless separately approved.

## 5. Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-01 | Trainer sign-in | A registered trainer can sign in and sign out. Unauthenticated users cannot access business data. Initial account provisioning and recovery approach must be selected before implementation. |
| FR-02 | Organization isolation | All business data access is authorized by the backend. A trainer cannot read or modify another independent business’s clients, appointments, plans, balances, or progress by changing a request. |
| FR-03 | Client management | A trainer can create, find, view, and edit a client. Proposed fields are name, contact details, goals, status, and notes. Invalid required fields produce clear errors. Delete/archive behavior follows the agreed retention rule. |
| FR-04 | Book an appointment | A trainer selects a client, date, start time, duration, and optional notes. A saved appointment appears in the calendar and client history. Conflicting bookings follow the agreed overlap policy. |
| FR-05 | Manage appointments | A trainer can reschedule, cancel, mark completed, or mark no-show. Status changes update the calendar, history, reminder eligibility, and session accounting consistently. |
| FR-06 | Calendar view | A trainer can navigate dates and open appointment details. Proposed defaults are a daily agenda on phones and a week view on laptops. Empty days are clearly represented. |
| FR-07 | Appointment history | Each client profile lists past and upcoming appointments with dates, times, and current statuses. Older history can be loaded without fetching all records at once. |
| FR-08 | Session packages | A trainer can record a package’s session quantity and purchase/start date. For existing clients, they can record sessions already used without inventing past appointments. The app displays used and remaining sessions with an explanation of the opening balance. |
| FR-09 | Session accounting | Completing a chargeable appointment consumes exactly one session from the applicable package. Repeating the same operation does not consume another session. Corrections produce a traceable adjustment. Cancellation, no-show, package allocation, and zero-balance behavior require agreed policies. |
| FR-10 | Client workout plan | A trainer can create, view, and update a client’s workout plan. Proposed content includes exercises, sets, repetitions or duration, and instructions. Plans remain accessible from the client profile. A shared exercise library and automatic programming are not required. |
| FR-11 | Progress history | Proposed: a trainer can add dated notes and measurements and review them chronologically. Measurements have explicit units. Photos are excluded. Exact measurement fields remain open. |
| FR-12 | Email appointment reminders | A scheduled process identifies due reminders and sends email through Resend from a verified ShwayFit domain. Delivery attempts are recorded; retries avoid duplicate reminders. Cancelled appointments are excluded and rescheduled appointments use the updated time. Missing or invalid client email addresses and failed or quota-blocked sends are visible to the trainer. No Reply-To header or inbound reply processing is configured. Reminder content states that replies are not monitored and asks clients to contact their trainer directly. |
| FR-13 | Mobile-first navigation | Today’s appointments, the calendar, clients, and booking actions are usable on a phone without horizontal page scrolling. The same workflows work on a laptop. |

## 6. Main business workflows

### 6.1 Onboard a client

The trainer creates the client profile, records goals and contact details, and adds the initial session package. If the client has already attended sessions, the trainer records an opening used-session count. The trainer can then assign a workout plan and book an appointment.

### 6.2 Schedule and remind

The trainer creates an appointment. The system checks the booking rules and shows it in the calendar. The reminder process uses the appointment’s current schedule and the client’s email address. Clients do not need an app account to receive reminders. Rescheduling or cancellation changes pending reminder eligibility.

### 6.3 Complete a session

The trainer marks an appointment completed. The system records the outcome and applicable session deduction together. The client’s history and balance reflect the change. The trainer can add progress notes and update the workout plan.

### 6.4 Correct an appointment outcome

An authorized trainer corrects an appointment status or session adjustment. The system reconciles the balance once and preserves a record of the correction rather than silently overwriting the session history.

## 7. Business rules

### Established direction

- Independent trainers have separate organizations and do not share clients.
- Business data and permissions are enforced in the backend.
- Session balances are derived from package quantities, opening usage, and recorded session events or adjustments.
- Photo handling is deferred entirely.
- POC reminders use email through Resend; SMS is deferred.
- Reminder email is send-only, with no Reply-To header and no monitored mailbox. Omitting Reply-To does not disable replies; mail clients ordinarily address replies to the sender. Receiving or processing those replies is outside scope.
- Porkbun supplies the domain and DNS management; its paid web-hosting and email-hosting add-ons are not required for the selected architecture.
- The first release serves the trainer; client access is a later phase.

### Proposed defaults requiring review

- Send one reminder 24 hours before each appointment. Timing, preferences, and behavior for bookings made within that window still require review.
- Use reminders@shwayfit.app as the sender after domain verification; the exact sender display name remains to be finalized.
- Booking an appointment does not consume a session; completion does.
- Appointments cannot overlap for the same trainer.
- Cancelled and no-show appointments remain in history.
- Clients with history are archived rather than permanently deleted through routine client management.
- Appointments store an unambiguous time and use the business timezone for display and reminders.
- New accounts use email/password or Google sign-in; phone authentication is not required.

## 8. Conceptual information model

| Entity | Purpose |
|---|---|
| User | Authenticated identity |
| Organization | Business ownership and isolation boundary |
| Membership | User’s role and status within an organization |
| Client | Contact information, goals, status, and assigned trainer |
| Appointment | Client, trainer, schedule, status, and notes |
| Session package | Purchased quantity, opening usage, and applicable dates |
| Session event / adjustment | Auditable consumption, reversal, or correction associated with a package |
| Workout plan | Client’s exercises and training instructions |
| Progress entry | Dated notes and optional measurements |
| Reminder attempt | Scheduled reminder, channel, attempt status, and delivery result |

This is a conceptual model, not a finalized Firestore collection schema. Detailed query patterns and indexes will be defined during technical design.

## 9. Nonfunctional requirements

- **Usability:** Common workflows prioritize touch interaction and clear labels; laptop layouts make use of additional space.
- **Access control:** Every backend operation verifies identity and authorization. Independent-business isolation is verified with negative access tests.
- **Consistency:** Appointment outcomes and session accounting remain consistent under retries and concurrent requests.
- **Privacy:** Client contact details and progress notes are accessible only to authorized users. Logs should avoid unnecessary client data.
- **Performance:** Calendar and history queries are bounded and paginated where appropriate. Numeric response-time targets will be set during technical design.
- **Reliability:** Failed writes and reminder attempts are visible and recoverable. Backup and restore requirements must be agreed before relying on the app for live business records.
- **Growth:** Support one trainer initially and five independent trainers without changing the ownership model. No production capacity guarantee is implied until tested.
- **Cost:** Use available free allowances, bounded queries, and backend scale-to-zero where appropriate. Billing alerts are desirable but do not constitute a spending cap.
- **Portability:** A separate API allows a future native mobile app to reuse business capabilities.
- **Accessibility:** Forms have labels, validation is understandable, and essential workflows support keyboard navigation on laptops.

## 10. Agreed technical direction

| Layer | Proposed choice |
|---|---|
| Web frontend | React and TypeScript |
| Backend | Go REST API; also supports the owner’s goal of learning Go |
| Database | Cloud Firestore |
| Authentication | Firebase Authentication |
| Frontend hosting | Firebase Hosting |
| Backend hosting | Google Cloud Run |
| Reminder scheduling | Scheduled invocation of backend reminder processing; service to be finalized |
| Email delivery | Resend transactional email API, called by the Go backend |
| Domain and DNS | https://shwayfit.app through Porkbun |
| Reminder mailbox / Reply-To | None |
| Photo storage | None in POC |

Frontend and backend remain separately deployable. React and future mobile clients call the Go API for business operations. The backend verifies authentication and enforces membership, roles, and client assignment.

GCP is preferred because the owner already uses it for Routefy. This app’s data and resources should remain logically separate from Routefy. Infrastructure provisioning is not authorized by this document alone.

## 11. Cost assumptions and constraints

The POC aims for zero or minimal usage charges, rather than a guaranteed free service. Go and React do not introduce hosting subscription fees themselves. Cloud Run, Firebase Hosting, Firestore, and authentication have service-specific allowances and billing conditions.

Removing photos eliminates the POC’s photo storage and delivery requirement. It does not eliminate potential costs for backend execution, deployments, database usage, network transfer, or reminder delivery. Some GCP allowances may be shared with Routefy under the same billing account.

Resend’s free transactional email plan was verified on September 10, 2026 as allowing 3,000 emails per month with a cap of 100 per day. These limits are shared across the account’s sending activity, not granted separately to each trainer. For illustration, five trainers with eight appointments per day and one reminder per appointment require 40 reminder emails daily; confirmations or other emails would add to that total. Limits must be rechecked before launch. Source: [Resend pricing](https://resend.com/pricing).

Sending from the ShwayFit domain requires Resend domain verification through DNS records in Porkbun. This does not require a paid email mailbox. Source: [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).

Domain registration and renewal remain separate expenses. No paid Porkbun web or email hosting is required. Expected traffic, deployment region, billing configuration, and operating budget must still be confirmed before estimating total monthly cost. Reminder delivery should expose quota failures rather than silently losing messages or automatically upgrading the plan.

## 12. POC acceptance and success criteria

The POC is ready for trainer evaluation when:

1. The trainer can complete the client creation → package entry → booking → appointment completion workflow on a phone.
2. Calendar and client history show consistent appointment information.
3. Session balances match initial usage, completed appointments, and corrections without double deductions.
4. A client workout plan can be maintained and retrieved.
5. Resend successfully delivers a test email from the verified ShwayFit domain. Reminder processing respects rescheduling and cancellation, avoids duplicates, and exposes failures. Emails contain no Reply-To header and explain that replies are not monitored.
6. A second test organization cannot access the first organization’s records.
7. Core workflows also work on a laptop.
8. Usage can be reviewed against the chosen operating budget.

Business validation should collect trainer feedback on scheduling effort, confidence in session balances, and ease of finding client information. Numerical improvement targets have not yet been set.

## 13. Delivery phases

| Phase | Deliverable |
|---|---|
| 1 — Foundation | Authentication, organization membership, client management, and mobile navigation |
| 2 — Scheduling | Booking, calendar, appointment outcomes, history, and session packages |
| 3 — Client management depth | Workout plans and agreed progress notes/measurements |
| 4 — Reminders and POC validation | Resend domain verification, email reminder delivery, end-to-end checks, isolation checks, and cost review |
| Later | Client portal, dedicated mobile app, organization administration, additional trainers, optional Twilio SMS reminders, and optional external photo links/integrations |

## 14. Open decisions

| Decision | Why it matters |
|---|---|
| Reminder timing, preferences, and bookings made within the reminder window | Proposed default is one email 24 hours before the appointment; late-booking behavior remains open |
| Cancellation and no-show charging rules | Accurate session deductions |
| Package expiry, multiple active packages, and allocation order | Correct session balances as clients purchase more sessions |
| Booking and completion with no remaining sessions | Whether to warn, block, or permit an outstanding balance |
| Client archive versus permanent deletion | History integrity and retention expectations |
| Required client fields and measurement fields | Scope and data validation |
| Appointment overlap policy and default duration | Scheduling behavior |
| Initial trainer registration method | Owner provisioning and account access |
| Business timezone and deployment region | Scheduling, data location, and costs |
| Backup/restore expectations and monthly budget | Operational readiness |

## 15. Later photo direction

The owner prefers exploring Google Drive or iCloud links later so the application does not store image files. The feasibility of displaying private external images, rather than opening shared links, depends on provider authentication and sharing capabilities. No external image integration or embedding capability is assumed for this POC.

## 16. Revision history

| Version | Changes |
|---|---|
| 0.1 | Initial trainer-first POC requirements and React, Go, Firestore, and GCP direction |
| 0.2 | Named the app ShwayFit; recorded the Porkbun domain and pending setup status; selected Resend email reminders for the POC; deferred SMS; clarified send-only email with no Reply-To or mailbox, DNS prerequisites, and free-plan limits |
| 0.3 | Recorded the public ShwayFit domain as https://shwayfit.app |

## 17. Review status

This draft records the current product direction. Proposed defaults and open decisions are not yet approved business rules. Review should resolve the rules needed for each implementation phase before that behavior is built.
