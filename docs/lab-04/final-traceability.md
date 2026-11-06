# Final Lab 4 Requirements-to-Evidence Traceability

2026-11-04. Baseline: staging91d627afa88a9cf1d6f2730b00c5b3784d134817; current branch feature/lab4-final-integration. Teacher source: complete 11-page SE+Lab+4.pdf. Approved IDs remain unchanged. Tests below refer to the actual files in [tests.md](tests.md), not an invented assertion count. [Final testing report](final-testing-report.md) records fresh counts and execution limits.

## Product acceptance criteria

| AC | Requirements / rules | Test IDs | Actual evidence / scope |
|---|---|---|---|
| AC-01 | FR-01; BR-01-03 | ACT-01, AUTH-01, E2E-01 | Action API creation/identity and multi-actor browser lifecycle |
| AC-02 | FR-01; BR-04 | ACT-02, UI-01, FAIL-01 | API boundaries/transport, component field validation, browser form feedback |
| AC-03 | FR-02; BR-03 | ACT-03, CON-01 | Active assignees, account-role/deactivation races, seed participant eligibility |
| AC-04 | FR-02; BR-05 | ACT-04, UI-01, E2E-01 | Action matrix, actual performer, Result and cancellation reason |
| AC-05 | FR-02; BR-06 | ACT-05, UI-01 | Completed corrections and terminal/immutable restrictions |
| AC-06 | FR-03; BR-07 | ACT-08, AUTH-01, E2E-01 | Owner-only requester reads; no writes/private history; nested pairing |
| AC-07 | FR-04; BR-08 | ACT-06, WF-03, WF-06 | Atomic revisions/events, POST/PATCH failure rollback and no-op/replay invariants |
| AC-08 | FR-04; BR-09 | ACT-07, WF-06, UI-02 | Tied timestamp order, version order, actor snapshots and Bangkok display |
| AC-09 | FR-05; BR-10 | WF-01, WF-07, UI-03 | 8x8 status matrix and precise stale/no-change/transition/reason/gate precedence |
| AC-10 | FR-05; BR-11 | WF-02, E2E-02 | All four resolution/closure predicates, including direct API bypass attempts |
| AC-11 | FR-05; BR-12 | WF-03, WF-04, E2E-02 | Cancellation cascade/rollback, reopening and legacy-state preservation |
| AC-12 | FR-06; BR-13 | WF-05, REG-01 | Owner-only idempotent advisory indication and dated reopening display |
| AC-13 | FR-07; BR-18-21 | DASH-01, UI-05, E2E-03 | Requester SQL/query reconciliation, owner privacy, bounded lists |
| AC-14 | FR-08; BR-18-21 | DASH-02, UI-04, E2E-03 | Staff/Admin priority buckets/current assignee formulas and exact counts |
| AC-15 | FR-07-08; BR-18-21 | DASH-03-05 | One asOf, Bangkok window, inclusive/future boundaries and paged cutoff propagation |
| AC-16 | FR-09; BR-10/14-15 | CON-01, WF-01, UI-03 | Concurrent writes/role changes/gate races, rollback and preserved drafts |
| AC-17 | FR-09; BR-16 | DUP-01, E2E-01 | Sequential/concurrent replay, changed-payload rejection and offline retry |
| AC-18 | FR-09/12; BR-17/25 | FAIL-01, UI-01/03/04/05 | Safe loading/validation/empty/auth/404/409/500/network and recovery |
| AC-19 | FR-10; BR-22 | MIG-01 | Actual old SQL plus additive migration; earlier records, bytes, credentials and relationships retained |
| AC-20 | FR-10; BR-23 | SEED-01 | Repeatability; creator/assignee/performer eligibility; all fixture states without account overwrite |
| AC-21 | FR-10; BR-24 | MIG-02, TOOL-01 | Populated backup/restore/replay/revisions/sequences/subsequent writes and source preservation |
| AC-22 | FR-11; BR-07/17 | REG-01, AUTH-01 | Full Labs1-3 backend/frontend/browser regressions and all-role mandatory password gate |
| AC-23 | FR-12; BR-25 | RESP-01, STYLE-01 | Three required browser projects plus 320px, overflow/overlap and screenshots |
| AC-24 | FR-12; BR-25 | A11Y-01 | Browser keyboard/focus/label/error/dialog and axe; manual/screen-reader limits explicit |
| AC-25 | FR-12; BR-25 | POLISH-01, E2E-01-03 | Navigation, safe errors, console assertions and current screenshot inspection |
| AC-26 | FR-13 | DOC-01 | Approved contract, all FR/BR/AC mappings and required files; I1 approval predates implementation |
| AC-27 | FR-13 | PERF-01 | Approved 1000/3000, 3 warmups, 20 samples/endpoint; bounded payload and all samples |
| AC-28 | FR-14; BR-26 | REL-01 | I1-I6 actual merge/peer approvals verified; I7/main/Done evidence pending |
| AC-29 | FR-15 | DOC-02 | README, reviewer record and student-confirmed AI tools/eight prompts/reflection |
| AC-30 | FR-15; BR-27 | SUB-01, RESP-01 | Required screenshot structure and nine-part draft PDF; final-main/board/review replacement pending |

AC-01-22 and AC-27 are covered by actual backend/frontend/browser checks listed in the final report; AC-23-25 combine automated checks with expressly bounded visual/manual evidence. AC-26 is the contract/history audit. AC-28 and AC-30 retain publication-dependent gaps. AC-29 uses the student's actual tools/reflection and public review records; it does not claim a new review occurred.

## Actual implementation anchors

- Actions: `server/src/actions/`, `server/prisma/seed-lab4.ts`, additive `20261029090000_actions_taken/migration.sql`, `client/src/ActionsTaken.tsx`, the Actions API adapters in `client/src/api.ts`.
- Workflow: `server/src/workflow/`, versioned staff routes, `client/src/TicketWorkflow.tsx` and `client/src/ticket-workflow.api.ts`.
- Dashboards: `server/src/dashboard/`, Requester/Staff list filters, `client/src/RequesterDashboard.tsx`, `StaffDashboard.tsx`, `dashboard.api.ts` and integrated App navigation.
- Auth and prior behavior: actual session/role middleware, auth/admin/staff/discussion routes, App/API/queue/user-management components; real earlier lab test directories remain active.
- Cross-cutting I6: API default3001, strict frontend5173, public development example5433, accessible read-only labels/scoped contrast, same-password rejection and compiled start path.

Administrator authorization: I3 initially permitted Queue reads only. Explicit student-approved I4 BR-10/API section7 superseded that prerequisite with only the documented versioned Ticket transitions/assignment/priority operations. Admin is not implicitly an eligible IT_STAFF owner/assignee; Requester ownership/privacy and unrelated safeguards remain enforced. I7 does not change these permissions.

## Teacher obligations and evidence owners

| Teacher source | Evidence | Completion boundary |
|---|---|---|
| Sections1-4,9 | Approved FR/BR/model/API/UI/AC; I1#57 and PR58 before implementation | Contract and chronology verified |
| Sections4.3/4.4/6/8.3 | ACT/CON/DUP, components, action browser flows and shared/private screenshots | Product verification |
| Sections4.5/8.4 | WF matrix/gate/history/cascade/reopen, components and Ticket resolution browser | Product verification |
| Sections4.6/6.2/8.1-2 | DASH exact SQL/boundary reconciliation and role dashboards/drill-downs | Product verification |
| Section5 | MIG-01/02, SEED-01, explicit PG18 tools and additive SQL audit | Disposable verification only; development untouched |
| Sections7/8.5-6 | REG/FAIL/RESP/A11Y/STYLE/POLISH; all three projects and stated manual limits | No screen-reader/physical-device certification inferred |
| Sections10/12 | Required server/client/browser filenames and all verification categories | All present; exact test inventory retained |
| Sections11/13 | Real I1-I6 issues/PRs/approvals; unchanged seven-issue mapping | I7 review and release pending |
| Section14 | [Nine-part submission checklist](submission-checklist.md), rendered draft and selected screenshots | Final main, all-Done Project and final PDF update pending |

## GitHub Issue #70 acceptance criteria

| Criterion | Status | Evidence / remaining action |
|---|---|---|
| AC1 I1-I6 integrated | Verified | All six head commits ancestors of staging91d627a; factual GitHub merge record |
| AC2 workflows work together | Verified on feature worktree | 739 backend,306 frontend,84 browser passes; final-testing-report.md |
| AC3 executed final regression | Verified on feature worktree | All full groups executed, zero failed/skipped; not main |
| AC4 accessibility/responsive | Automated verification passed | 81 zero-violation audits and explicit visual/manual limits |
| AC5 config/setup/examples | Verified within local scope | 5173/3001/5433 unchanged; HTTP/CORS, builds and compiled health |
| AC6 docs/evidence complete | Feature review package prepared | Required records,41 selected PNGs and32-page audited draft; release-dependent additions pending |
| AC7 issues/PRs/reviews | I1-I6 verified; I7 pending | reviewer.md/public GitHub history; no fabricated I7 approval |
| AC8 teacher artifacts | Pending final release | One draft PDF; final-main output and final all-Done Project still required |
| AC9 preservation/secrets | Verified within controlled scope | Original99/I4-83/I5-124/I6-727 hashes matched;77-file allowlist and credential-pattern checks passed; index empty |
| AC10 reviewed/release-ready | Candidate ready for student/friend review | Actual peer/release approval and teacher submission gates remain pending |

No GitHub checklist is marked complete by this file. Evidence does not authorize staging, publication or a main merge.
