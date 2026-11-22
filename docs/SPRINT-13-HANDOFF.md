# Sprint 13 — System Settings & Configuration Control Center

Date: 2026-11-22 UTC.

## Delivery and decision

Implemented a frontend configuration workspace with 19 views and guarded workflows. **Sprint 13
is NOT ACCEPTED against the full comprehensive brief**: several settings remain metadata previews
rather than fully propagated policy engines. The exact boundary is below and in
`SPRINT-13-ACCEPTANCE-TRACKER.md`.

Sprint 12C acceptance remains unresolved and its historical handoff was not rewritten. Only direct
grading/reporting dependencies were changed. Sprint 14 was not started.

## Routes and original submenu preservation

All use the existing Configuration layer and page-state routing:

### System Settings

1. System Settings Overview
2. **Payment Methods**
3. **Print Header Footer**
4. **Backup Restore**
5. **Users**
6. **Custom Fields**
7. **System Fields**
8. **Student Profile Update**
9. **Online Admission**

### School Configuration

10. School Identity
11. Academic Sessions
12. Academic Structure
13. Curriculum & Subjects
14. Grading & Assessment
15. Attendance Configuration
16. Finance Configuration
17. Communication Defaults
18. Module Configuration
19. Configuration Audit History

The eight bold labels are preserved verbatim. Existing Branding Editor, Permissions Matrix and
legacy configuration entry points remain reachable; the shell and three architectural layers remain.

## Shared ownership and dependencies

`SettingsProvider` composes the existing Academic, Finance, Examination and Workforce providers.
It receives the live App school/session/student values and their update callbacks. It does not
create a second student registry or financial ledger.

| Configuration   | Actual propagation                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | Shared App name/logo/motto update the shell and existing dependent previews. Supplemental institutional metadata stays in Settings.                                                                              |
| Sessions        | Shared header session choices and selected session. Existing historical records retain their session values; no new ledger/exam seed is manufactured on activation.                                              |
| Structure       | Existing Academic classes, sections and subjects. Rename/deactivation checks inspect student current/historical enrollment, timetable and relevant exam references. This is not yet a complete dependency graph. |
| Payment Methods | FinanceContext method definitions drive Finance UI method choices and `postPayment` allowed-method validation. No provider is connected.                                                                         |
| Currency        | Existing FinanceContext currency/display precision. Stored minor-unit amounts are unchanged; no conversion or per-transaction currency migration.                                                                |
| Grading         | Existing bands/scale plus explicit passing-grade labels and scheme name. New publications snapshot rule, scheme, bands and version. Reports use captured rules for published results.                            |
| Profile updates | Explicitly approved email/phone requests update App's shared student records. Registry reflects them; Student 360 resolves its current shared row rather than a stale selected copy.                             |
| Admission       | Published form configuration, validation and in-memory application metadata. It never auto-creates a student. Existing Student Admission workspace is linked for manual review.                                  |
| Other policies  | Clearly labelled metadata/proposals; see limits below.                                                                                                                                                           |

### Important existing identity limitation

Front CMS currently scopes its preview state by school name. Renaming the school selects the
new name-scoped CMS preview; old CMS state remains under its previous name. The impact preview
warns about this. Stable tenant identity migration was not introduced in this sprint.

## Safety and model rules

`settingsModel.ts` contains route definitions and validators for identity, sessions, duplicates,
user administration, custom fields and module dependencies.

- Identity requires name/code/country, valid email when provided, IANA timezone, currency code and
  a safe logo reference. The existing Branding Editor handles local image previews under 2 MB.
- Session dates must be valid and ordered; terms must stay within the session and cannot overlap.
  Historical/published session names/dates are locked; duplicate into a Draft instead.
- Activation closes the prior active status and selects the new default, with explicit impact
  confirmation. It does not rewrite student, attendance, examination or finance associations.
- Referenced class/section/subject destructive changes are blocked in the inspected scopes.
- Methods used in existing payment/income/expense records cannot be renamed/deactivated.
  The current ledger's mandatory reference requirement cannot be disabled.
- User role/status changes protect the final active administrator. These are account/role previews,
  not authentication or server authorization.
- Custom field keys are unique and cannot collide with protected system keys. Existing key/type/
  entity changes are blocked; archiving does not delete values.
- Grading uses the existing band validator. Publication requires explicit valid passing labels;
  the supported unweighted component must be 100%. No universal pass threshold is inferred.
- Profile requests require existing student references and explicit approve/reject decisions.
- Admission publication requires a valid window and shared class references. Submission uses the
  labelled prototype clock, 2025-02-24; the published class scope/window and duplicate applicant/
  guardian pair are checked.
- Every confirmed Settings mutation uses the reasoned audit path with actor/timestamp/category/
  record/after state. Before-state detail is limited for some shared-provider edits.

## Configuration change workflow

Editors offer Save draft, Validate & preview impact, and explicit Confirm configuration change.
Drafts can be resumed from their originating configuration page and disappear on reload. Published
changes clear that page's draft. Closing dirty forms requires discard confirmation.

The health dashboard derives eight readiness checks from current values; it does not display a
fabricated “all systems operational” score. Historical timestamps are shown only for recorded
local changes. Configuration audit entries have read-only inspection and search.

## Backup and restore boundary

Backup creates a browser-memory snapshot of **generic Settings metadata only**: print, admission,
communication and policy-proposal records. It excludes identity, accounts, grading, sessions,
student records, transactions, media bytes and other operations.

Restore requires inspection, an explanatory reason, the exact phrase `RESTORE SIMULATION`,
impact review and final confirmation. It replaces only that limited metadata object. No external
backup is verified; no operational data is recovered; reload discards snapshots and restore history.

## Verification

- `pnpm test:settings`: **38/38** (19 validation checks + 19 SSR routes).
- Existing model/route suites rerun: **324/324**.
- Combined model/route total: **362/362**.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed after final source edits.
- Initial Settings browser suite: **144/144**, including **19 × 7 = 133** route/width checks.
- Expanded integration rerun: **13/13**, including captured-rule preservation, approved profile
  propagation, duplicate admission blocking, new payment-method selection and four keyboard/draft
  checks. Dialog focus, reverse Tab, native Enter save, Escape close and draft resumption were
  exercised; an unconfirmed identity draft did not change the published school name.
- Full final browser results and any remaining rerun outcomes are recorded in the acceptance tracker.
  Earlier baseline counts are not substituted for new execution.

One integration development run failed its payment-method assertion on Fees Overview. Read-only
inspection confirmed that view does not contain a method selector. The unchanged method-presence
assertion was exercised on Search Fees Payment, the actual method-filter workflow, and passed.

## Accessibility and responsive behavior

Uses existing labelled Fields, native buttons, table captions/headers, alert/status messages and
focus-managed AssessmentDialog. The sidebar remains in the existing Configuration layer.
Responsive stacking and controlled table scrolling were tested at 390, 430, 768, 1024, 1280,
1440 and 1600px.

This is not a human screen-reader certification or a full all-state contrast audit. New Settings
keyboard/draft scenarios are documented separately from the pre-existing Reports keyboard suite.

## Remaining acceptance gaps

- Attendance, communication, financial approval/numbering/tax/refund and module-availability records
  are proposals/metadata, not fully enforced source-engine policies.
- Module disabling is a dependency-checked recommendation. It does not hide routes or enforce
  subscriptions/entitlements. No existing route is silently broken.
- Some legacy shell indicators are not driven by session-status metadata. Closing a session
  can leave the old shell's static “session active” wording inconsistent with the Settings registry.
- Reference ordering is a simple shared-list operation, not a versioned structure-change workflow;
  some combined-list move-control states and audit detail still need refinement.
- Custom field definitions and previews do not yet migrate/render every relevant entity form.
- Print Header Footer has a live preview but is not fully wired into all receipt, exam and
  certificate document profiles. Existing published document snapshots are not restyled silently.
- Curriculum & Subjects is the shared subject catalog, not a full multi-curriculum manager.
  Academic levels, houses, progression and complete subject/class/teacher coverage need more work.
- Grading supports explicit label rules and captured publication context. Subject-specific rules,
  points, alternative weight aggregation and complete published grading-config revision history
  are not implemented. Some subject/class report tables still show unavailable classification.
- User roles have preview descriptions rather than a fully propagated permission-assignment model.
- Student update policies currently allow email/phone only; document uploads and external guardian
  requests are metadata simulations.
- Admission records are not automatically transferred into the Front Office enquiry/application
  registries; the source workspace is linked for manual review. No student is created by simulation.
- Generic configuration audit search is implemented, but full actor/category/date filter controls,
  rollback and all safe before-values remain incomplete.
- Some legacy configuration actions, including Branding Editor, predate the new audit path.
- Shared empty-table wording is inherited from AssessmentUI and is not yet configuration-specific.
- Scope-specific logo fields use a URL/data preview; file selection is through the preserved
  Branding Editor. No new persistent media storage exists.

## Production dependencies

Durable school/tenant IDs, authenticated administrators, server-side permissions and validation,
transactional configuration versions, effective-date policy execution, stable source identifiers,
audit retention, migration tools, media storage, secure admission/update submission and genuine
backup/verification/restore infrastructure are all still required for production.

## Final executed browser evidence

Completed Settings suites: **144/144** route/workflow/responsive assertions and **13/13**
integration/keyboard/draft assertions.

Re-executed earlier suites completed: Cross-module **49**, Workforce **76**, Examination **56**,
Learning **78**, Inventory/Transport **89**, Certificates/Alumni **109**, CMS **88**, Reports
**122**, Recovery **29**, Analytics Closure **47**, Acceptance Keyboard **25**, and QA Inspector
**4** = **772**. With the new Settings suites, **929** assertions completed across 14 suite runs.
No runtime exceptions were reported in those completed runs.

The first broad batch did not pass: Examination timed out locating “Start exam preview” and
Reports timed out locating its workspace selector. These partial failed workflows are not counted
as complete passes. Unchanged reruns against the final stable source subsequently completed
56/56 and 122/122. Source files had been changing during the initial batch, so hot reload is a
possible contributor, not a proven root cause. No previous assertion was removed or weakened.

The legacy keyboard regression regenerates its machine-readable Reports contrast artifact as part
of its existing behavior. This rerun is regression evidence only; it does not reopen or accept
Sprint 12C, certify human assistive-technology use, or turn a default-state text inventory into an
all-state accessibility audit.
