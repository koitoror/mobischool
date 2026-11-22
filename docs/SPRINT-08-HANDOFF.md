# Sprint 08 — Homework, Download Center & Library

## Status

Sprint 08 adds ten interactive route views to the existing shell. Core assignment, resource sharing,
membership and circulation journeys work in browser memory. This is a prototype milestone for
review, **not completion of every requested acceptance criterion or production functionality**.
Sprint 09 has not started. Earlier sprint records and the Sprint 07 carry-forward backlog remain
unchanged.

## Route inventory and original submenu coverage

| Frame  | Module / original destination | Implementation                                                           |
| ------ | ----------------------------- | ------------------------------------------------------------------------ |
| HW-01  | Homework                      | Homework Overview: record-backed counts and assignment register          |
| HW-02  | Add Homework                  | Draft/edit/duplicate, publication, submission and teacher review drawers |
| DC-01  | Download Center               | Download Center Overview: resource/shared/draft counts and registry      |
| DC-02  | Upload/Share Content          | Resource metadata editor, scope preview and confirmation                 |
| DC-03  | Content Share List            | Search/filter/sort/paginate, detail columns, selection and archive       |
| LIB-01 | Library                       | Library Overview: inventory, membership and circulation indicators       |
| LIB-02 | Book List                     | Catalog create/edit, inventory adjustment preview and guarded archive    |
| LIB-03 | Issue - Return                | Issue, return, renewal, receipt/history and exception handling           |
| LIB-04 | Add Student                   | Existing Student Information lookup and membership registration          |
| LIB-05 | Add Staff Member              | Existing HR lookup and membership registration                           |

All seven original submenu strings are preserved. Module headings open the three overview views.
No shell redesign or replacement data registry was introduced.

## Shared models and architecture

`LearningContext` owns assignments, submissions, resources and a transactional library state.
It consumes the existing Academic and Workforce providers and App's session-selected students.

- Assignment: session, class/section, shared subject and teacher, instructions, date/due time,
  submission method, optional maximum marks, linked resource ID, late/resubmission rules and history.
- Submission: assignment/student IDs, response or filename text, timestamp, review, marks and history.
- Resource: session, subject/class/section scope, publication state, filename/size metadata,
  uploader attribution and history.
- Book: catalog metadata, copy count, unavailable count, active/archive state and inventory history.
- Member: membership ID, student/staff kind and existing identity ID; no duplicate identity fields.
- Loan: book/member IDs, issue/due/return dates, condition, renewals and activity history.
- Policy: illustrative loan days, renewal limit, active-loan limit, minor-unit daily fine preview and
  upload size limit.

Library writes validate synchronously against the latest shared state before React is updated.
Failed operations leave the old state intact and return a visible validation message.

## Implemented workflows

### Homework

Create draft → edit → review publication → explicit confirm → shared recipient lookup →
simulate submission → teacher marks/feedback → Reviewed.

Recipients are active students in the selected class/section. Required fields/date order and optional
maximum marks are validated. Published assignments are locked against direct editing; duplication
creates a draft. Blank marks are not zero. Late submissions are labeled or blocked per assignment.
Resubmission is explicitly allowed or denied, and a permitted replacement retains prior history.
No real submission or notification is claimed.

### Resources

Enter filename/size metadata → validate extension/size/scope → preview sharing → confirm Draft or
Published → registry → preview/edit scope → optional bulk archive with reason.

Supported extensions are PDF, DOC/DOCX, PPT/PPTX, PNG/JPG, MP3, MP4 and TXT. Sharing supports
Entire school, Selected class, Selected section, Staff only and Students only. Registry search,
class/status filters, ascending/descending sort, ten-row pagination, grouped detail-column visibility
and bulk selection are interactive. Archive retains the resource ID/history rather than deleting it.
Copy-link and download controls explicitly explain that no real URL/file exists.

### Library

Add catalog title → confirm copy inventory → select existing student/staff → review registration →
create membership → select book/member → review issue/date fields → confirm issue → receipt/history →
renew or review condition/date → confirm return.

Availability = total copies − active loans − unavailable lost/damaged copies.

- Zero availability and inactive/unregistered borrowers are blocked.
- Duplicate memberships are blocked.
- Removing issued/unavailable copies is blocked.
- Archiving books with open loans is blocked.
- Duplicate ISBNs are blocked.
- Return dates before issue and duplicate returns are blocked.
- Lost/damaged returns close the loan but keep that copy unavailable.
- Renewals obey the configured count limit and require a later due date and reason.
- Fine preview uses configured minor units/day; no Finance obligation or payment is posted.

## Cross-module integration

- Academic selectors use existing sessions, classes, sections, subjects and active shared teachers.
- Resource attribution uses existing active HR staff.
- Borrower lookup references the same Student Registry and HR records used elsewhere.
- Student 360 retains its earlier tabs and gains Download Center and Library tabs; Homework now
  displays shared assignments/submissions instead of isolated sample history.
- Student 360 shows due dates, submission/review state, marks/feedback, applicable resource metadata,
  membership, loans, overdue labels and returns.
- Resource visibility preview excludes Draft/Archived and Staff-only records from student records.
- School Pulse adds a compact Learning operations panel without replacing existing KPIs.
- Examinations and Finance records are not changed or duplicated.

## KPI definitions

All new counts derive from actual prototype state:

- Active homework: current-session assignments marked Published.
- Pending review: current-session Published assignment submissions marked Submitted.
- Shared resources: current-session resources marked Published.
- Issued copies: open library loans.
- Overdue loans: open loans whose due date is before the explicit Academics preview day.
- Available copies: catalog copies less open loans and unavailable copies.
- Registered borrowers: membership counts by Student/Staff identity kind.

Pulse links to the corresponding module registry. These links currently open the module, not a
pre-applied drilldown filter. No usage/download counts, cloud storage total or decorative circulation
charts are fabricated. Library inventory/membership are school-wide; assignments/resources are
session-scoped.

## Verification

Executed:

- `pnpm exec tsc --noEmit` — passed after explicit form/model field mapping was added.
- `pnpm test:learning` — **18 checks passed**: ten routes plus issue/return reconciliation, exhausted
  availability, borrower eligibility, duplicate membership, lost/double returns, inventory archival,
  dates, resource validation and incomplete homework.
- `pnpm test:examination` — **23 passed**.
- `pnpm test:academic` — **29 passed**.
- `pnpm test:finance` — **39 passed**.
- `pnpm test:workforce` — **27 passed**.
- Total model/route checks: **136 passed**.
- `pnpm build` — passed; Learning is lazy-loaded.
- `node tests/learning-browser-qa.mjs` — **78 checks passed**, no runtime exceptions:
  homework publication and review; resource publication; shared student registration; issue;
  exhausted-inventory rejection without a crash; return closure; 70 responsive assertions; exception
  check.

Browser checks use real headless Chromium with the supervised preview, not a second development
server. Synthetic QA records are created only in the browser, not imported into application seeds.
Existing browser regressions also passed in this turn: **49 cross-module**, **76 HR/Communication**
and **56 Examination** checks, each with no runtime exceptions. Counts include breakpoint assertions,
not independent full end-to-end workflows.

## Responsive and accessibility review

All ten primary routes passed page-overflow assertions at **390, 430, 768, 1024, 1280, 1440 and
1600px**. Cards stack on small screens, filters switch to a single column and tables intentionally
scroll within wrappers. The breakpoint assertions do not establish a complete visual/touch audit of
every open drawer or mobile submission/return form.

The new screens reuse labeled Field/Button components, semantic table headers, text statuses,
validation alerts and the existing dialog initial focus, Tab wrapping, Escape and focus-return hook.
No new animation-dependent interaction was added. Full screen-reader, contrast, browser zoom,
touch-target and print audits remain pending. Native unsaved-change confirmation is used.

## Known defects and remaining acceptance gaps

1. Upload is metadata-only: no file picker/drop zone, file bytes, content preview, progress simulation,
   upload failure/retry runner, actual replacement storage or download. The screen says this clearly.
2. Book metadata is a useful subset: publisher, edition, year, language, acquisition details, cost,
   cover images and separately numbered physical-copy records remain pending.
3. Catalog supports safe archive through editing, not destructive deletion; no bulk book action or
   lost/damaged-copy restoration workflow exists.
4. Resource categories and assignment types are provided choices rather than separate reference
   configuration screens. Tags, selected-subject targeting and broad multi-target sharing are absent.
5. Registry column visibility is one grouped detail toggle, not a per-column chooser.
6. Borrower lookup is searchable and selectable but lacks complete department/designation filtering,
   membership deactivation/reactivation and configurable membership-number policy.
7. Class/status filters are relevant to assignment/resource registries; the shared toolbar also
   appears where some fields do not apply (catalog/circulation/borrower screens). These controls need
   context-specific refinement.
8. Duplicate homework titles are allowed; a duplicate-assignment warning is not implemented.
9. Submission review does not yet render the response itself or the full submission event history.
   History is retained in the shared record. Teacher assignment ownership remains a UI-policy gap.
10. Renewals check format/order but need strict ISO round-trip validation and production due-date
    policy. The school timezone is not implemented; timestamps use explicit local preview values.
11. Homework/resource required fields are checked at authoring; confirmation does not yet revalidate
    all changing academic/HR references. Production needs transactional eligibility checks.
12. Reporting and full Academics/Examination resource drilldowns, overdue-submission completion rates,
    richer dashboard operational panels and filtered Pulse drilldowns remain pending.
13. No real PDF issue/return receipt export or printing service.
14. Full accessibility and narrow-screen drawer/form interaction QA are not complete.

These are acceptance gaps; this handoff does not declare the whole requested matrix complete.

## Prototype boundaries, permissions and production dependencies

All records reset on reload. Roles (Administrator, Teacher, Librarian, Student, Staff borrower,
Management) are illustrative UI choices, not authenticated identities or server authorization.
Create/review/publish and circulation controls restrict proposed roles in the UI. Policy controls and
operator-selected student previews are not protected. A production student-facing surface must enforce
ownership and resource visibility server-side; the operator registry is not such a surface.

No real files, downloads, student submissions, notifications, library circulation, finance postings,
database, tenant isolation, secure transactions or immutable audit service are connected.

Production requires tenant-scoped persistence, identity/role enforcement, versioned academic
eligibility, secure uploads and malware scanning, object storage, signed downloads, submission
ownership/history, background deadline/notification handling, transactional copy-level circulation,
membership rules, fine/waiver approval policy, audit integrity, reports and privacy controls.

## Sprint 07 carry-forward

Keep the previously accepted backlog visible: richer document designers, full exam calendar/filters,
interrupted attempts/recovery, mobile assessment testing, timed-assessment accessibility, real print
QA and persistent/server-authorized secure examination infrastructure. This sprint did not silently
close those gaps.

## Recommendation

Review Sprint 08 and prioritize the gaps above before widening scope. The proposed next roadmap
area is **Inventory & Transport**, subject to approval and shared asset/location/vehicle-policy
decisions. Sprint 09 has not started, and no duplicate continuation automation was created.
