# Sprint 12C — Final acceptance & evidence closure

Date: **2026-11-22 UTC**. Prior Sprint 12/12A/12B sections remain historical evidence.
Scope remains the existing Reports module. No Sprint 13 or new operational module was started.

## Acceptance matrix

PASS applies only to the stated evidence. A required composite gate is not PASS merely because a
subset of its assertions passed.

| ID     | Requirement                       | Status     | Evidence, defect/remediation and retest                                                                                                                                                                                              |
| ------ | --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12C-01 | Independent KPI references        | FAIL       | `test:acceptance-reference` 21/21; raw Finance loops are independent of display totals. Non-finance references validate source-row arithmetic, not all underlying source joins. Not exhaustive.                                      |
| 12C-02 | Student reconciliation            | NOT TESTED | Student 360 exact identity and return context tested in browser, but no complete independent active/admission/withdrawn/category/gender population audit. Missing gender is not fabricated.                                          |
| 12C-03 | Finance reconciliation            | FAIL       | Six raw-ledger references tested, including unallocated amounts, discounts, independent outstanding, duplicate-ID blocking and period boundaries. Full independent aging/class/fee-group/filter combinations remain incomplete.      |
| 12C-04 | Attendance reconciliation         | FAIL       | Empty/duplicate/zero arithmetic tested; marked-observation denominator remains explicit. Full raw attendance/leave/session/class audit not complete.                                                                                 |
| 12C-05 | Examination reconciliation        | FAIL       | Existing 21 analytics model checks rerun; keyboard journey covers missing pair → marks context → report return. Current/historical population and schema cases remain incomplete. Pass/fail stays unavailable without a school rule. |
| 12C-06 | HR reconciliation                 | NOT TESTED | Existing Workforce regressions rerun separately; no new exhaustive independent payroll/headcount/leave reference audit.                                                                                                              |
| 12C-07 | Learning reconciliation           | FAIL       | Reference formulas exist for assignment counts, expected/missing submissions and topic rate. Complete independent raw assignment/topic join verification remains open.                                                               |
| 12C-08 | Library reconciliation            | FAIL       | Separate title/copy/available reference tests pass. Missing dated catalog snapshots now show unavailable instead of zero. Full raw loan/copy/status audit remains open.                                                              |
| 12C-09 | Inventory reconciliation          | FAIL       | Independent signed issue and low-stock selection cases pass; dated current snapshots now show unavailable. Full raw movement/store/valuation reference audit remains open.                                                           |
| 12C-10 | Transport / Alumni reconciliation | NOT TESTED | Unsupported utilization stays unavailable. Existing source tests rerun; no new exhaustive independent allocation/RSVP audit.                                                                                                         |
| 12C-11 | KPI-to-source navigation          | FAIL       | Four keyboard journeys traverse KPI/contributor interfaces; four source scenarios exercised. Not every KPI/module combination is independently verified.                                                                             |
| 12C-12 | Chart-to-source navigation        | NOT TESTED | Existing accessible category/status buttons retained. No new exhaustive chart contribution/navigation audit.                                                                                                                         |
| 12C-13 | Table-to-source navigation        | FAIL       | Exact Student 360, Finance inspector, Attendance inspector and missing-component exam context tested. HR/Homework source inspectors improved; not all destination screens are exact-record deep links.                               |
| 12C-14 | Filter context preservation       | FAIL       | Query, session state, columns and sort are retained in the return context; browser verifies Student 360 and Examination return. Date/sort/section combined round trips not exhaustively tested.                                      |
| 12C-15 | Keyboard-only journeys            | FAIL       | Four representative native-keyboard journeys completed with 25 assertions. Date-picker, all saved/favorite/chart/mobile variants are not comprehensively covered.                                                                    |
| 12C-16 | Focus order / restoration         | FAIL       | KPI dialog focus restoration checked in four keyboard journeys. Existing recovery focus checks rerun. All nested surfaces and report destination focus placement remain unverified.                                                  |
| 12C-17 | Keyboard chart alternatives       | NOT TESTED | Button/text alternatives exist; not newly exercised exhaustively without pointer input.                                                                                                                                              |
| 12C-18 | Human screen-reader validation    | BLOCKED    | No Orca or speech-dispatcher binary found; no human screen-reader session supplied by available tools. AX-tree evidence from previous sprints is not substituted for human testing.                                                  |
| 12C-19 | Dynamic announcements             | FAIL       | Added polite loaded/matching-count/filter status region. Actual spoken announcements and all success/error/loading flows not human-tested.                                                                                           |
| 12C-20 | Full contrast inventory           | BLOCKED    | Automated default-state text inventory covers 16 routes / 1,681 samples: 1,656 PASS, 25 disabled exemptions after repair. Hover/focus/error/dialog/tooltip/graphical-object/border states are not fully inventoried.                 |
| 12C-21 | Responsive / touch accessibility  | FAIL       | Existing seven-width suites rerun separately; new keyboard journeys run at 1440px. Full mobile keyboard/touch-size/state matrix not completed.                                                                                       |
| 12C-22 | Cross-module regression           | PASS       | All ten existing suites rerun successfully this turn: 743 assertions. New keyboard/inventory 25 and QA-inspector 4 also passed; 772 browser assertions across 12 completed suite runs.                                               |
| 12C-23 | TypeScript / build                | PASS       | `pnpm exec tsc --noEmit` and `pnpm build` completed successfully after source changes.                                                                                                                                               |

## New evidence and procedures

### Independent references

`src/reportReference.ts` does not import report presentation selectors, `metricContributors`,
`calculationEvidence`, or Finance summary/balance functions.

Finance references loop directly through shared ledger amounts, discounts and allocations. The
test fixture deliberately contains a receipt of 3,000 minor units with only 2,500 allocated:
unallocated money is not used to reduce the obligation. Expected fees are 9,500, allocated fees
2,500 and outstanding 7,000 minor units; general income remains separate.

`tests/acceptance-reference.test.ts` contains 21 executed cases, not an exhaustive reference for
every requested metric. Row-projection references cannot independently certify that source joins,
student scope or historical enrollment are correct. The inspector labels this boundary explicitly.

Administrator preview can expand “Developer reconciliation” inside a KPI drawer to see formula,
basis, units, reference value, displayed value, difference and status, plus inclusion/exclusion
reasons and filters. This is a frontend QA proposal, not server-enforced secrecy. Unsupported or
duplicate-ID references are NOT VERIFIED rather than false PASS.

### Source-return behavior

`ReportsContext` holds an in-memory originating report context. A contextual return action is
shown after source navigation. It preserves query/session/period/columns/sort; it is not a new
module or competing report navigation hierarchy.

Student Information has an exact shared-ID Student 360 action. Examination missing-mark source
navigation now saves the originating report context. Inspectors additionally resolve actual student,
staff and homework records rather than returning only reporting projections.

### Keyboard journey procedure

`node tests/acceptance-keyboard-browser-qa.mjs`

- Starts from a fresh page.
- Uses native CDP key events to tab to Operations and Reports.
- Traverses Student Information, Finance, Attendance and Examinations using the native report select.
- Types a query, applies filters, opens a KPI drawer, checks focus restoration, inspects a source
  and opens/closes filtered export preview.
- Student scenario opens exact Student 360 and returns with query retained.
- Missing-marks scenario opens the exact exam context and returns with query retained.
- No pointer events, DOM `.click()`, value setters or `.focus()` are used by the executed journey body.
  Inherited unused helper definitions are not executed.

Development failures were retained in run output:

1. Incomplete CDP Enter encoding did not activate Operations. Native virtual key codes and Enter
   carriage-return text were added; no pointer fallback was introduced.
2. The test expected a saved score row for a missing-mark pair. This is not a source score. It was
   corrected to test the exact missing-component → marks-entry context path.
3. The test expected a candidate name in a zero-row score export. It now asserts zero filtered
   records, disabled export confirmation and retained query—without fabricating score data.

The final completed new run has 25 assertions / four representative journeys / four source
navigation scenarios. This does not mean the entire keyboard-only acceptance matrix is complete.

### Live reconciliation-panel procedure

`node tests/reconciliation-inspector-browser-qa.mjs`: **4/4** passed. In the fresh illustrative
Finance ledger, the raw-loop reference and displayed outstanding balance were **204,000.00**
display-currency units, with difference **0.0000**. The browser checked inclusion/exclusion details
and verified the developer panel is absent under Auditor preview. This is one live KPI/scope,
not proof of exhaustive independent reconciliation.

### Current-turn regression results

`pnpm exec tsc --noEmit`, `pnpm build`, and all eleven model/route suites completed successfully:
**324/324** checks, including **21 new reference cases** and **303 re-executed existing checks**.

Existing browser suite results from this turn: Cross-module 49, Workforce 76, Examination 56,
Learning 78, Inventory/Transport 89, Certificates/Alumni 109, CMS 88, Reports 122,
Recovery 29 and Analytics Closure 47 = **743**. With the new 25 + 4 checks: **772**.
No runtime exceptions were reported in those completed runs. Earlier development failures described
above are not counted as completed successful workflows.

### Contrast inventory

`docs/evidence/12c-contrast-inventory.json` records route, element, foreground/background, ratio,
requirement and result for each visible default-state text sample.

- Environment: Linux; **Chrome/156.0.8078.47**; 1440 × 1000.
- Normal text threshold: 4.5:1. Large text threshold: 3:1.
- Disabled controls are recorded as exempt, not silently counted as passes.
- Unknown gradients/opacity/compositing are flagged, not passed.
- Source table content is omitted from stored text examples where appropriate.
- Initial run: **1,047 failures**, **16 unverified compositing samples**, **1,681 total**.
- Dominant inherited grey-on-white combinations measured approximately 3.36–3.75:1.
- Reports-only readable text and control borders were darkened; explanatory text opacity removed.
- Retest: **1,656 PASS**, **25 disabled exemptions**, **0 failures**, **0 unverified**, same 16 routes.

These are text samples, not 1,681 unique component designs. Repeated cells count separately.
This is **not a full WCAG contrast audit**: non-default states, modal/error surfaces and meaningful
UI/graphical contrast are still a required outstanding gate. The old 6.81:1 button sample remains
historical evidence, not a substitute for this inventory.

## Human screen-reader record

| Field                      | Result                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Screen reader / version    | Not available                                                                                        |
| Browser / version          | Chrome/156.0.8078.47                                                                                 |
| OS                         | Linux                                                                                                |
| Human participant          | None                                                                                                 |
| Expected announcement      | Requires operator-defined report/filter/dialog journeys                                              |
| Actual spoken announcement | NOT TESTED                                                                                           |
| Defect / blocker           | No human assistive-technology session available                                                      |
| Recommended resolution     | Human NVDA/JAWS/VoiceOver/Orca validation with version, expected/actual announcement and retest logs |
| Acceptance                 | BLOCKED                                                                                              |

## Formal decision

**NOT ACCEPTED.** The independent source audit, every-record navigation, comprehensive keyboard,
human screen-reader and all-state contrast gates are not all satisfied. Passing automated results
do not override these gates. No Sprint 13 was started.
