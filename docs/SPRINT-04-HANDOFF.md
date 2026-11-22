# Sprint 04 — Academic Operations handoff

## Scope
18 routes: 3 Attendance submenus plus overview, 8 Academics submenus plus overview, 4 Lesson Plan submenus plus overview. Original module names remain intact. Configurations and transactional records are in-memory only.

## Data provenance
Two supplied staff exports are duplicates: one set of 44 staff names, roles, designations and departments is included. All 278 guardian-name rows are retained from the supplied guardian export; matching display names are not assumed to be the same person. Phone numbers, emails and usernames have not been copied. No student-name export or guardian/student relationships were supplied. Learner names and all academic/financial activity remain illustrative. Imported people are not authenticated accounts.

## Explicit illustrative policies
- Attendance: active roster is expected; rate is (Present + Late) / expected. Excused remains in the denominator; unmarked is distinct from absent. Draft marking affects no shared records until Save.
- Timetable: same-session, same-day overlaps conflict for teacher, class/section, or room. Adjacent periods do not overlap.
- Leave decisions retain a reason/history; approving leave does not silently overwrite attendance.
- Syllabus: completed topics / all defined topics. Delivered lesson plans do not automatically complete topics.
- Promotion: active, currently assigned learners with a different destination class/session are eligible in this preview. Source enrollment is retained, destination enrollment added. Assessments, debts and approvals are not evaluated; production eligibility remains undefined.
- All successful saves are preview-memory saves, reset on reload. No tenant isolation, real authorization, immutable audit log, durable recovery or integrations are implemented.

## Verification / release gate
- Automated model and SSR checks: `pnpm test:academic` (29 checks, all 18 academic routes).
- Finance regression checks: `pnpm test:finance` (37 checks, all 18 finance routes).
- Production build: `pnpm build`; TypeScript: `pnpm exec tsc --noEmit`.
- A local Chromium executable and the supervised Vite preview at port 3000 were discovered after the preview-tool lookup failed. A real, agent-owned headless browser session was exercised via CDP; no second development server was started.
- Browser script: `node tests/browser-qa.mjs`, with an existing Chromium CDP session on localhost:9222 and preview on localhost:3000 (override `CDP_URL` / `PREVIEW_URL` as needed).
- Live browser result: **47 targeted checks passed**, with no runtime exceptions in the exercised flows. This is not the user's entire release checklist.
- Targeted live coverage: shell collapse; enquiry → application → admission → Student 360; registry column visibility; visitor checkout; complaint resolution; blocked bulk archival and cancel; allocation review/cancel/confirm; simulated receipt disclaimer; shared fee balance; receipt batch eligibility; attendance save; topic completion; timetable clash rejection; Pulse attendance integration; reload clears simulated admissions; imported people directories; no runtime exceptions during the run.
- Responsive checks: no page-level horizontal overflow on the academic timetable, and no form clipping on the cashier/admission forms at 390, 430, 768, 1024, 1280, 1440, 1600 pixels.
- This is targeted QA, not completion of the user's entire 24-item release checklist. Full visual review, keyboard/focus/screen-reader checks, download/print verification, all filter/permission combinations, discount/reversal cases, reactivation, leave decisions and promotion browser flows remain pending.
- The initial "registry includes admitted student" assertion incorrectly expected all records in the active-only registry. It was corrected to account for the one inactive seed record; no application change was needed for that assertion.

## Product decisions carried forward
Authoritative academic records, attendance statuses/denominator, session calendars, concurrent membership, curriculum, grades, teacher-assignment exceptions, promotion policy, audit ownership, role/tenant isolation, recovery and external providers still need agreement. Hostel remains a Reports inventory entry, but no standalone Hostel operational scope was supplied; it is not implicitly implemented here.

The imported-directory checks await the lazy-loaded directory chunk before asserting rendered content. No application change was needed for the initial timing-only assertion failure.
