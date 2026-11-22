# Sprint 13 acceptance tracker

Date: 2026-11-22 UTC. Status evaluates the comprehensive Sprint 13 brief, not merely route rendering.

| Gate                                    | Status                   | Evidence / gap                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eight original settings labels          | PASS                     | Route array and SSR/model check preserves all labels.                                                                                                                                                                  |
| Overview and 19 views                   | PASS                     | 19 SSR route checks; Settings browser suite 144 assertions.                                                                                                                                                            |
| Identity configuration                  | PASS, prototype scope    | Browser name propagation and model validation. CMS remains name-scoped; rename impact is disclosed.                                                                                                                    |
| Sessions / academic structure           | PARTIAL                  | Date/term/duplicate validators and shared edits work; full hierarchy/progression and dependency graph incomplete.                                                                                                      |
| Curriculum / grading                    | PARTIAL                  | Shared catalog and explicit grade scheme publication; multi-curriculum mapping/advanced weighting incomplete.                                                                                                          |
| Historical grading context              | PASS, tested scenario    | 45% published under A–E passing labels remains passed after a new A-only rule; stored scheme/rule stays original.                                                                                                      |
| Attendance / finance policy integration | PARTIAL                  | Currency and payment methods connected; attendance and other financial policies remain metadata.                                                                                                                       |
| Payment-method safety                   | PASS, inspected flows    | Historical method deactivation blocked; new method appears in Finance filter and posting validates active method names.                                                                                                |
| Print templates                         | PARTIAL                  | Live preview; complete operational document-profile propagation not implemented.                                                                                                                                       |
| Backup / restore                        | PASS, simulation scope   | Typed acknowledgement and reasoned impact confirmation; only generic settings metadata is restored. No external backup verification.                                                                                   |
| Users / roles                           | PARTIAL                  | Search/sort/pagination, role/status previews and final-admin guard; no authentication or full role matrix integration.                                                                                                 |
| Custom / system fields                  | PARTIAL                  | Definition validation and protected registry; source-form propagation not complete.                                                                                                                                    |
| Profile updates                         | PASS, tested fields      | Guarded request approval changes the shared phone field in Student Registry; email/phone supported.                                                                                                                    |
| Online Admission                        | PARTIAL                  | Publish/simulate/duplicate guards tested; no automatic Front Office registry transfer.                                                                                                                                 |
| Module dependencies                     | PARTIAL                  | Dependency checks and availability recommendations; navigation enforcement intentionally not claimed.                                                                                                                  |
| Configuration audit                     | PARTIAL                  | Read-only actor/time/reason/change events and search; full filtering/rollback/before capture incomplete.                                                                                                               |
| Shared propagation                      | PARTIAL                  | Concrete identity/session/academic/finance/grading/profile links; several policy engines remain unconnected.                                                                                                           |
| Responsive / accessibility              | PARTIAL                  | 133 new route/width checks; four new keyboard/draft assertions passed. Full accessibility audit not completed.                                                                                                         |
| TypeScript / build                      | PASS                     | Both commands exited successfully after source changes.                                                                                                                                                                |
| Existing regressions                    | PASS on completed reruns | All prior suites have successful completed current-turn runs; 772 assertions. Initial Examination/Reports timeouts were preserved, then unchanged stable-source reruns passed. No claim that the initial batch passed. |

## Actual current-turn results

- Models/routes: new Settings **38/38**; prior suites **324/324**; combined **362/362**.
- New Settings browser: **144/144** including 19 routes × seven widths.
- New Settings integration/keyboard: **13/13**.
- Existing completed browser reruns: **772/772**.
- Total completed browser assertions: **929**, across 14 suite workflows.
- TypeScript and production build: passed.

Known test failures and retests are described in the handoff. No partial failing workflow is
included in a successful-suite total. Reports acceptance history remains unchanged.

## Evidence commands

- `pnpm test:settings`
- All existing package model test scripts, unchanged
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `node tests/settings-browser-qa.mjs`
- `node tests/settings-integration-browser-qa.mjs`
- Existing browser suites retained with original assertions

## Final decision

**NOT ACCEPTED.** Several required cross-module configuration capabilities are implemented only
as clearly labelled proposals or previews. Successful route/model/browser checks do not turn those
into fully integrated policy engines. No production backup, authentication, authorization, storage
or provider integration is claimed. Sprint 14 was not started.
