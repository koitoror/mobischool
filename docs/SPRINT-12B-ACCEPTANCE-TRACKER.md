# Sprint 12B acceptance tracker

Date: 2026-11-22 UTC. This extends, and does not replace, Sprint 12/12A evidence.

## Matrix

| ID     | Requirement                          | Status              | Evidence / remaining boundary                                                                                                                                                                                                                                       |
| ------ | ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12B-01 | Missing marks analytics              | Tested              | Eligible student/component pairs; blank and invalid entries separate from explicit zero. Model tests and browser source-entry workflow.                                                                                                                             |
| 12B-02 | Complete/eligible population clarity | Tested              | Unique eligible, any valid assessed, all-required-component complete, partial and incomplete counts. Current enrollment, not an archived historical roster.                                                                                                         |
| 12B-03 | Pass/fail analytics                  | Accepted Limitation | No pass/fail policy in existing grading configuration. UI explicitly unavailable; no threshold invented. Pure classifier tests explicit grade-label policies, but no new school settings were introduced.                                                           |
| 12B-04 | Pass-rate denominator                | Tested              | UI exposes potential complete population, excluded incomplete count and actual classifiable denominator zero when rule absent.                                                                                                                                      |
| 12B-05 | Historical snapshot clarity          | Implemented         | Stored percentage/grade/scale retained. New publication captures timestamp and grading-band copy. No archive of prior published revisions is claimed.                                                                                                               |
| 12B-06 | Subject analytics                    | Implemented         | Eligible/assessed/complete/missing/mean/high/low and exact scope inspection. Pass rates unavailable without rule.                                                                                                                                                   |
| 12B-07 | Class analytics                      | Implemented         | Class/section scopes with comparison warning; no ranking.                                                                                                                                                                                                           |
| 12B-08 | KPI drilldowns                       | Implemented         | Operational report KPI contributor drawers preserve current filters. Some population KPI rows are assessment pairs while the headline counts unique students; definitions disclose the distinction.                                                                 |
| 12B-09 | Chart drilldowns                     | Implemented         | Existing status/category buttons filter source rows; grade buttons open stored-grade contributors. Text/meter alternatives remain available.                                                                                                                        |
| 12B-10 | Exact inspector                      | Tested              | Browser verifies exact assessment and fee obligation. Live source ID resolution added for finance, attendance, stock, loans, transport and alumni.                                                                                                                  |
| 12B-11 | Source traceability                  | Tested              | Finance obligation contributors exclude payments; exact exam context opens the selected operational exam. Exhaustive every-metric/every-module independent reconciliation is not claimed.                                                                           |
| 12B-12 | Calculation detail                   | Tested              | Current filters, included/excluded row counts, formulas, numeric components and source notes. Specialized formulas for rates, balances, quantities, counts and net income.                                                                                          |
| 12B-13 | Keyboard navigation                  | Accepted Limitation | Existing 12A keyboard focus scenarios retained; full mouse-free traversal of all reports, saved reports, pagination and nested inspectors remains incomplete.                                                                                                       |
| 12B-14 | Screen-reader semantics              | Tested              | AX-tree named controls, labels, captioned tables, column scope, scroll-region names, descriptive KPI/row actions and error associations. No human screen-reader session was performed.                                                                              |
| 12B-15 | Chart accessibility                  | Implemented         | Direct labels, text counts and labelled meters; data rows remain accessible. Not a claim of exhaustive assistive-technology validation.                                                                                                                             |
| 12B-16 | Contrast validation                  | Tested              | Sampled primary report action text measured 6.8078:1. Scoped higher-contrast action surface/focus outline added. Full status-chip/label/chart contrast inventory remains open.                                                                                      |
| 12B-17 | Mobile accessibility                 | Tested              | Five new tabs checked at seven widths; stacked controls, labelled scrolling tables and existing focus-managed drawers.                                                                                                                                              |
| 12B-18 | Seven widths                         | Tested              | 35 new tab/width assertions; original Reports route coverage rerun separately.                                                                                                                                                                                      |
| 12B-19 | Reports regression                   | Passed              | Existing Reports **122/122**, Recovery **29/29**, Closure **47/47** completed.                                                                                                                                                                                      |
| 12B-20 | Cross-module regression              | Passed              | All ten suite workflows have successful completed runs, totaling **743** assertions. Examination initially failed a readiness lookup, then passed **56/56** after a bounded wait retaining the original assertion. The partial failed run is not counted as passed. |
| 12B-21 | TypeScript                           | Passed              | `pnpm exec tsc --noEmit` successful.                                                                                                                                                                                                                                |
| 12B-22 | Production build                     | Passed              | `pnpm build` successful.                                                                                                                                                                                                                                            |
| 12B-23 | Handoff                              | Implemented         | Dated Sprint 12B section and this explicit matrix preserve earlier history.                                                                                                                                                                                         |

“Tested” means the stated evidence ran; it does not silently mean every item in the original broad
requirement passed. “Accepted Limitation” in this tracker identifies an explicitly disclosed model
boundary, not user approval of a final acceptance waiver.

## Design / data definitions

- No new routes, modules, shell redesign, operational seed scores or report-only source registry.
- Missing-mark rows are computed eligibility pairs; they do not insert marks into Examinations.
- Required components are the selected exam records matching group/class/section/session.
- Assessed requires at least one valid mark; Complete requires every required component valid.
- A blank is missing, numeric zero is valid, out-of-range/nonfinite or duplicate score keys are invalid.
- Exemptions/absence policy is not present in the source and is not inferred.
- Scope dates select exam-group end dates, not publication dates. Published/live result context is
  shown separately. Historical enrollment and immutable revision archives are not fabricated.
- Means are unweighted valid component percentages, not total student ranks.
- Published percentages/grades are read from stored fields. Draft percentages use current component
  maxima. A changed historical maximum without a captured assessment schema remains a source limit.
- Subject/class tables warn about non-comparable structures and do not rank classes.

## Non-passing acceptance gates

The broad Sprint 12B definition still requires complete keyboard/screen-reader/contrast validation,
exhaustive KPI contribution verification and every requested specialized analytical workflow.
These have not all been established. User approval of non-blocking waivers has not been obtained.
Therefore final Sprint 12 acceptance must remain **NOT ACCEPTED**, even if the executed automated
test suites pass. No Sprint 13 is authorized or started by this implementation.
