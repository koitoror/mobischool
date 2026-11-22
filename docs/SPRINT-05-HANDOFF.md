# SchoolOS — Sprint 05 handoff

## 1. Status and scope
Implemented in the existing Operations shell, not a replacement application. All data mutations are in-memory simulations and reset on reload. This is not a declaration that all Operations modules or all requested refinements are production-complete. Sprint 06 has not been started and should await review of this handoff and the remaining limitations.

**Finance discrepancy:** the latest brief calls Sprint 03 “designed but not implemented,” while the actual repository contains `Finance.tsx`, `FinanceContext.tsx`, `financeModel.ts`, and 37 passing finance checks. The existing finance prototype was preserved and regression-tested rather than removed or described as live accounting. Its acceptance status should be reconciled with the product owner; real financial processing remains unimplemented.

## 2. Primary frame / route inventory
| Frame | Exact route |
| --- | --- |
| HR-01 | Human Resource |
| HR-02 | Staff Directory |
| HR-03 | Staff Attendance |
| HR-04 | Payroll |
| HR-05 | Approve Leave Request |
| HR-06 | Apply Leave |
| HR-07 | Leave Type |
| HR-08 | Teachers Rating |
| HR-09 | Department |
| HR-10 | Designation |
| HR-11 | Disabled Staff |
| CM-01 | Communicate |
| CM-02 | Notice Board |
| CM-03 | Send Email |
| CM-04 | Send SMS |
| CM-05 | Email / SMS Log |

All 14 original submenus remain individually accessible under Operations. Overview KPIs, profiles, receipt-like payslip previews, review drawers and histories are additional states, not replacement routes.

## 3. Implemented interactions and workflow map
- **Onboarding:** imported staff registry → add/edit form → department/designation validation → shared staff profile. Search, sort, department/designation/employment filters, pagination, columns, selected CSV export and guarded disable/reactivate are provided. Missing imported contacts remain missing, not generated.
- **Attendance:** date/department roster → explicit marks or bulk present → review counts → save → per-date history. Manual times/notes are separate from device integrations. Approved leave has precedence over ordinary absence, and Pulse uses the same source.
- **Leave:** draft or submitted application → overlap validation → approval queue → reason → typed confirmation → decision history. Own-request approval is blocked. Pending/draft requests can be withdrawn. Mon–Fri working days are explicitly an estimate; holidays and balances are unconfigured.
- **Payroll:** staff/profile → period → configure manually entered components → select eligible staff → transparent gross / deductions / net review → type PAYROLL → finalized simulation → batch history → payslip. Missing salary, inactive staff and already finalized period/staff rows are excluded. No Paid or bank-transfer claim is made. Payroll never posts to the fees or expense ledger.
- **Evaluation:** configurable criteria/scale → teacher/evaluator → scores/comments/strengths/development → draft/submitted/reviewed record and history. All entered scores are labeled illustrative, never imported or asserted to be actual performance.
- **Reference data:** department, designation and leave-type create/edit/status/usage views. Renaming references with dependent staff/leave records is blocked instead of rewriting history. There is no destructive reference deletion.
- **Notices:** create draft → explicit selected audience → date validation → preview → publication/schedule simulation → history → archive. Audience targets and local attachment filenames are retained.
- **Email/SMS:** choose audience or explicit manual contacts → validate → deduplicate → preview → explicit simulated send → Queued (simulation) log → details/cancel. Missing imported contact details block recipient validation instead of being guessed. Provider references, delivered counts, costs and delivery rates are unavailable.

## 4. Shared state, components and provenance
- `WorkforceContext` extends the existing 44 CSV staff identities (same IDs, names, roles, departments and designations). No phone/email/username, salary, joining date or personal facts were inferred from names. Active status is explicitly a preview assumption. New details entered in forms remain unverified preview input.
- Academic teacher selectors now derive active teachers from this shared state; disabling staff retains historical timetable/academic references.
- School Pulse: active staff is active registry count; presence counts Present + Late; absence counts Absent after approved-leave precedence; pending leave counts Submitted + Under Review; payroll counts finalized simulations; communication indicators count local queued/failed records, not provider delivery.
- Reuses `Button`, `Badge`, `Card`, `Field`, existing icon paths, operational table/toolbar/pagination/drawer styles and shell tokens. New focused patterns: audience/recipient picker, payroll components/batch/payslip, decision history, attendance review, notice and message previews, role preview controls.
- `useDialogFocus` supplies focus entry/return, Tab containment and Escape handling for new HR/communication drawers. Native buttons, labels, required fields, table headers, named controls and visible focus styles are retained.
- School currency is shared with the existing finance provider. Existing currency is preserved; KES is available under preview controls as an illustrative denomination, not an FX conversion. No statutory rates are hardcoded.

## 5. Verification
Commands:
- `pnpm exec tsc --noEmit`
- `pnpm test:workforce` — model safeguards plus all 16 routes server-rendered.
- `pnpm test:academic` — existing 29 checks.
- `pnpm test:finance` — existing 37 checks.
- `pnpm build`
- `node tests/workforce-browser-qa.mjs` and `node tests/browser-qa.mjs` — agent-owned Chromium CDP session (default localhost:9222) against the supervised preview (localhost:3000). No second dev server is started. Scripts support `CDP_URL` / `PREVIEW_URL`.

Live coverage includes onboarding, shared profile, attendance, leave decision/history and approved-leave precedence, payroll confirmation/calculations/payslip, email duplicate handling, SMS segment estimates/logging, explicit notice audience/publication, Escape closure, payroll restricted state, and runtime exceptions. Eight major screens (directory, attendance, payroll, leave form, email, SMS, notices and log) are checked at 390, 430, 768, 1024, 1280, 1440 and 1600px for page overflow and form clipping. This is not a visual or full assistive-technology audit of every route/state.

The earlier cross-module regression script covers enquiry→admission→Student 360, registry columns, visitor and complaint statuses, guarded archive cancellation, fee payment cancel/confirm/receipt, shared fees, receipt batch eligibility, academic attendance/syllabus/clashes, Pulse updates and reset-on-reload. Its imported staff assertion was updated for the expanded registry's unchanged 44 CSV identities. The initial payroll browser assertion was corrected to account for the profile-context staff row already being selected; no application change was required for that assertion.

Executed results: **27 workforce + 29 academic + 37 finance checks passed (93 total)**; **76 Sprint 05 live Chromium checks passed**; **47 earlier cross-module browser checks passed**. TypeScript and the production build passed. No runtime exceptions were observed in those browser flows. Self-approval was explicitly exercised and blocked. These counts include route-render and breakpoint assertions, not 123 independent full end-to-end workflows.

## 6. Accessibility review findings
Implemented: native labeled controls, focus-visible styling, dialog role/name, focus entry/return, keyboard Tab wrapping and Escape close, text status labels rather than color alone, intentional table scroll surfaces. Browser-verified: Escape closure and role-dependent payroll restriction. Pending: full keyboard traversal/focus-return test matrix, screen reader audit, contrast measurement, error announcement review across all drawer variants, zoom/high-contrast and touch-device tests. `window.confirm` is still used for some navigation/cancellation safeguards.

## 7. Known gaps and acceptance limits
- Email/notice body editors are plain text; a real rich-text editor and template library are not implemented. Staff role groups/class/department audiences exist, but a custom-group authoring UI remains pending.
- Photo and attachment inputs retain local filenames only; no image processing, persistent uploads, antivirus scan or document delivery exists.
- Scheduled messages/notices record intended times but no background scheduler runs. No provider statuses, delivery receipts or engagement metrics are synthesized.
- Detailed employment history and disabled date/reason are available through profile audit entries; the disabled registry currently reuses the main registry column layout rather than dedicated date/by/reason columns.
- Leave allocations/carry-forward/paid flags are configurable descriptions, not statutory or entitlement enforcement. Clarification requests preserve history; a complete applicant resubmission amendment workflow remains a follow-up.
- Evaluation historical criteria-versioning and departmental evaluator scope require further design; no scores should be used for real HR decisions. Evaluation average is illustrative and should not compare mixed scales as a production metric.
- Role/actor selection is a UI demonstration. No server-side authorization, tenancy isolation, authenticated actor, immutable audit log, secure salary storage or real departmental row-level security exists.
- Payroll multi-actor approvals, statutory deductions, salary versioning, bank transfers, tax reporting, real paid statuses, reversals and financial reconciliation are not implemented. No sample salary is silently attached to imported staff.
- Browser coverage is targeted; duplicate IDs, malformed contacts, leave overlap and calculation rules also have code/model safeguards, but every combination is not yet browser-certified.

## 8. Backend requirements and next review
Agree staff/tenant ownership, identity and permission model; authoritative attendance and leave policy; payroll calculation/approval/locking and statutory jurisdiction; audit/retention/recovery; attachment storage; sender identities, email/SMS providers, delivery callbacks and scheduling. Use server-side enforcement and idempotency before live actions.

Next recommendation: review Sprint 05, close the listed UI/QA gaps and reconcile the finance acceptance discrepancy first. Define the next scope with the product owner afterward; no Sprint 06 implementation has begun.
