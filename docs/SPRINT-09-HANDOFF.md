# Sprint 09 handoff — Inventory & Transport

## Scope delivered

Sprint 09 adds the Inventory and Transport workspaces without replacing the existing SchoolOS
shell or prior modules.

### Primary routes

Inventory:

1. `Inventory`
2. `Issue Item`
3. `Add Item Stock`
4. `Add Item`
5. `Item Category`
6. `Item Store`
7. `Item Supplier`

Transport:

1. `Transport`
2. `Routes`
3. `Vehicles`
4. `Assign Vehicle`

All records and transactions are browser-memory simulations. They reset on reload.

## Inventory model and reconciliation

The shared operations provider owns categories, stores, suppliers, items and movements. Item
balance is never a separately editable value: it is derived from signed movements, optionally
scoped to a store. Opening balances, receipts, issues, adjustments and valid returns therefore
reconcile through one ledger.

Movement checks cover active item/store references, non-zero whole quantities, valid dates, unique
references, receipt/issue signs, adjustment reasons, safe minor-unit costs and prevention of
negative resulting stock. Confirmed movement rows are retained; the correction flow appends a
request to history rather than silently editing quantity. Returns link back to an issue and cannot
exceed the original issue quantity after prior returns.

Item checks cover unique SKU and optional barcode, safe reorder/value fields, and zero-stock
archival. Category, store and supplier records prevent case-insensitive duplicate names/codes and
guard deactivation while active item or stock references remain.

The issue flow uses shared Workforce staff/departments and shared student rows. It presents current
and projected balance before explicit confirmation and produces a clearly simulated issue slip.
Estimated stock value uses the Finance module's display currency, but no Finance posting occurs.

## Transport model and integrity

Routes retain ordered stops, endpoints, days, timetable context, required capacity, optional shared
student IDs and status history. Vehicles retain registration, type, capacity, service/expiry context
and operational status.

Assignments require:

- an active route;
- an available or currently assigned vehicle;
- vehicle capacity at least equal to the route requirement;
- an active driver from the shared Workforce registry;
- a valid effective period and service days; and
- no overlapping active assignment for the route, vehicle or driver on a shared day.

An active assignment must be ended before its route is deactivated or its vehicle moves to
maintenance, out-of-service or retired status. Unassignment records a date/reason and returns the
vehicle to available. Route-row assignment now preselects the selected route.

## Connected views

- The original Operations navigation now exposes both overview routes and all nine subroutes.
- School Pulse includes record-backed stock, low-stock, fleet and assignment drilldowns.
- Inventory recipients and transport drivers use shared Workforce/student references.
- Finance currency formatting is reused for estimated inventory values without implying accounting.
- Preview roles and loading/empty/error/restricted states remain explicit UI proposals, not real
  authentication or authorization.

## UX and responsive behavior

The routes reuse SchoolOS `OperationsUI`, `AssessmentUI`, icon and token patterns. They include
search, filters, sorting, pagination, optional detail columns, confirmation dialogs, dirty-form
navigation protection, empty states and audit/history details. Wide data stays in intentional table
scrollers while the page shell remains within the viewport.

The Sprint 09 browser suite exercises all 11 routes at 390, 430, 768, 1024, 1280, 1440 and 1600
pixels, plus live receipt, duplicate reference, issue, insufficient-stock, duplicate SKU, route,
vehicle, capacity, assignment and unassignment flows.

## Verification

- `pnpm test:operations`: 20/20 checks passed.
- Existing model suites: 136/136 checks passed:
  - Learning 18
  - Examination 23
  - Academic 29
  - Finance 39
  - Workforce 27
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- `node tests/operations-browser-qa.mjs`: 89/89 checks passed, including 77 route/width checks and
  no runtime exceptions.
- Established browser regressions: 259/259 checks passed:
  - Cross-module 49
  - HR/Communication 76
  - Examination 56
  - Learning/Library 78

## Prototype boundaries and known gaps

This sprint does **not** provide a database, persistent ledger, real identity/authentication,
authorization, file storage, institutional transactions, procurement workflow, purchase orders,
supplier portal/actions, inter-store transfer workflow, accounting postings, GPS, maps, telemetry,
driver availability calendar, maintenance ledger, student transport enrollment, notifications or
provider integrations. Expiry and service alerts are comparisons against manually entered dates.
Assignment conflicts use browser-memory records only.

The illustrative opening stock, route, vehicle and supplier are seed examples and must not be
treated as institutional facts. Production adoption requires backend transactions, concurrency
control, audit identities, permissions, data retention, import/export policy and reconciliation with
the institution's procurement, accounting and transport processes.

## Recommendation

Before extending the prototype, convert movement and assignment confirmations into transactional
backend commands with immutable audit events and role-scoped access. Define stock-count,
procurement, transfer, maintenance and student-enrollment policies with school operators before
adding those workflows.

Sprint 10 was not started.
