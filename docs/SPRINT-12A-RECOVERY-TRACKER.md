# Sprint 12A — Recovery tracker

Date: **2026-11-22 UTC**. Read together with the historical Sprint 12 handoff.
No Sprint 13, new modules, backend or persistence was introduced.

## Evidence matrix

| ID     | Severity / route               | Initial status      | Recovery status     | Evidence / limitation                                                                                                                                                                                                                                                           |
| ------ | ------------------------------ | ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REC-01 | P0 / cross-module → reload     | Failed              | Passed              | Baseline reproduced 44 assertions then reload failure. Updated suite completed 49/49. New receipt/navigation/report/reload workflow passed.                                                                                                                                     |
| REC-02 | P0 / Online Exam evaluator     | Failed historically | Accepted Limitation | Baseline and two subsequent Examination runs completed 56/56. Unsafe immediate input lookup replaced by bounded named-evaluator readiness and input-type assertion. Exact historical intermittent trigger not reproduced; no grade or examination behavior changed.             |
| REC-03 | P1 / CMS public mobile preview | Failed historically | Passed              | Baseline and repaired CMS suites completed 88/88. New navigation workflow verifies Escape/focus and destination close at all seven widths.                                                                                                                                      |
| REC-04 | P1 / Reports Overview          | Failed              | Passed              | Baseline reproduced null lookup before first assertion; later inspection found route rendered. Repaired suite waits for meaningful visible route content and completes 122/122, including 16 × 7 width checks.                                                                  |
| REC-05 | P1 / Finance report            | Partial             | Passed              | Added cohort/aging/method/fee-type/class reconciliation views and model tests. Expected = allocated + outstanding; aging sums to outstanding; methods and allocations sum to selected payments.                                                                                 |
| REC-06 | P1 / Attendance report         | Partial             | Accepted Limitation | Marked-only rate and separate Present/Absent/Late/Excused counts retained. Session-aware identity projection and leave class/section references repaired. Operational expected-roster rate still intentionally differs; comprehensive historical enrollment audit remains open. |
| REC-07 | P1 / Examination report        | Partial             | Accepted Limitation | Published averages/grade distributions use stored snapshots, not current grade bands. Missing-mark denominators and explicit school pass/fail policy remain unavailable/incomplete.                                                                                             |
| REC-08 | P1 / Inventory report          | Partial             | Passed              | Model checks include opening + receipt + issue + adjustment + return. Browser receipt produces report/source stock 55 and reload restores opening 50. Date-filtered current snapshots remain a documented limitation.                                                           |
| REC-09 | P1 / accessibility             | Incomplete          | Accepted Limitation | Browser keyboard checks pass focus entry, reverse Tab containment, Escape and focus restoration; labels, table headers and meter descriptions checked. Full screen-reader/contrast and exhaustive keyboard-only audit not completed.                                            |
| REC-10 | P0 / regression                | Unverified          | Passed              | Eight existing suites completed: 49 + 56 + 88 + 122 + 76 + 78 + 89 + 109 = 667 assertions. Four new recovery scenarios completed with 29 more. Partial earlier runs are not counted as successful workflows.                                                                    |

## REC-01: reproduction and diagnosis

1. Run `node tests/browser-qa.mjs` against the supervised preview.
2. Exercise enquiry/admission, finance, academic and registry workflows.
3. Open the admission form, resize through seven widths, request reload.
4. Original behavior: 44 assertions pass, then `Reload returns to School Pulse` fails.

Expected: navigation preserves in-memory records; a committed reload reconstructs a consistent
illustrative seed with no stale admissions/payments. Persistence is not expected.

Root cause of the test: `Page.reload` acknowledges the request before the new document commits.
The readiness loop could match the old document's mounted-but-hidden School Pulse `h1`, exit
early, then assert during replacement. Increasing a sleep did not enforce document identity.
An isolated diagnostic run with extra event instrumentation also passed, confirming timing sensitivity.

Fix: record `performance.timeOrigin`, require it to change, and require a **visible** School Pulse
heading before retaining the original content/reset assertions. No persistence or reset logic was added.
Visible controls and labelled fields now have bounded readiness checks rather than assuming
150ms is sufficient. A timeout still fails the test.

## REC-02: interaction diagnosis

Historical failure: `Illegal invocation` while applying the native HTMLInputElement setter to an
immediate unscoped query after opening evaluation. Calling that setter on a null/non-input receiver
does not establish an examination calculation defect.

Exact error was not reproduced in this baseline (56/56 passed); it is not honest to claim a proven
product root cause. The unsafe test assumption is removed: wait for `[role=dialog][aria-label="Evaluate
attempt"] input[type=number]`, assert the receiver is an HTMLInputElement, then enter the same marks
and retain evaluation/result assertions. Shared click/field readiness also protects preceding transitions.
No grades, maximums, eligibility, publication transitions or source records were altered.

## REC-03: mobile navigation

The baseline suite passed (88/88), so the historical missing-action failure was intermittent.
The public preview resizes to a container-query layout; fixed-time querying of its trigger is unsafe.
The test now explicitly waits for the visible trigger after selecting Mobile. The target and menu-open
assertions remain unchanged.

Product improvement: open public menus now close on Escape and restore focus to the trigger;
outside clicks close the inline menu. Selecting a destination already closes it. This is an inline
expanding navigation, not a modal drawer: scroll locking is intentionally not added.

## REC-04: lazy route lookup

Baseline Reports lookup failed at zero assertions. A later read-only DOM inspection found
`Reports Overview` in the breadcrumb and the reporting library rendered, establishing that the
immediate 150ms lookup was not synchronized with the lazy route import.

Fix: bounded read-only readiness for visible Reports route heading. No route/title was renamed.
All original route, filtering, saved configuration, export, authorization and responsive assertions
remain in the suite.

## Reconciliation and state audit changes

- Student lookup now overlays enrollment for the requested session; attendance history uses the
  attendance record's own session, not merely the current App session.
- Student leave rows now carry the referenced student's class/section for report filtering.
- Financial reconciliation reads the same ledger and selected source IDs; no second financial state.
- Additional source tables cover published exam grades, signed stock kinds, loan/return/renewal counts,
  vehicle seats versus route requirements, and alumni RSVP status distinct from registry status.
- Existing providers still own student/staff identities, payments, exams, stock and content.
- No staff identities, alumni events, CMS content or financial transactions were duplicated.

## Tests and honest limits

`tests/ui-readiness.mjs` polls **read-only conditions** with an eight-second bound. It does not
click through failures, skip assertions, mutate React state or catch-and-pass failed workflows.

New `tests/recovery-browser-qa.mjs` contains four complete workflows / 29 assertions. Its first
development attempt used a synthetic `.click()` that did not focus the dialog opener; that is not
a valid focus-restoration setup. The final test uses browser pointer input to establish focus, then
real browser keyboard events for Shift+Tab and Escape. A follow-up selector whitespace error in
that new test was corrected. The final workflow passed; the earlier attempts are not counted.

The acceptance decision remains governed by **all** required gates, not only the four repaired
scripts. Remaining historical enrollment, exact deep-linking, snapshot-period interpretation,
missing academic rules and accessibility limits are not erased by green regression results.
