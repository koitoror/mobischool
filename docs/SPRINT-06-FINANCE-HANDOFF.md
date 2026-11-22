# SchoolOS Sprint 06 — Finance Operations Handoff

## Status and chronology

Sprint 03 was the original Finance design sprint. The repository entering Sprint 06 already
contained an interactive Finance prototype and regression coverage. Sprint 06 therefore preserves
that work and acts as the Finance implementation and gap-closure sprint: it strengthens the shared
ledger, Student 360 and School Pulse reconciliation, allocation evidence, receipt detail, aging,
payment methods, audit visibility, responsive evidence, and documentation. This record does not
rewrite Sprint 03 or imply production financial processing.

This sprint is ready for product-owner review, not production acceptance. All records are
illustrative, browser-memory simulations that reset on reload. No bank, mobile-money, card, email,
SMS, storage, accounting, authentication, or authorization service is connected.

## 1. Complete 18-frame inventory and original submenu mapping

### Fees Collection — 10 frames

| Frame | Original route      | Implemented purpose                                                                                           |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| FN-01 | Fees Collection     | Reconciled overview, trends, aging, class collection, recent payments, due watchlist, discounts and reminders |
| FN-02 | Collect Fees        | Student search → obligations → payment → allocation review → confirmation → receipt                           |
| FN-03 | Search Fees Payment | Searchable confirmed-simulation payment register and receipt detail                                           |
| FN-04 | Search Due Fees     | Outstanding student accounts, aging, collection and reminder entry points                                     |
| FN-05 | Fees Master         | Fee schedule reference configuration with historical-change warnings                                          |
| FN-06 | Fees Group          | Distinct fee grouping reference management                                                                    |
| FN-07 | Fees Type           | Distinct fee-type reference management                                                                        |
| FN-08 | Fees Discount       | Discount configuration, eligibility preview and guarded obligation reduction                                  |
| FN-09 | Fees Reminder       | Audience selection, message preview and simulated queue                                                       |
| FN-10 | Bulk Fee Receipts   | Confirmed-payment selection, batch preview, print preview and export                                          |

### Income — 4 frames

| Frame | Original route | Implemented purpose                                         |
| ----- | -------------- | ----------------------------------------------------------- |
| IN-01 | Income         | Non-fee income KPIs, trend, category breakdown and register |
| IN-02 | Add Income     | Validated draft, review and simulated confirmation          |
| IN-03 | Search Income  | Filtered non-fee income ledger and immutable detail         |
| IN-04 | Income Head    | Independent income-category configuration                   |

### Expenses — 4 frames

| Frame | Original route | Implemented purpose                                  |
| ----- | -------------- | ---------------------------------------------------- |
| EX-01 | Expenses       | Expense KPIs, trend, category breakdown and register |
| EX-02 | Add Expense    | Validated draft, review and simulated confirmation   |
| EX-03 | Search Expense | Filtered expense ledger and immutable detail         |
| EX-04 | Expense Head   | Independent expense-category configuration           |

All original route labels remain in the Operations navigation. Fees, Income, and Expenses remain
separate concepts and stores within one shared Finance ledger.

## 2. Implemented features and workflow map

- **Fee setup:** groups, types, schedules and discounts are configurable in local state. Creating a
  schedule does not silently bill students; obligation assignment/versioning requires backend
  policy.
- **Cashier collection:** uses the existing Student Information records. Inactive students, missing
  obligations, invalid dates, disabled methods, missing required references, duplicate references,
  stale reviews, invalid allocations, and overpayments are blocked.
- **Partial/multiple allocation:** a positive amount may be lower than selected balances and may
  cover several selected obligations.
- **Payment search:** confirmed simulations are searchable by receipt, reference, student name or
  ID and filterable by class, method and date.
- **Due fees:** outstanding and overdue are distinct; actions retain the selected student when
  entering collection or reminders.
- **Discount:** one explicit capped concession may reduce an eligible unpaid Tuition obligation.
  It never counts as cash received.
- **Reminder:** selected due accounts are previewed with balance and due-date substitutions before a
  simulated queue record is created. No delivery is claimed.
- **Bulk receipt:** only existing confirmed simulation payments are eligible; no empty or pending
  receipt is invented.
- **General income/expense:** reviewed entries update their separate ledgers and category reporting.
  They do not alter student fees.
- **School Pulse:** confirmed payments update shared collected/outstanding/rate indicators and
  charts immediately. Income and expense entries update their own indicators without double
  counting fees.

## 3. Financial data model and definitions

The authoritative prototype state is `FinanceContext` and its `Ledger`:

- `Obligation`: student, session, fee item, original minor-unit amount, discount and due date.
- `Payment`: immutable confirmed simulation with student, amount, date, method, reference, actor and
  allocations.
- `Payment allocation`: an obligation ID and minor-unit amount.
- `Entry`: a separate general `Income` or `Expense` record.
- `Receipt`: a preview generated only from a confirmed `Payment`; receipt ID currently equals the
  payment ID.

Money is stored as safe integer minor units. `expected = gross obligations − discounts`.
`collected = valid allocations`. `outstanding = expected − collected`. General income is not added
to fee collections. Expenses are manual records, not confirmed disbursements.

## 4. Payment lifecycle and allocation rules

1. Select an active existing student.
2. Select one or more positive-balance obligations.
3. Enter amount, enabled method, date and method-dependent reference.
4. Review the allocation without mutating the ledger.
5. See each selected obligation’s previous balance, allocated amount and resulting balance.
6. Confirm explicitly to create one local payment and increment the ledger version.
7. Generate a receipt preview and update Student 360 and School Pulse from the same state.

Current explicit policy is **selected obligations first, in displayed due-line order**. Advance
credit and unallocated money are blocked. The ledger version prevents confirmation from a stale
review. Manual per-line allocation, advances, overpayments, provider idempotency and an
institution-configurable allocation policy remain backend/product decisions.

## 5. Receipt lifecycle

Receipts exist only for confirmed payment simulations. They show school, receipt number, date,
student, admission ID, class/section, session, allocation breakdown, amount, method, reference,
sample receiving actor and remaining student balance. Print and batch print are browser print
previews. Receipt copy includes a prominent simulation disclaimer. Correction requests are tracked
locally without changing balances; reversal/refund rules are not implemented.

## 6. Income and expense workflows

Income and expense each use independent heads, add/review/confirm workflows, filtered registers,
detail drawers, trends and category totals. Amounts must be positive, the selected head active, and
duplicate supplied references are blocked. Confirmed entries are immutable in the UI; correction
requests do not rewrite history. Attachments retain a local filename only.

## 7. Student 360 integration

The existing Fees tab now reads `FinanceContext` directly and shows expected fees, paid amount,
outstanding, overdue as of the preview date, obligation-level discounts and balances, confirmed
payment history, receipt IDs, methods, references and simulation statuses. Collection, payment
register and due-fee actions preserve the selected student. There is no duplicate balance store.
Reminder records remain local to the Finance screen and are described, but are not yet rendered as
a full Student 360 reminder timeline.

## 8. School Pulse integration and KPI definitions

Pulse now reads the same Finance ledger and configured display currency.

| Indicator        | Definition                                       | Drilldown           |
| ---------------- | ------------------------------------------------ | ------------------- |
| Fees Expected    | Obligation amount less discounts                 | Fees Collection     |
| Fees Collected   | Sum of confirmed simulated allocations           | Search Fees Payment |
| Outstanding Fees | Expected less allocated payments                 | Search Due Fees     |
| Collection Rate  | Collected / expected, null when expected is zero | Fees Collection     |
| General Income   | Non-fee income entries only                      | Search Income       |
| Expenses         | Manual expense entries only                      | Search Expense      |

The fee chart uses payment and obligation records by month. Income-versus-expense uses only general
entries. Payment-method totals are derived from payment records. No surplus/profit claim is made.

## 9. Aging and time assumptions

Five buckets are implemented and reconcile to outstanding:

- Current / not yet due.
- 1–30 days overdue.
- 31–60 days overdue.
- 61–90 days overdue.
- Over 90 days overdue.

The prototype uses the explicit illustrative as-of date `2025-02-24` and ISO date comparison.
Production must use the school timezone, auditable cut-off timestamps and configured due-date
policies.

## 10. Roles, audit and accessibility

The preview exposes editable Finance administrator and read-only Finance views. This is UI
demonstration, not authorization. Payment and receipt detail identifies the sample actor, date,
action and simulation status; corrections preserve the original value. Production actions require
server-enforced roles, immutable audit events, reason capture and approval rules.

Keyboard labels, semantic tables, dialog labels, visible validation, intentional table scrolling,
touch-sized shared controls and print styles are present. A complete screen-reader, focus-order,
contrast, zoom, touch-device and printed-receipt audit has not been completed. Some Finance drawers
still need the newer focus-trap/return-focus hook used by Workforce.

## 11. Responsive and browser QA evidence

`tests/browser-qa.mjs` ran against the supervised app in real headless Chromium and passed **49
checks** with no runtime exceptions. It exercised:

- payment review, cancellation and confirmation;
- receipt disclaimer and Student 360 shared-ledger update;
- School Pulse updating from the confirmed payment;
- shared-ledger definitions on Financial insights;
- bulk receipt eligibility and preview;
- cashier workflow at **390, 430, 768, 1024, 1280, 1440 and 1600 px**;
- earlier Student, Front Office, Attendance, Academics, HR/import-directory and navigation
  regressions.

At the seven widths, the cashier page had no page-level overflow and visible form inputs stayed
within the viewport. Tables intentionally scroll within their wrappers. The browser suite does not
constitute a complete visual, touch, receipt-print or every-frame responsive audit.

## 12. Automated verification

- `pnpm exec tsc --noEmit` — passed.
- `pnpm test:finance` — **39/39 passed**, including all 18 SSR routes, reconciliation, partial and
  multi-fee allocation, stale review, duplicate reference, invalid date, overpayment, receipt ID,
  five aging buckets, and separate income/expense summary.
- `pnpm build` — passed; Finance remains a separate lazy-loaded chunk.
- `PREVIEW_URL=http://localhost:3000 node tests/browser-qa.mjs` — **49/49 passed**.

## 13. Known defects and acceptance gaps

- Fee schedule creation does not yet assign obligations; there is no assignment/versioning UI.
- Manual allocation amounts and configurable automatic policies are not implemented.
- Schedule forms do not yet expose every requested scope/recurrence/mandatory field.
- Discount eligibility is intentionally narrow; stacking, scholarship relationships, approval,
  rounding and retroactivity remain unresolved.
- Reminder templates/scheduling are basic and do not share the Communicate provider log.
- Receipts print through the browser; no PDF/file storage or downloadable signed artifact exists.
- Reversals, refunds and approvals are represented as correction requests only.
- Payment register status is confirmed simulation only; provider pending/failed/reversed states are
  absent because there is no provider.
- Filter breadth is narrower than a production ledger (for example amount-range, term and explicit
  receipt-status controls).
- Income/expense edits, reversals and approval workflows are not implemented.
- Student 360 does not yet show a full reminder timeline or discount-application action.
- Finance role names are preview proposals and do not include a complete Cashier/Accountant/
  Finance Officer/Principal/Auditor matrix.

These gaps mean not every listed acceptance criterion is complete.

## 14. Prototype-only state and backend requirements

All state resets on reload. Production requires:

- durable tenant-scoped database and authoritative payment ledger;
- authenticated users, server authorization and separation of duties;
- immutable payment/allocation/receipt/audit records and idempotent provider callbacks;
- fee schedule assignment/versioning and academic session/term relationships;
- transaction locks, concurrency controls, reversals, refunds, adjustments and approvals;
- receipt numbering, PDF generation, signing, storage and reprint policy;
- configurable payment methods/reference rules, cash drawer and closeout;
- mobile-money, bank and card integrations with reconciliation;
- email/SMS providers and delivery callbacks;
- media/attachment storage and malware scanning;
- accounting model, chart of accounts, recognition rules and exports;
- timezone, locale, currency and fiscal-period policy.

The prototype is not accounting-compliant and does not verify or move funds.

## 15. Financial policies awaiting decisions

Product and finance owners must decide the authoritative ledger, confirmation source, allocation
order, advances/overpayments, partial-payment rules, payment immutability, reversals/refunds,
duplicate/reference semantics, receipt locks, schedule versioning, obligation assignment,
installments, penalties, waivers, discount stacking/rounding/approvals, scholarship treatment,
session/term mapping, timezone cut-offs, accounting recognition, chart of accounts, cash controls,
bank reconciliation, approval thresholds and audit retention.

## 16. Next sprint recommendation

Review Sprint 06 with Finance and product owners before starting Sprint 07. Prioritize decisions and
implementation for obligation assignment/versioning, configurable allocation, reversal/refund
governance, role/approval rules, and durable immutable ledger architecture. Then complete a focused
accessibility, receipt-print and every-frame responsive audit. Sprint 07 has not been started.
