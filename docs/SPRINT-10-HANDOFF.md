# Sprint 10 — Certificates & Alumni

## Delivery status

Implemented the ten primary routes and connected core prototype workflows. This is a substantial
Sprint 10 implementation, **not a claim that every item in the comprehensive acceptance list is
complete**. Remaining gaps and verification limits are listed below. Sprint 11 was not started.

All changes use browser memory and reset on reload. No backend was added.

## Routes / original submenu coverage

Certificate module:

- Certificates Overview
- Student Certificate
- Generate Certificate
- Student ID Card
- Generate ID Card
- Staff ID Card
- Generate Staff ID Card

Alumni module:

- Alumni Overview
- Manage Alumni
- Events

The original six Certificate and two Alumni submenu labels are preserved verbatim. The existing
shell, navigation and prior operational modules remain in place.

## Certificate types and template architecture

Eight illustrative, configurable types: Academic Achievement, Completion Certificate, Participation
Certificate, Appreciation Certificate, Transfer Certificate, Character Certificate, School Leaving
Certificate and Custom Certificate. No eligibility or achievement is inferred from the type.

`credentialsModel.ts` contains shared template, credential, batch, audit, alumni, event, RSVP and
policy types and pure validation/command functions. `CredentialsContext.tsx` owns in-memory state
with synchronous command reconciliation. Shared student and HR identities are referenced by ID.
Issued identity snapshots are deliberately separate from live student/staff records.

Template designers support saved templates, duplication, wording, title, logo/photo placement
presets, three field zones, visibility, orientation, paper/card size presets, font/palette/layout
presets, front/back previews, signatory and school contact text. Name and Reference cannot be
hidden. Sensitive fields are disabled by default and require Administrator preview policy.

Saving an existing template increments its version and retains the prior template. Generation
deep-copies the template into the document. Subsequent design changes do not alter issued records.

## Generation and document lifecycle

The reusable six-step wizard handles certificates, student IDs and staff IDs:

1. Type, session, saved template, authority and new/reissue/replacement mode.
2. Shared recipient search, class/section or department/designation filters, individual/bulk selection.
3. Issue/expiry data, manually supplied wording, explicit eligibility review, photo acknowledgement
   and audited display-name overrides.
4. Individual preview and batch warning summary.
5. Explicit confirmation with ready/skipped counts.
6. Generated/skipped/failed results, reasons and document numbers.

Guards include missing recipients/templates/data, inactive/disabled identities, duplicate valid
documents, issue/expiry dates, missing-photo policy and reissue policy. Mixed batches retain
per-recipient outcomes. Reissue creates a new record and supersedes predecessor records while
retaining snapshots and links. Lost replacement requires a Lost predecessor. Missing photos are
always visibly represented as placeholders; no photo is invented.

The registry includes search, filters, date/session/class/section/type filtering, sorting, pagination,
detail-column visibility, previews, activity history, simulated reprint/download/verification,
reasoned revocation/voiding and ID lost status. Reprint does not issue another credential.
Revoked, voided, expired and superseded records are not treated as valid.

Draft and Generated are represented in the model; production draft queues and activation workflows
are not implemented. Current confirmed ID generation creates Active cards; certificates are Generated.

## Alumni registry and Alumni 360

Supports external historical alumni and creation referencing a shared student, search/group filters,
session/class filters, sorting, pagination, detail-column visibility, selection, bulk status/archive,
editing and reasoned manual graduation review. No student is automatically graduated or disabled.

Import is a pipe-delimited preview of external historical records with validation and duplicate
checks before confirmation. Shared students must use the shared-student creation path.

Alumni 360 includes overview/graduation context, private-contact preview, career/education,
certificate references, participation, communication-simulation disclaimer and timeline. Contacts
are not exposed in the list and are shown only to the School Administrator preview role.

Published examination scores are surfaced as references during review, never graduation evidence.

## Events

Event creation/editing supports type, date/times, description, location, organizer, graduation-year
and class audiences, registration/deadline, capacity, status, image-filename metadata and notes.
Publication/cancellation/archive require a reason. Capacity cannot drop below occupied places.
Duplication creates a new Draft event. Cancellation cancels existing RSVP simulations.

Event details include audience, occupied/waitlist/attendance totals, attendee table and timeline.
Participation supports Registered, Attending, Declined, Waitlisted, Cancelled and Attendance marked.
Checks cover publication, active alumni, audience, deadlines, duplicate status, capacity/waitlist and
registered attendance eligibility. Attendance cannot precede the event date. Export is a clearly
labelled simulation, with no file or real RSVP collection.

The operational comparison date is the existing prototype date, 2025-02-24.

## Integrations

- Student and staff identities reuse their existing providers; there is no second identity registry.
- Session and school name come from shared App configuration.
- Student 360 adds a Credentials / Documents tab without replacing existing tabs. It shows document
  status, expiry, reissue references and previews, plus manually reviewed alumni visibility.
- School Pulse adds record-backed document, skipped/failed generation, alumni, event and RSVP
  drilldowns without changing the original executive KPI row.
- Examination references use published shared scores; no completion rules are invented.

## Verification

- `pnpm test:credentials`: **40/40** (30 model checks + 10 SSR routes).
- Existing model suites: **156/156**:
  Operations 20, Learning 18, Examination 23, Academic 29, Finance 39, Workforce 27.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- `node tests/credentials-browser-qa.mjs`: **109/109**, no runtime exceptions.
- New responsive checks: all ten routes at 390, 430, 768, 1024, 1280, 1440 and 1600px;
  certificate preview, card-designer back, Alumni 360 and RSVP/attendance drawer also checked at
  every width. Checks assert page and drawer width containment, not pixel-perfect visual review.
- Browser workflow coverage: bulk certificate generation, snapshot watermark/reprint,
  revocation, template save/version increment, student/staff ID generation, manually reviewed alumni
  creation, event publication, registration and attendance.
- Prior browser regressions: **348/348**, with successful final exits:
  Cross-module 49, Workforce/Communication 76, Examination 56, Learning/Library 78,
  Inventory/Transport 89. Combined with Sprint 10: **457 browser checks**.

## Accessibility findings / limits

Reuses labelled Fields, native buttons, table headers, status/alert announcements and the existing
focus-managed AssessmentDialog with close/Escape handling. Template controls use readable labels;
previews carry explicit front/back labels and invalid/prototype status text.

No automated contrast audit, full screen-reader audit, exhaustive keyboard-only flow audit or
physical print verification was performed. Responsive containment does not establish all of these.

## Remaining acceptance gaps / known limitations

- Pulse and overview KPIs navigate to operational routes but do not all carry a specific filter.
- Template placement uses presets, not drag-and-drop or arbitrary coordinates/dimensions.
  School logo/photo surfaces are placeholders, not a new media pipeline.
- No actual PDF generation, downloadable PDF, print integration or cryptographic verification.
  Print/download/reprint controls simulate and audit the action.
- Generation results show numbers/outcomes; preview/reprint is accessed through the issued registry,
  not directly per result row.
- Alumni import is deliberately narrow, external historical rows only; no spreadsheet parser.
- Academic history references and manually reviewed alumni status do not constitute a genuine
  student-to-graduate enrollment transition or verified completion decision.
- No alumni profile photo editor, real communications history or real invitation workflow.
- ID expiry is derived and displayed; no scheduler, automated renewal or separate activation queue.
- No genuine role authorization. Officers' UI edit permissions are illustrative; production role
  separation and contact privacy require server enforcement.
- Designer, generation and detailed lifecycle commands have model coverage but not every edge case
  has a dedicated browser interaction test. Student 360 integration was source/type checked, not
  separately exercised by the Sprint 10 browser script.
- Draft and generation-pending metrics are derived from represented records/batch outcomes, not
  an asynchronous job processor.

## Production boundaries / dependencies

No secure signing, trusted verification identifiers, persistent issued records, PDF storage, real
card printing, real RSVP collection, messaging or production authorization is connected.
Before production: transactional persistence, unique constraints/idempotency, authenticated audit
actors, server-side role/privacy enforcement, consent/retention policies, eligibility definitions,
historical enrollment data, controlled photos/media, signed document rendering/storage, accessible
print layouts, import governance and event-registration concurrency control are required.

## Recommended Sprint 11

Do not start it automatically. First close the explicit Sprint 10 acceptance gaps with operator
review, then agree the next module scope. Prioritize verified eligibility policy, filtered Pulse
drilldowns, direct generation-result previews and full keyboard/screen-reader/print QA before
expanding the prototype further.
