# Sprint 12 — Reports & Analytics

## Delivery status

Implemented a connected frontend reporting workspace with 16 views. All original submenu names are
preserved. This delivery is **not a claim that the entire comprehensive acceptance checklist is
complete**; remaining analytical and workflow gaps are documented below. Sprint 13 was not started.

Reports read the same operational providers as the source modules. There is no reporting-only seed
dataset, database, backend, warehouse or reporting API.

## Navigation / routes

The Reports entry uses the existing sidebar and page-state convention. Namespaced internal page
keys avoid collisions with operational routes. Visible submenu names remove the `Reports / ` prefix.

1. Reports Overview
2. Reports / Student Information
3. Reports / Finance
4. Reports / Attendance
5. Reports / Examinations
6. Reports / Online Examinations
7. Reports / Lesson Plan
8. Reports / Human Resource
9. Reports / Homework
10. Reports / Library
11. Reports / Inventory
12. Reports / Transport
13. Reports / Hostel
14. Reports / Alumni
15. Reports / User Log
16. Reports / Audit Trail Report

## Shared components

`Reports.tsx` introduces ReportPageHeader, ReportFilterBar, DateRangePicker,
AcademicSessionSelector, ReportKpiCard, ReportChart, ReportDataTable, ReportColumnSelector,
ReportExportDialog, ReportPrintPreview, SavedReportPanel, ReportEmptyState, ReportErrorState,
ReportLoadingState and ReportDataSourceNote. These compose the existing OperationsUI and
AssessmentUI controls, cards, tables and focus-managed dialogs.

`reportsModel.ts` provides filters, date validation, source-ID deduplication, grouping, marked-only
attendance rate, CSV preview formatting, source definitions and role defaults.
`useReportSources.ts` projects live operational state into read-only report rows.
`ReportsContext.tsx` owns session-only saved configurations, recents, activity and permission proposals.

## Sources and calculations

| Report              | Source and rules                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Student Information | Shared student identity/enrollment data. Class/session projection uses the current App session. No guardian/contact fields are exported. Gender is unavailable.                                                                                                                                                                                                    |
| Finance             | FinanceContext ledger obligations, payments, allocations and entries. Expected = amount minus discounts. Outstanding = net obligations minus all recorded allocations. Collections are payment amounts, never general income. General net = general income minus expenses. All money stays in source minor units and summary cards use shared currency formatting. |
| Attendance          | AcademicContext marked student/date records and leave requests. Rate = (Present + Late) / marked observations, including Absent and Excused in the denominator. Unmarked observations are excluded, not converted into absences. This differs from the source screen's expected-roster rate and is labelled accordingly.                                           |
| Examinations        | Shared score rows joined to exam/group context. Only Published stored percentage/grade/scaleVersion values feed published averages. Drafts are not treated as zero. Pass/fail policy is not explicitly stored, so pass rate is unavailable.                                                                                                                        |
| Online Examinations | Shared attempts. Submitted/Evaluated are completed; In Progress is incomplete. Only Evaluated marks are summed; incomplete attempts have no numeric score.                                                                                                                                                                                                         |
| Lesson Plan         | Shared topics and plans. Topic completion = completed topics / topic records. No duplicate progress percentage or invented historical series.                                                                                                                                                                                                                      |
| Human Resource      | Shared staff, marked staff attendance, leaves and payroll batches. Payroll net summaries appear only for Administrator/HR Officer previews. Salary values are never invented.                                                                                                                                                                                      |
| Homework            | Shared assignments and submissions. Expected = active matching class/section recipients for published assignments; missing = expected minus submitted, clamped at zero. Source submissions retain marked/unmarked status separately.                                                                                                                               |
| Library             | Shared books/copies/members/loans. Titles are counted separately from physical copies. Available copies = copies minus unavailable minus unreturned loans. Overdue uses the academic prototype date.                                                                                                                                                               |
| Inventory           | Shared item and signed movement ledger. Current stock includes all movement kinds. Period movement records are separate from stock snapshots. Unit values are explicitly estimates, not audited costing.                                                                                                                                                           |
| Transport           | Shared routes, vehicles and assignments. Capacity means recorded seats, not passenger utilization. No GPS, fuel, journey or maintenance metrics are inferred.                                                                                                                                                                                                      |
| Hostel              | Readiness-only view; no authoritative occupancy dataset is connected. No fabricated rooms, beds, allocations or revenue.                                                                                                                                                                                                                                           |
| Alumni              | Shared alumni and RSVP records only; Front CMS public events are not merged. Participation is simulated, not real engagement measurement.                                                                                                                                                                                                                          |
| User Log            | Actual session-local report views, saved-configuration and export-confirmation actions. Not an authentication/security log.                                                                                                                                                                                                                                        |
| Audit Trail Report  | Read-only projections of available certificate, alumni, CMS, stock, staff, score and topic histories plus report activity. Missing timestamps/before-after values are not invented.                                                                                                                                                                                |

Financial period filtering is activity/cohort filtering, **not** a historical opening/closing balance
engine. Due dates select obligation cohorts; payment dates select collections independently.
Outstanding for the selected cohort uses all currently recorded allocations. Therefore period
collections must not be presented as necessarily equal to allocations on that same due-date cohort.

## Filters / drilldowns

- From/to dates, session, class, section, category, status, actor/department and text/reference search.
- Changes remain draft until Apply; reversed/invalid dates produce an announced validation error.
- Date ranges exclude undated rows. Future periods can honestly return empty.
- Reset restores current-session/all-date defaults.
- Status/category chart clicks apply the corresponding filter; chart summaries are textual counts.
- Tables support selected columns, source/alphabetical ordering and pagination.
- A row detail dialog shows its source reference and opens the existing operational workspace.
  It does **not** deep-link every record or carry all source-screen filters.
- Pulse has reporting-library, Finance, Attendance and read-only audit entry points.

## Saved configurations / exports

Save current applied filters and columns with a name/description; reopen, duplicate, favorite,
rename/edit metadata and guarded deletion are implemented in browser memory.

CSV preview respects filters and selected columns, escapes quotes and neutralizes basic formula
prefixes. Zero matching rows disable confirmation. Confirmation explicitly reports a simulation;
no downloadable file is created. Print/PDF preview displays the selected filtered table but creates
no PDF or print job.

## Access / governance

Role defaults cover Administrator, Finance Officer, Teacher, HR Officer, Librarian, Inventory Officer,
Transport Officer and Auditor, with editable client-side permission proposals. Restricted report
rows are not rendered/exported. HR payroll projection is additionally gated by role.

This is not production authorization. Teacher scope is module-level rather than verified assigned
class ownership. Permission settings are intentionally accessible proposal controls, not a secure
admin boundary. Audit rows are read-only with no edit/delete action.

## Verification

- `pnpm test:reports`: **37/37**, including 16 SSR routes.
- Existing model/route suites: **239/239**:
  CMS 43, Credentials 40, Operations 20, Learning 18, Examination 23, Academic 29, Finance 39,
  Workforce 27.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- `node tests/reports-browser-qa.mjs`: **122/122**, no runtime exceptions.
- Browser workflow checks: Apply/Reset search, save/reopen filters, export count, invalid date
  announcement, empty results and restricted Finance access.
- All 16 report routes checked at **390, 430, 768, 1024, 1280, 1440 and 1600px**.
  These checks verify page-width containment, not complete visual/accessibility conformance.
- Cross-module browser regression **did not pass**: 44 checks completed before
  `Reload returns to School Pulse` failed. It failed with the original 800ms wait and again
  with a bounded five-second readiness wait. A later independent read-only inspection found
  School Pulse present, but that does not establish the reload check passed.
- Reports were changed to mount only on Reports routes to avoid hidden source projections during
  startup. TypeScript and build passed afterward, but this did not resolve the reload assertion.
- `tests/browser-qa.mjs` now uses a bounded readiness check instead of the fixed 800ms sleep.
  The original expected content assertion remains unchanged and still reports failure.
- This unresolved cross-module regression blocks full Sprint 12 acceptance.
- Independent Workforce browser regression: **76/76** passed.
- Examination browser regression stopped after **11 passing checks** with `TypeError: Illegal
  invocation` in the test's numeric-input interaction at `tests/examination-browser-qa.mjs:179`.
  The suite did not complete and is not counted as passed. No Examination source or test assertion
  was changed to hide this failure.
- Remaining independent suites: Learning **78/78**, Inventory/Transport **89/89** and
  Certificates/Alumni **109/109** passed.
- CMS browser regression stopped after **12 passing checks** because `Open navigation` could
  not be located. That suite is not counted as passed.
- A later Reports browser rerun stopped before its first check when the visible Reports container
  lookup returned null. The earlier **122/122** run remains an observed result, but the latest
  full-batch rerun is **not clean**. Browser stability/render-readiness remains unresolved.
- No combined all-browser-success total is claimed.

## Accessibility findings

Reuses labelled native controls, table headers, focus-managed modal handling and alert/status
announcements. Charts include accessible meter labels and text equivalents; status is not color-only.
No keyboard-only end-to-end or screen-reader audit was performed. Visible focus and full contrast
compliance were not independently measured. These remain acceptance gaps, not verified successes.

## Known gaps / limitations

- The full requested analytical catalog is not complete: time-series/day-week-month charts,
  finance aging/group allocation reports, missing-mark denominators, exam grade distributions,
  question analytics, workforce ratings, historical syllabus trends and detailed borrower/renewal
  analysis need dedicated selectors and UI.
- Several report pages provide generic source-count/category/status summaries rather than all
  requested domain-specific KPIs. No unavailable values are filled with invented measurements.
- Inventory snapshot rows are undated and excluded by date filters; stock-by-store valuation and
  supplier analytics are not complete.
- Transport conflicts are validated by Operations but not independently recomputed in Reports.
- Student admission dates are parsed from existing source values; historical session availability
  remains constrained by the current shared enrollment implementation.
- Some temporal contexts (staff attendance, catalogs, headcount) lack normalized source dates.
  They are excluded from dated selections rather than silently assigned a date.
- User Log covers reporting actions, not every interaction in every module. Audit projection does
  not yet cover every available source timeline.
- Source drilldowns open workspaces with reference details, not precise record-level deep links.
- No new Student 360 report shortcut was added.
- Editing saved configurations changes name/description; to change filters, reopen/apply and save
  a new configuration. An in-place overwrite-filter workflow remains incomplete.
- Report overview shows a curated source-backed summary, not all requested trend panels.
- Current reporting state is in-memory and not separately keyed by stable school/tenant identity.
- Automated tests do not establish all calculation combinations, accessibility, missing-reference
  behaviors or all reversed/adjusted financial scenarios. The source ledger has no refund model.

## Production dependencies / boundary

No persistence, scheduled delivery, background report processing, secure role enforcement, durable
audit infrastructure, data warehouse, reporting API, Hostel source module or external telemetry
is connected. Production requires tenant-scoped source contracts, authorized queries, immutable
audit events, temporal data definitions, tested accounting selectors, report jobs, retention rules,
secure exports and accessible downloadable/printable documents.

Do not start Sprint 13 automatically. Close the explicit Sprint 12 acceptance gaps and complete
operator and accessibility review before declaring the comprehensive sprint fully complete.

---

## Sprint 12A — Acceptance & Recovery — 2026-11-22 UTC

This section is a dated addition; the Sprint 12 results and failures above remain historical evidence.
Full issue records, reproduction steps, diagnoses and the acceptance matrix are in
[`SPRINT-12A-RECOVERY-TRACKER.md`](SPRINT-12A-RECOVERY-TRACKER.md).

### Baseline reproduced before edits

| Suite        | Baseline outcome                                                      |
| ------------ | --------------------------------------------------------------------- |
| Cross-module | Failed after 44 assertions at reload-to-Pulse                         |
| Examination  | Completed 56/56; historical intermittent input failure not reproduced |
| CMS          | Completed 88/88; historical intermittent menu lookup not reproduced   |
| Reports      | Failed before first assertion at immediate lazy-route lookup          |

These baseline commands were run without modifying the tests first. Additional diagnostic
instrumentation was kept in temporary files, not committed as a different application behavior.

### Diagnoses and repairs

1. **REC-01:** the reload readiness loop could match a hidden Pulse heading from the previous
   document before navigation committed. Tests now require a changed document time origin and
   a visible Pulse heading, then run the unchanged reset assertions.
2. **REC-02:** the historical setter used an immediate, unscoped query which could produce a
   null/non-input receiver. The exact historical failure was not reproduced in this baseline.
   The test now waits for the named evaluation dialog's numeric field and validates its type;
   all original marks and shared-result assertions remain. Examination behavior was not changed.
3. **REC-03:** tests now wait for the visible mobile trigger following container resize. Product
   navigation gained Escape close/focus restoration and outside-click dismissal, without adding
   an unnecessary modal/scroll lock to the inline menu.
4. **REC-04:** Reports lazy mounting is awaited using meaningful visible content, rather than
   querying after a fixed 150ms assumption. Original route names and render assertions remain.
5. Shared test click/field helpers now wait for visible enabled actions and labelled controls.
   One focused run exposed the same earlier fixed-delay assumption at the admission form;
   that run failed and was not counted as a completed workflow. The final rerun completed.
6. Reporting identity lookup overlays session enrollment; attendance history resolves its source
   session, and leave rows now carry referenced class/section for filtering.
7. Added source-based Finance aging, collection method, fee-type allocation and class-balance
   reconciliation tables, plus category-specific Attendance, Examination, Inventory, Library,
   Transport and Alumni reconciliation summaries.

`src/reportReconciliation.ts` uses selected source IDs and the existing finance ledger. Due-cohort
rate is allocated-on-cohort / net expected; period collections remain separate. There is no
reporting-only ledger, copied identity registry or persistence layer.

### Executed verification

- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- All nine model/route suites: **282/282** passed:
  Reports **43**, CMS **43**, Credentials **40**, Operations **20**, Learning **18**,
  Examination **23**, Academic **29**, Finance **39**, Workforce **27**.
- Reports has six new reconciliation model tests (previously 37, now 43): financial cohort identity,
  aging/method/allocation totals, filtered finance inclusion, signed stock kinds, title/loan separation,
  alumni registration versus participation, and vehicle capacity versus route requirements.
- Focused original browser reruns completed:
  Cross-module **49/49**, Examination **56/56**, CMS **88/88**, Reports **122/122**.
- New recovery script completed **29/29 assertions across four complete scenario workflows**:
  stock receipt/source/report navigation, dialog keyboard/focus, public CMS navigation, reload reset.
- Final remaining regression suites completed: Workforce **76/76**, Learning **78/78**,
  Inventory/Transport **89/89**, Certificates/Alumni **109/109**.
- Final browser total: **667/667 assertions across eight completed existing suite workflows**,
  plus **29/29 across four completed new recovery scenarios** = **696** assertions.
  No runtime exceptions were reported in these final completed runs. Earlier failed development
  runs are preserved above and are not counted as completed workflows.

No original assertion was deleted or weakened. Readiness timeouts fail rather than bypass a step.
The final tests do not invent a download, persistence, grade rule, stock movement or public record.

### Cross-module consistency evidence

- Cross-module browser pipeline covers enquiry/admission, Student 360, registry, receipt allocation,
  Student 360 fees, source finance/Pulse totals, attendance/Pulse changes and topic completion.
- Examination pipeline covers schedule/conflict, admit card, reviewed/published marks, marksheet,
  online responses, submission, explicit evaluation and a shared draft result.
- New recovery pipeline confirms opening stock **50 → 55** after receipt; the Inventory report
  and source register retain it across navigation. Reload discards the receipt and restores **50**.
- Finance model tests reconcile due cohorts, all allocations, payment methods and aging buckets.
- Library and Transport source models remain authoritative; no copies become titles and no route
  requirement becomes a passenger count. Alumni RSVP counts do not include registry statuses.
- CMS browser coverage confirms draft isolation and public footer navigation from shared menu data.

### Responsive and accessibility findings

All sixteen Reports routes were checked at **390, 430, 768, 1024, 1280, 1440, 1600px** in the
completed Reports suite. CMS route/editor responsive checks passed in its suite. The new recovery
script additionally opens the mobile preview menu, selects a destination, checks closure and
verifies page containment at every width.

Practical browser checks passed dialog focus entry, reverse Tab containment, Escape close and
focus restoration after a real pointer-opened dialog. CMS Escape restores its trigger focus.
Native table headers, associated filter labels and named chart meters were checked.

**Not claimed:** exhaustive keyboard-only coverage of every workflow, full screen-reader review,
independent contrast measurement, all nested menu combinations, every error association, or a
complete historical enrollment integrity audit.

### Remaining gaps and acceptance decision

The four original browser suites are now completing, but that alone does not close the entire
comprehensive Sprint 12 acceptance checklist:

- REC-02's exact historical intermittent trigger was not reproduced; unsafe test assumptions were
  corrected and the full workflow passes, but no nonexistent examination product defect is claimed fixed.
- Pass/fail policy and missing-mark denominators remain unavailable/incomplete; the source does
  not store an explicit school pass/fail rule.
- Date-filtered undated stock/catalog snapshots need a clearer distinct snapshot panel rather than
  implying those are period balances. Existing source notes disclose this; broader period accounting
  remains incomplete.
- Exact record-level source deep links, in-place saved-filter overwrites, historical teacher/session
  ownership and the full analytical catalog from Sprint 12 remain incomplete.
- Comprehensive accessibility and screen-reader/contrast gates remain open.

**Final Sprint 12 acceptance status: NOT ACCEPTED.**

Recovery work has resolved the reproducible test synchronization failures and improved source
reconciliation and keyboard navigation, but required analytical/accessibility gates still need work.
This is not a production-ready system or a fabricated clean acceptance report.

### Production boundaries retained

All shared records, saved reports and audit simulations remain in memory and reset on reload.
No backend, durable audit, real authorization, scheduled delivery, background generation, warehouse,
Hostel operations, public registration, production telemetry or real export storage was added.
No Sprint 13, System Settings rewrite, new navigation hierarchy or unrelated module was started.

---

## Sprint 12B — Analytics Completeness & Accessibility Closure — 2026-11-22 UTC

This is a dated continuation. The original Sprint 12 and 12A failures, recovery evidence and acceptance
decisions above remain historical records. The detailed 23-item matrix is in
[`SPRINT-12B-ACCEPTANCE-TRACKER.md`](SPRINT-12B-ACCEPTANCE-TRACKER.md).

### Implemented analytics

The existing `Reports / Examinations` route now includes Overview, Missing marks, Pass / fail,
Subjects and Classes tabs. The pure `examAnalytics.ts` selector derives eligibility from shared
students, session enrollment, groups and required examination components. It does not create scores.

- Eligible = distinct active students matching required exam class/section/session scope.
- Assessed = eligible students with at least one complete, valid component.
- Complete = every required selected component valid.
- Incomplete = eligible minus complete; partial is separately disclosed.
- Missing marks = required student/component pairs with no entered value for the chosen result context.
- Invalid = nonfinite/out-of-range marks or duplicate score keys; invalid does not become zero.
- Explicit zero remains a valid score.
- Mean/high/low use valid component percentages. Published values use stored percentages.
- Pass/fail remains explicitly unavailable because no school pass-label rule is configured.
  The UI shows complete/incomplete populations and classifiable denominator zero. It never assumes
  50%, a grade letter, or that a missing student failed.

The context panel identifies current enrollment scope, selected group/subject/result context,
exam-group-end-date period and current scale version. Published inspector records show stored grade,
scale and publication timestamp where present. New publications capture timestamp and a copy of the
grading bands. Older records may lack these fields; prior published revision archives do not exist.
No immutable historical ledger is claimed.

### Traceability / exact records

Operational report KPI actions now open calculation/contributor drawers retaining the active filters.
They disclose formula, included/excluded rows and numeric calculation components. Specialized source
formulas cover attendance/topic rates, published averages, expected/missing submissions, available
copies, net general income, counts and exact outstanding balances from ledger allocations.

Report row inspectors resolve current source IDs from shared providers for Finance payments/fees,
attendance/related leave, inventory items/movements, library books/loans/members, transport records
and alumni/participation. The exact assessment inspector opens the selected exam context using
ExaminationContext's existing selection. Generic source-module navigation remains available.

No duplicated financial ledger or report-only identity registry was introduced. JSON source detail
is escaped text; alumni contact fields are not exposed by the new source resolver.

### Accessibility changes and findings

- Shared fields now associate hints/errors with `aria-describedby` and set `aria-invalid` when invalid.
- Shared assessment tables have captions, column scopes and named keyboard-scroll regions.
- KPI and row actions have descriptive accessible names.
- Existing dialog focus handling also recognizes links and native summary controls.
- Reports add a document title, live pagination status, scoped visible focus outlines and a
  higher-contrast primary action surface without changing global school branding.
- Charts retain direct text/count labels and named meter equivalents.
- AX-tree checks verified named exam-group and result-context controls.
- Sampled primary action text contrast measured **6.8078:1** in the browser.

This is **not** a claim of a complete human screen-reader review or exhaustive keyboard-only and
all-color-pair contrast audit. Those broader required gates remain open.

### Executed evidence

- New `test:analytics-closure`: **21/21** pure-model checks passed.
- Existing nine model/route suites: **282/282** passed.
- Combined model/route result: **303/303**.
- `pnpm exec tsc --noEmit` and `pnpm build`: passed.
- New browser suite initial completed run: **47/47** assertions, no runtime exceptions.
  Includes missing → exact marks context → draft zero → complete assessment; five tabs × seven
  widths; AX-tree control names; exact obligation contributors; error association; sampled contrast.
- The first development attempt failed because its assertion searched for lowercase “missing”
  while the actual KPI label was “Missing Marks”. The test was corrected to assert the real KPI label;
  no application behavior or intended population assertion was bypassed.
- Final completed suite outcomes: Cross-module **49**, Workforce **76**, Examination **56**,
  Learning **78**, Inventory/Transport **89**, Certificates/Alumni **109**, CMS **88**,
  Reports **122**, Recovery **29**, Analytics Closure **47** = **743 passing assertions**
  across ten completed suite runs. No runtime exceptions were reported in these completed runs.
- The first full regression batch stopped the Examination workflow at its immediate published-table
  lookup (other suites continued). Its original Published/85% assertion was retained, with a bounded
  readiness wait for the result table added before it. The Examination rerun then completed **56/56**.
  The failed partial run is not counted as a completed workflow or added to the assertion total.

### Known gaps / final decision

The detailed tracker distinguishes implemented, tested and fully passed requirements. The source
still lacks an explicit school pass/fail rule, immutable historical enrollment/schema revisions and
exemption rules; these are disclosed rather than fabricated. Missing-mark examiner filtering,
all specialized score distributions, exact Student 360 context dispatch, every-module source
navigation, and independent reconciliation of every KPI combination are not fully verified.

Full keyboard-only, screen-reader and contrast-inventory acceptance is incomplete. No user-approved
waiver exists for those required gates. **Final Sprint 12 acceptance: NOT ACCEPTED.**

All data remains in memory, exports remain simulations, and frontend role visibility is not server
authorization. No new settings module, backend, persistent storage, production audit or Sprint 13
was started.

---

## Sprint 12C — Final Acceptance, Accessibility & Evidence Closure — 2026-11-22 UTC

This section records new Sprint 12C work. The 12B baseline counts above are not relabelled as
12C evidence. Full requirement statuses and procedures are in
[`SPRINT-12C-ACCEPTANCE-TRACKER.md`](SPRINT-12C-ACCEPTANCE-TRACKER.md).

### Implementation

- Added `reportReference.ts`, independent of the presentation calculation/contributor helpers.
  Finance references loop through raw shared obligations, discounts, receipts, allocations and
  entries. Non-financial references are explicitly labelled source-row arithmetic checks rather
  than exhaustive independent validation of every underlying join.
- Added administrator-preview Developer reconciliation within KPI drawers: expected, displayed,
  difference, units, formula, inclusion/exclusion IDs/reasons and active filters. Unknown references
  and duplicate ledger IDs do not receive a false PASS.
- Added shared in-memory return context for source navigation: session, query, reporting period,
  columns and sort. Added an exact shared-ID Student 360 action and retained examination source
  context when returning. No new module or navigation hierarchy was introduced.
- Extended exact source inspectors for students, examination scores, staff and homework.
- Added polite report-loaded/result-count/filter announcements.
- Replaced misleading zero snapshot values with explicit unavailable states when a dated Inventory
  or Library slice excludes undated current/catalog snapshots.
- Scoped contrast remediations to Reports: readable secondary text, darker meaningful control
  borders and full-opacity explanatory text. Global school branding and other modules were not
  redesigned.

### Reconciliation evidence by module

| Module              | New reference evidence                                                                                                             | Remaining gap                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Student Information | Exact Student 360 ID and filter-preserving return exercised                                                                        | No exhaustive independent population/status/demographic reference audit             |
| Finance             | Six raw-ledger totals; discount/allocation/unallocated distinctions; duplicate-ID block; boundaries and combined exclusion reasons | Full independent aging/class/group/filter matrix incomplete                         |
| Attendance          | Empty and duplicate observation references; transparent marked-only denominator                                                    | Raw historical roster/leave reconciliation incomplete                               |
| Examinations        | Existing population/snapshot model suite rerun; missing pair opens exact exam context via keyboard                                 | Pass/fail has no school rule; historical schema/roster completeness remains limited |
| HR                  | Existing Workforce suite rerun                                                                                                     | No new exhaustive independent payroll/headcount/leave audit                         |
| Learning            | Reference implementations for assignment/submission and topic calculations                                                         | Not every raw assignment/topic join independently verified                          |
| Library             | Separate title, physical-copy and available-copy reference checks                                                                  | Complete raw copy/loan/status audit and dates remain limited                        |
| Inventory           | Signed issue and low-stock reference selection checks                                                                              | Full independent store/movement/valuation audit incomplete                          |
| Transport / Alumni  | Unsupported utilization stays unavailable; existing suites rerun                                                                   | No new exhaustive raw allocation/RSVP reference audit                               |
| Hostel              | Readiness-only report retained                                                                                                     | No source module or fabricated occupancy data                                       |

No reporting-only operational dataset was introduced. The independent test fixture is test data,
not a seeded institutional record. Reversals/voided receipts are not present in the source ledger
model; support for those statuses is not invented.

### New verification

- `pnpm test:acceptance-reference`: **21/21** new cases passed.
- Existing ten model/route suites were re-executed: **303/303**.
- Current-turn combined model/route result: **324/324**.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed after the source changes.
- `node tests/acceptance-keyboard-browser-qa.mjs`: **25/25** assertions, **four representative
  keyboard-only journeys**, **four source-navigation scenarios** completed; no runtime exceptions.
- The executed keyboard body uses native Tab, Enter, arrow keys, Escape and typed input. It uses
  no pointer events, DOM clicks, value setters or programmatic focus placement.
- Covered Student Information → exact Student 360 → report return, Finance and Attendance exact
  inspectors, and missing examination component → exact exam context → report return.
- Development test failures are preserved in the tracker: incomplete native key encoding, an
  invalid expectation of a saved score for a missing pair, and an invalid non-empty export
  expectation when the score dataset was correctly empty. No pre-existing assertion was weakened.

### Contrast and assistive-technology evidence

New machine-readable inventory:
[`evidence/12c-contrast-inventory.json`](evidence/12c-contrast-inventory.json).

At 1440 × 1000 on Linux / Chrome **156.0.8078.47**, the visible default-state text inventory
covered all **16 report routes** and **1,681 samples**. The initial run found **1,047 failures**
and **16 uncertain compositing cases**. Reports-scoped remediation was followed by a fresh
keyboard/inventory run: **1,656 PASS**, **25 disabled-control exemptions**, **0 failures** and
**0 uncertain samples**.

These are repeated visible text samples, not unique component designs. Non-default, hover/focus,
error/dialog/tooltip, graphical-object and full meaningful-UI contrast states are **not** all
measured. The prior 6.81:1 button result remains only a prior sample.

**Human screen-reader validation: BLOCKED.** No Orca/speech-dispatcher installation was found,
and no human screen-reader session is available through the supplied tools. No reader version,
spoken announcement or human pass result is fabricated. Automated DOM/AX evidence does not
substitute for this gate.

Responsive regressions at the established seven widths are rerun separately below; the four new
keyboard journeys were performed at 1440px, not falsely reported as seven-width keyboard coverage.

### Remaining gates / final decision

Exhaustive independent source reconciliation, every-record navigation, all keyboard variants,
human screen-reader validation and all-state contrast inventory remain incomplete or blocked.
The tracker uses PASS / FAIL / BLOCKED / NOT TESTED instead of silently downgrading required gates.

**Formal Sprint 12 decision: NOT ACCEPTED.**

No Sprint 13, new settings, Hostel operations, backend, persistence, real exports, production
authorization or external telemetry was added. Source records and saved return context remain
browser-memory prototype state.

### Sprint 12C final executed regression evidence

All ten pre-existing browser suites were rerun in this turn and completed:
Cross-module **49**, Workforce **76**, Examination **56**, Learning **78**, Inventory/Transport
**89**, Certificates/Alumni **109**, CMS **88**, Reports **122**, Recovery **29**, Analytics
Closure **47** = **743**. This is new execution evidence, not a recycled baseline result.

The new keyboard/inventory suite passed **25/25** assertions across four representative
keyboard-only journeys and four source-navigation scenarios. The new QA-inspector suite passed
**4/4**: independent expected/displayed outstanding agreed at **204,000.00** with zero difference,
inclusion/exclusion details were present, and the developer panel was hidden under Auditor preview.

**Current-turn browser total: 772 passing assertions across 12 completed suite runs.**
No runtime exceptions were reported in those completed runs. Partial failed development attempts
are documented in the tracker and excluded from complete workflow totals.

All eleven model/route suites passed **324/324**; TypeScript and production build passed.
The existing responsive suites again exercised all seven established widths; this does not imply
the new keyboard-only or contrast procedures were repeated at all seven widths.

**The formal decision remains NOT ACCEPTED** for the unresolved critical source-audit,
comprehensive keyboard, human screen-reader and full all-state contrast gates listed above.
