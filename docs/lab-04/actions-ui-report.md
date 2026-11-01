# I3 Actions Taken UI implementation report

Prepared 2026-10-31 (Asia/Bangkok). Branch `feature/lab4-actions-ui`, base/starting HEAD `787a86fd88dbd1bf614842a106eaf2c0011befea` (`lab4-staging`, merged I2 PR #61). GitHub #62 is the Actions Taken UI issue; it was closed at inspection and was not modified.

Status: ready for the designated peer review of Issue #62. Fresh development browser, responsive/keyboard and regression verification passed; results and remaining review obligations are recorded below. This is not peer approval, merge authorization or completion of the whole lab. I2's user-reported 157 passes remain historical backend evidence, not a newly executed I3 result.

## 1. Implemented behavior and approved boundary

The existing Ticket Detail now contains a scoped Actions Taken component alongside attachments and Public Comments/Internal Notes. Requesters see all current action statuses on their owned Tickets without action writes or private history. Staff/Admin have create, view, edit, reassignment, start, complete, cancellation and immutable action-revision views. The API remains authoritative.

Inputs follow the approved UTF-16/trim/required/conditional limits. Creation starts Planned. Completion requires Result and eligible assignee; performer is recorded by the backend. Completed corrections preserve assignment/performer/times. Cancelled actions and terminal Tickets retain readable content with prohibited controls disabled/absent. Ineligible historical assignees remain visible; cancellation does not depend on active staff lookup, and completed content correction does not require the historical assignee to remain active. Attachment Notes render as plain text, without upload/automatic links. Dates explicitly use Asia/Bangkok; server ordering and pagination remain unchanged.

Both optimistic versions are retained while editing. A 409 keeps the draft, requires explicit refresh/comparison and explicit acknowledgement before a later manual save. Obsolete lifecycle operations remain blocked after refresh. Busy-state plus a synchronous submission guard prevents duplicate clicks. Ambiguous creation keeps its exact UUID and payload, locks the draft, and retries the original request; authoritative GET follows success/replay. Recoverable errors preserve input; authentication/authorization failure clears protected data and uses the existing login/initial-password gate. Background refresh does not unmount discussion drafts.

**Explicit student approval:** only `GET /api/staff/tickets` adds ADMINISTRATOR to its existing role middleware. The staff-specific detail GET and Ticket assign/priority/status PATCH middleware are unchanged. Admin navigation reuses the queue and the existing generic Ticket Detail GET, which already authorizes Admin reads. All action permissions come from merged I2. This prerequisite and its reason are documented in api-spec.md. The changed old queue assertion follows that approval; new tests retain denied requester/anonymous/inactive/password-gated access and deny all three Admin Ticket writes.

No schema, migration, seed, authentication middleware, Ticket transition/gate/cascade, Ticket event-history endpoint, dashboard or Issue #4 functionality was changed. No dependencies were added.

## 2. Exact I3 source/document allowlist (25 files)

Modified:

1. `client/src/App.tsx`
2. `client/src/api.ts`
3. `client/tests/lab-02/AttachmentSection.test.tsx`
4. `client/tests/lab-02/RequesterTicketDetail.test.tsx`
5. `client/tests/lab-03/AdminUserManagement.test.tsx`
6. `client/tests/lab-03/RequesterResolution.test.tsx`
7. `client/tests/lab-03/StaffWorkflow.test.tsx`
8. `server/src/staff/staff.routes.ts`
9. `server/tests/lab-03/staff-queue.api.test.ts`
10. `docs/lab-04/api-spec.md`
11. `docs/lab-04/tests.md`

Created:

12. `client/src/ActionsTaken.tsx`
13. `client/src/ActionsTaken.css`
14. `client/src/actions-taken.rules.ts`
15. `client/tests/lab-04/ActionsTaken.test.tsx`
16. `client/tests/lab-04/ActionsTakenApi.test.tsx`
17. `client/tests/lab-04/ActionsTakenRules.test.tsx`
18. `client/tests/lab-04/ActionsTakenIntegration.test.tsx`
19. `client/tests/lab-04/fixtures.ts`
20. `server/tests/lab-04/actions-ui-access.unit.test.ts`
21. `server/tests/lab-04/actions-ui-harness.unit.test.ts`
22. `e2e/lab-04/actions-taken-flow.spec.ts`
23. `e2e/lab-04/fixtures.ts`
24. `e2e/lab-04/test-server.ts`
25. `docs/lab-04/actions-ui-report.md`

Earlier component tests only receive empty-action mocks needed by the new mounted section. The old Admin-shell assertion now expects approved queue navigation; its logout and account safeguards remain asserted. The old database queue suite adds Admin-read and denied-write/preservation assertions, but has not been run here because its existing fixture uses default database configuration.

### 2.1 Required screenshot evidence selected for this PR (9 files)

PDF section 12 requires Actions Taken screenshot evidence. Include only these reviewed captures under `artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/`, in addition to the 25 files above: **34 files total**. The remaining generated screenshots, browser scripts, raw results, fixture manifests and all `test-results/` files stay local and uncommitted.

| Device | Editor and visible keyboard focus | Expanded shared action | Private immutable revision history |
|---|---|---|---|
| Desktop | [desktop-keyboard-editor.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/desktop-keyboard-editor.png) | [desktop-labelled-action-record.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/desktop-labelled-action-record.png) | [desktop-history-panel.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/desktop-history-panel.png) |
| Tablet | [tablet-keyboard-editor.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/tablet-keyboard-editor.png) | [tablet-labelled-action-record.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/tablet-labelled-action-record.png) | [tablet-history-panel.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/tablet-history-panel.png) |
| Mobile | [mobile-keyboard-editor.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/mobile-keyboard-editor.png) | [mobile-labelled-action-record.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/mobile-labelled-action-record.png) | [mobile-history-panel.png](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/mobile-history-panel.png) |

## 3. Current verification results (2026-10-31, Asia/Bangkok)

The user authorized safe fixture writes to the verified TokTickIT **development** database on host port **5433** after signing in again. This is a separately approved development smoke check, not execution of the isolated E2E helper against development. That helper was not changed or invoked. BankCore (3000/5432) and the isolated Lab 4 cluster (55432) were not connected to or modified. No environment file, existing password, activation/role setting or authentication middleware changed. No migration was repeated.

| Command (repository root) | Actual result |
|---|---|
| `npm.cmd --prefix client test -- --run tests/lab-04` | Initial fresh run: **87 passed, 1 failed, 4 files**. Administrator integration could lose an immediate queue selection to the delayed role-landing effect. After the source fix: **88 passed, 4 files, 0 failed/skipped** (38 component, 23 adapter, 25 rules, 2 application integration). |
| `npm.cmd --prefix client test -- --run tests/lab-04/ActionsTakenIntegration.test.tsx` | **2 passed, 1 file**, a diagnostic rerun before the fix; not used to dismiss the intermittent failure. |
| `npm.cmd --prefix client test -- --run` | **213 passed, 19 files, 0 failed/skipped**, after the fix. Includes the 88 I3 cases; do not add the subset again. Existing Labs 1–3 frontend regressions are included. |
| `npm.cmd --prefix server test -- --run tests/lab-04/actions-ui-access.unit.test.ts tests/lab-04/actions-ui-harness.unit.test.ts tests/lab-04/rules.unit.test.ts tests/lab-01/health.test.ts` | **72 passed, 4 files, 0 failed/skipped**: 12 real middleware/queue tests with mocked DB, 7 rejected subprocess guards that cannot reach a database, 52 pure action/seed-eligibility rules, 1 health check. Not a full backend DB regression. |
| `npm.cmd --prefix client run build` | Passed TypeScript and Vite production build, 39 modules. |
| `node.exe server/node_modules/typescript/bin/tsc --project server/tsconfig.json --noEmit` | Passed. |
| `git diff --check` | Passed after the final documentation update; only normalization notices for the two pre-existing unrelated files. |
| `node.exe artifacts/lab-04/dev-i3-b3695c26/verify.cjs` | Final run: **9 live development browser scenarios passed, 0 failed/skipped**, sequentially across desktop Chromium 1280×720, iPad Mini WebKit 768×1024, Pixel 7 Chromium 412×839. |
| `node.exe artifacts/lab-04/dev-i3-b3695c26/inspect.cjs` | **3 device keyboard/visual checks passed, 0 failed/skipped**, read-only. Also verified requester cross-owner action GET returns 404. |

The three live scenarios per device cover (1) queue/detail/lifecycle/requester/history, (2) loading, safe errors and two-editor conflict, and (3) offline creation/retry/persistence. These **nine development scenarios are distinct from** the repository's isolated `e2e/lab-04/actions-taken-flow.spec.ts` cases. The user previously reported all nine isolated cases passed; per-device screenshots and passing `test-results/.last-run.json` corroborate some evidence, but are not a complete fresh transcript. That historical result and I2's 157 user-reported backend passes are not counted as new execution. The older `artifacts/lab-04/r-9a351a5d/results.json` is earlier failed-run evidence and remains preserved.

The first development attempt passed desktop lifecycle/privacy/history, then failed the simulated-error assertion: Strict Mode could consume a one-request injected 500 in an abandoned mount request. Holding the controlled failure until explicit removal before retry fixed the verification script; no product assertion was weakened. Its `results-b6bceac2.json` records **1 passed, 1 failed; remaining scenarios not executed**, not counted as skips. The complete rerun reused the same fixture and passed all nine. Actual lifecycle/conflict/replay responses were not mocked; only loading timing and the explicit recoverable 500 were controlled. Offline mode caused an actual transport failure.

The sole product correction during this final verification is in `client/src/App.tsx`: role landing uses a layout effect so it settles before navigation is interactive. A passive effect could overwrite a queue click immediately after restored authentication. Existing navigation assertions passed in the focused and full suites after the fix. No role permission changed.

## 4. Live evidence and preservation

- Local-only raw evidence, excluded from this PR: `artifacts/lab-04/dev-i3-b3695c26/results-1d56e6f4.json` and `keyboard-results.json` in the same directory. Their outcomes are transcribed in section 3; the temporary development verification scripts are also excluded. The maintained reproducible browser suite is `e2e/lab-04/actions-taken-flow.spec.ts`, subject to its separate isolated-database approval and fail-closed guards.
- Captures: [committed Actions Taken evidence](../../artifacts/lab-04/screenshots/actions-taken/dev-b3695c26-808221f5/). The local run produced **36 state screenshots** plus **9 element captures**; only the nine reviewed element captures in section 2.1 are selected for this PR. Editors, expanded records and history on all three profiles were visually reviewed; the earlier desktop queue review is local-only. Labels, wrapping, status text, focus rings and mobile stacking are readable. This is I3 evidence, not final-PDF rendering approval.
- Existing frontend 5173/API 3001 were used. Private URL guards pin localhost/5433/toktickit/public; PostgreSQL 16.14 identity was matched to the existing TokTickIT Docker container's host 5433 mapping. Its internal PostgreSQL port 5432 is not a connection to BankCore's host port 5432.
- Authenticated queue GET returned **200**. The original 15 Tickets remain, plus one synthetic Ticket. Detail, staff options, action list/history, normal fixture requester login and owned requester detail worked against the live API.
- New fixture: requester ID **2566**, Ticket **I3-VERIFY-C2D158F6** (ID **430**). Its generated password stayed private; no existing account's password, role, activation or password gate changed. A normal login created only the fixture's session. The real staff session was reused without login/logout or password changes.
- All writes were confined to the new fixture and its child records. Across the partial attempt and complete rerun it retains **15 actions, 43 revisions and 15 creation replay receipts**. No cleanup/deletion was performed. It remains OPEN and clearly labelled for peer inspection; subsequent cleanup/deactivation requires separate approval.
- Before/after counts and SHA-256 row-content comparisons verified **every pre-existing row unchanged**: users/password hashes, sessions, Tickets, attachments, comments, notes, existing action records and migration history. Only this fixture/children were excluded from rerun comparisons. Ticket ownership remained unchanged while action assignments changed.
- The previously approved `20261029090000_actions_taken` remains applied; password-repair remains pending. No migration, seed, backup, restore, reset or permission change ran in this verification.
- Final workspace hash comparison covered all **72 initially modified/untracked files**: only App.tsx and these two authorized verification documents changed. All unrelated files retained identical content. Existing Playwright configuration, test-results, duplicate client trees, cookies and utilities remain outside the I3 source allowlist. New scripts, fixture manifest, JSON and screenshots are evidence artifacts, not application-source additions.

## 5. Acceptance traceability and limits

| Handout / approved criterion | Actual I3 evidence |
|---|---|
| PDF sections 3/4/8.3, Part 6; AC-02/04/05 | On each profile: create Planned, edit/reassign, start, required Result, complete, completed correction with frozen assignment/performer/time, reason-required cancellation and retained record. Conditional follow-up and plain-text attachment references checked. Inactive/historical eligibility and terminal locks are covered by component/rule tests and prior user-reported isolated E2E; existing development accounts were not deactivated to repeat them. |
| PDF roles/Part 6; AC-06 | Requester owner sees completed/cancelled shared content without mutation/history controls or Internal Notes. Real requester POST/PATCH/history GET denied 403; cross-owner list denied 404. Staff/Admin read and denied Admin Ticket writes passed mocked-DB middleware/application tests. Fresh development browsers used Staff/requester, not an Admin login. |
| PDF ordering/attribution/Part 7 contribution; AC-07/08 | Distinct creator/assignee/performer and Bangkok times. Five sequential revisions per completed/corrected action; original revision unchanged. Rejected completed reassignment and exact creation replay left history/counts unchanged. Ticket status-event UI remains I4. |
| PDF sections 6.1/8.5; AC-16/17/18 action contribution | Real two-editor 409 retained draft, disabled save, required refresh/comparison/explicit reapply and persisted the reviewed content. Offline original-request retry and exact receipt replay created no duplicates/revisions. Controlled loading and 500 recovered through explicit retry. Component/adapter tests cover malformed responses, other HTTP failures, access loss, busy guards and abandoned reads. |
| PDF sections 7/8.6; I3 contribution to AC-23/24/25 | Three browser/device profiles; all action modes without page overflow/clipped controls. Reviewed captures; nine labelled editor controls reached by keyboard with visible focus per profile; open/close/return focus, details/history keyboard operation and cancellation focus checked. Not WCAG certification, screen-reader assessment or completion of I6's whole-application checklist. |
| PDF sections 10/12/14 | Required component/E2E sources exist; commands, truthful results and real evidence are retained under the prescribed actions-taken folder. Final-main tests, whole-backend DB regression and final PDF remain later release obligations. |

No remaining blocking Issue #3 code defect was identified. The **25-file source/document allowlist in section 2 is unchanged** and all entries belong to this issue. The nine reviewed screenshots in section 2.1 are the only additional files selected as required submission evidence. Never stage the artifact directory wholesale.

## 6. Peer review handoff

**Ready for the designated friend's peer review of Issue #62.** Ready to assess does not mean peer-approved, merged or the whole lab complete. Review the 25 files, startup navigation fix, narrow Administrator queue GET change (Ticket writes still restricted), requester/private-history boundaries, stale review/retry and evidence. The reviewer should record their own visual/keyboard judgement and approval; neither has been fabricated here.

No new migration or test-cluster setup is needed. Do not rerun isolated tests merely to repeat the historical user-reported pass. The user authorized scoped staging, commit, feature-branch push and PR preparation on 2026-11-01; peer approval and merge remain pending. No Issue #4 work or main/lab4-staging mutation is part of this PR.

## 7. Publication preflight (2026-11-01, Asia/Bangkok)

Remote `lab4-staging` and the feature branch's starting HEAD both resolve to `787a86fd88dbd1bf614842a106eaf2c0011befea`. Issue #2 commit `9bb4cdc` and merged PR #61 are already ancestors of the target, including the action APIs and additive migration. The 34-file publication scope adds Issue #3 only. The backend permission diff is limited to the approved Administrator queue GET; no authentication/password-management change is included.

Fresh final commands: `npm.cmd --prefix client test -- --run` passed **213 tests / 19 files / 0 failures/skips**; the four-file database-independent server command in section 3 passed **72 tests / 0 failures/skips**; `npm.cmd --prefix client run build` passed; server TypeScript noEmit and the separate strict E2E TypeScript check passed. `git diff --check` is checked again before committing. Browser/database evidence above remains attributed to its earlier execution; no database connection, migration, seed, database-dependent test or browser/database rerun occurred during publication preparation.

GitHub CLI was absent from PATH and standard installation locations, so authentication could not be checked through `gh`. After the approved feature push, use the manual compare link supplied in the handoff with base `lab4-staging` and head `feature/lab4-actions-ui`. Do not merge before the designated peer's approval and required checks.
