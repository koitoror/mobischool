# Sprint 07 — Examinations & Online Examinations

## Status

An interactive frontend implementation is present in the existing SchoolOS shell. Both central
assessment journeys work in local memory. This is **not full acceptance of every requested feature**
and is not a secure examination service. Sprint 08 has not started. Earlier handoffs are unchanged.

## 1. Primary frame inventory and original submenu mapping

| Frame | Operations destination | Scope                                                                           |
| ----- | ---------------------- | ------------------------------------------------------------------------------- |
| EX-01 | Examinations           | Session overview, pipeline, upcoming sittings, published grade counts, activity |
| EX-02 | Exam Group             | Session/class/period groups; create, edit, duplicate, inactive/archive          |
| EX-03 | Exam Schedule          | Interactive sitting register, validation, marks-entry and admit-card actions    |
| EX-04 | Exam Result            | Draft/reviewed/published results, entry, publication and history                |
| EX-05 | Design Admit Card      | Live document preview and template controls                                     |
| EX-06 | Print Admit Card       | Eligible candidate selection and batch generation preview                       |
| EX-07 | Design Marksheet       | Live marksheet preview and versioned template controls                          |
| EX-08 | Print Marksheet        | Published-result selection and document generation preview                      |
| EX-09 | Marks Grade            | Configurable six-band illustrative scale and percentage calculator              |
| OX-01 | Online Examinations    | Digital assessment overview and status pipeline                                 |
| OX-02 | Online Exam            | Creation, scheduling, student attempt, submission and evaluation                |
| OX-03 | Question Bank          | Reusable questions, validation, preview, edit and duplicate                     |

All eight original Examination submenu labels and both Online Examination labels are retained.
Design and Print destinations remain separate. Both module headings now expand in Operations,
with active route highlighting. The existing top-level shell and session selector are preserved.

## 2. Shared data and examination model

`ExaminationProvider` owns groups, exams, sittings, scores, grading bands, questions, online exams,
attempts, document templates, generations and activity. It consumes the existing `AcademicProvider`
and the session-selected student records from App.

- Groups refer to a shared class and academic session; term is explicit operator-supplied text.
- Exams refer to a group, shared subject, section, maximum marks and one assessment component.
- Sittings refer to an exam and an active shared teacher, with date/time and an operator-supplied room.
- Candidates are active shared students whose current session class/section match the exam.
- Scores are keyed by exam/student. No marks are seeded or invented.
- Online exams freeze selected question snapshots; modifying the bank cannot change an existing exam.
- Attempts refer to an online exam and shared student ID.
- Generated documents retain template versions, score references and schedule snapshots in memory.

The illustrative initial group/exam uses the selected session and first configured class/subject.
It has no sitting, scores, questions, online exams or attempts until operators create them.

## 3. Exam lifecycle

Create group → create exam → schedule sitting → select candidates → preview/generate admit cards →
enter draft marks → validate and mark Reviewed → confirm publication → preview/generate marksheet.

Group class/date changes are blocked once exams depend on the group. Duplicate a group for revised
scope rather than rewriting assessment history. Published scores are locked; unpublishing and
historical regrading are deliberately unavailable.

## 4. Schedule validation

Validation checks an active parent group, valid ISO date, group date boundaries, valid start/end
times, active shared invigilator and nonempty room. Overlapping class/section, room, invigilator and
duplicate-exam sittings are rejected. Adjacent periods are permitted. Saved conflicts are not
silently auto-resolved. Removal requires a reason and confirmation.

The schedule view selector currently provides table/agenda context, not a full interactive calendar
or independent grouped layouts. Room inventory and conflicts with ordinary academic timetable
bookings are not integrated.

## 5. Marks entry and calculation

Marks entry is accessible from Exam Schedule and Exam Result. Each eligible student has one labeled
numeric score input. Blank is not treated as zero. Negative, nonnumeric and above-maximum scores
are blocked. Draft saving permits missing values, while review requires all eligible candidates to
have valid marks. Scores show status and entry history.

Calculation is `score / maximum × 100`, explicitly rounded to two decimal places. One component is
supported per exam, with no invented component or subject weights. No rank, aggregate, pass/fail or
statutory grading policy is asserted.

## 6. Grade configuration and publication

The initial A–F bands are labeled illustrative, not universal school or Kenyan policy. Operators
can edit band labels/minima/maxima and preview percentages. Activation requires full 0–100 coverage,
no duplicate labels, and no overlap/gap at two-decimal precision. Published scores retain percentage,
grade and scale version. Updating the active scale does not regrade published records.

Publication explicitly identifies the exam/candidate scope, reviewed count and missing/invalid
count. Every currently eligible candidate must have a Reviewed valid score and a valid scale.
Only administrator preview roles may publish. No student portal or notification is triggered.

## 7. Admit-card and marksheet documents

The designers provide live shared-student previews, title, instructions, footer, alignment,
comfortable/compact spacing, schedule visibility and signature-area visibility. Saving a template
creates a new active version and archives the prior template. Existing generation records retain
their template version; generation excludes duplicate exam/student/kind/version combinations.

Admit cards require a scheduled sitting. Marksheets require published results. Missing photos,
signatures and stamps are stated, not fabricated. Batch previews show selection, eligibility,
exclusions and missing-photo counts. Browser print preview is available.

Paper size is currently template metadata; full print orientation/layout enforcement, PDF output,
logos/media, arbitrary field ordering, font/color/border editing, custom fields, template library
authoring and historical document reopening are pending. Do not interpret the preview as an
official issued document.

## 8. Question Bank and online examination workflow

Supported question types: Single choice, True / False, Short Answer and Essay.
Questions refer to configured subjects/classes and include topic, difficulty, marks, expected answer
or marking guide, and Active/Draft/Archived status. Validation catches missing text, bad marks,
missing answer/guide, incomplete or duplicate choice options, unsupported types and duplicate text.
Questions referenced by an online exam are not editable; duplication creates a separate item.

Create online exam → select question snapshots → configure duration/window/attempt limit → save
Draft → Schedule → select explicit preview candidate and simulated clock → Start → answer and
flag questions → review answered/unanswered/flagged counts → confirm submission → evaluate each
answer → confirm evaluation → shared Draft score → normal review/publication.

The builder requires subject/class-compatible questions and a window containing the duration.
Attempt start checks the explicit window, candidate eligibility and attempt count. Answer controls
match supported types, with Previous/Next, collapsible question navigator and local timer.
Submission confirmation does not reveal answers.

All questions require explicit evaluator marks; no automatic-marking claim is made. Every mark must
be present and in range. The online question maximum must match the parent assessment maximum before
a score can be transferred. Published results cannot be overwritten by evaluation.

## 9. Student 360 integration

The existing Academics and Examinations tabs now render the shared examination records instead of
an isolated sample exam history. They show exam, subject, score, maximum, published percentage,
grade and status, with result/schedule/admit-card/marksheet drilldowns. No independent score store is
created. These are operator-facing prototype views, not a student-authorized portal.

## 10. School Pulse integration and metric definitions

The new examination intelligence panel links directly to the relevant Operations records:

- **Upcoming sittings:** session sittings dated on or after the illustrative Academics day.
- **Registered students:** unique active eligible student IDs across session exams.
- **Results pending:** eligible exam/student count minus published score rows.
- **Published:** session score rows marked Published.
- **Marks entry completion:** entered session score rows divided by eligible exam/student count.
- **Published mean:** mean stored published percentages only; null when none.
- **Grade distribution:** counts of published grade snapshots only.

These are examination-specific indicators, not attendance or fee metrics. Existing legacy Pulse
academic-performance sample charts have not all been replaced and must not be read as reconciled
examination analytics. Dashboard chart/KPI coverage is narrower than the complete requested matrix.
Roster changes after review need a versioned backend eligibility policy.

## 11. Responsive evidence

The dedicated Chromium script checks Exam Schedule, Exam Result, Design Admit Card, Design
Marksheet, Question Bank and Online Exam at **390, 430, 768, 1024, 1280, 1440 and 1600px**.
All 42 page-width assertions passed. Tables intentionally scroll within wrappers, and design panels
stack below desktop width. The online question navigator uses native collapsible details.

This is not a full visual/touch/print audit or a seven-width check of every open drawer/attempt.
The online attempt itself was exercised at desktop size.

## 12. Accessibility review

Implemented: shared labeled fields/buttons, semantic tables, text status badges, explicit validation
alerts, keyboard-operable native answer inputs, keyboard Previous/Next, collapsible navigator,
dialog labels, initial focus/Tab wrapping/Escape/return-focus via the shared focus hook.
No motion-dependent interaction was added. Input grids remain intentionally scrollable on mobile.

Pending: screen-reader evaluation, full contrast matrix, browser zoom, touch-device checks,
marks-grid arrow-key shortcuts, focus announcements after question changes, timer announcements and
printed document accessibility. Closing a dirty form uses a native confirmation. Grade-editor and
evaluation drafts do not yet participate fully in the unsaved-change guard.

## 13. Verification and browser checks

- `pnpm exec tsc --noEmit` passed.
- `pnpm test:examination`: **23 checks** covering all 12 routes plus grade, group, schedule, score,
  question, access-window and evaluation validation.
- Existing Academic **29**, Finance **39**, Workforce **27** model/route checks passed.
- `pnpm build` passed; examinations are lazy-loaded.
- `node tests/examination-browser-qa.mjs`: **56 checks passed**, including classical scheduling,
  conflict rejection, admit card, reviewed/published result, marksheet, question creation, online
  scheduling, response/flag/submission summary, submission confirmation, evaluation into shared
  Draft result, 42 breakpoint assertions and no runtime exceptions.
- Earlier cross-module browser regression: **49 checks passed**.
- Workforce/Communication browser regression: **76 checks passed**.
- Total automated model/route checks: **118** (23 examination + 29 Academic + 39 Finance + 27
  Workforce). All three browser suites reported no runtime exceptions. Check counts include
  responsive assertions, not independent full journeys.

## 14. Known defects and incomplete acceptance

- Builder is a reviewed single form, not the requested six-step wizard; no randomization,
  multi-answer/fill-blank types, per-exam question mark overrides or question sections.
- No resumable interrupted-attempt UI; closing an active attempt leaves its memory record but does
  not provide recovery. Reload loses it. The preview clock pauses when the workspace is inactive.
- Timer expiry makes answers read-only and allows explicit late/timeout submission with a history
  label; no secure deadline enforcement or automatic submission exists.
- No full calendar, exports, complete filter/pagination matrix, charts, status KPIs or batch marks import.
- No multi-component weighted results, pass policy, ranks, result unpublication or multi-actor approvals.
- Teacher preview roles are not restricted to assigned assessments. Student preview uses explicit
  operator candidate selection, not authenticated ownership.
- Academic subject-to-class assignment is not modeled in the existing provider; all configured
  subjects are selectable with a visible warning. Term is text rather than a shared term entity.
- No fee-clearance eligibility assumption or financial hold is imposed. Such rules need approval.
- Designers/document snapshots have the limits described above.
- No full-screen-reader, every-frame responsive, online mobile attempt or physical print audit.

These gaps prevent claiming every acceptance criterion is complete.

## 15. Simulated state, backend requirements and open policy decisions

All operations, publication, generations and submissions are local simulations. Activity strings
identify unauthenticated preview actor, ISO timestamp, transition and reason where applicable.
They are not immutable server audit logs. There is no persistence, tenant isolation, authentication,
upload storage, PDF service, real publication or notifications.

Production requires durable exam/version/candidate records, schedule transactions, authenticated
student/teacher sessions, server permissions, result locks, grading versions, append-only marks
auditing, template/media/PDF persistence, secure time source, response autosave/recovery, idempotent
submission, evaluator permissions, approved automatic/manual marking and notification infrastructure.

School owners must decide term mapping, class/subject permissions, candidate snapshots, absent
scores, weights, rounding, pass rules, rank/tie rules, score-change approvals, publication/retraction,
late submissions, attempt recovery, timing/accommodations, question randomization, answer release,
document authorization, fee holds and integrity/proctoring policy. Frontend controls do not implement
exam security, lockdown, anti-cheating, identity checks or submission integrity.

## 16. Next recommendation

Review Sprint 07 before Sprint 08. Prioritize secure attempt/recovery architecture, candidate and
subject/class policy, result approval/versioning, richer templates and historical document retrieval,
then finish online-mobile/accessibility/print QA and dashboard/filter gaps. No Sprint 08 work began.
