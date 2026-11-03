# I4 Ticket Lifecycle & Resolution Workflow implementation report

Prepared 2026-11-01 (Asia/Bangkok). GitHub [#64](https://github.com/thit3455/toktickit/issues/64), Lab 4 Issue #4. Feature branch `feature/lab4-ticket-lifecycle`; base `origin/lab4-staging` / `d5b0c9fda4e028556c6143ccd349880cf891802e`, which includes merged I3 PR #63 and I2 PR #61.

Status: **Ready for Issue #64 peer review. Live Administrator, Staff and Requester checks now pass; historical suite results and the recovery skip remain explicitly attributed. Separate Lab 3 password-reuse validation is proposed, not implemented.** No commit, push, PR, merge or issue closure has been performed.

## 1. Sources and approved permissions

The complete eleven-page `SE+Lab+4.pdf` in the student's Downloads folder was read, alongside the approved Lab 4 specification, API/UI specifications, test plan, earlier authentication/Ticket requirements, existing I2/I3 implementations and actual GitHub #64. The six issue acceptance criteria are mapped below. Lab 4 I4 is not literal GitHub issue #4.

**Explicit student clarification:** implement BR-10 and API section 7 for Staff AND Administrator Ticket transitions, explicit assignment and IT Priority. This deliberately supersedes the I3-only Administrator queue-read prerequisite. It does not change account-management authorization, Requester ownership, Internal Notes privacy or Action permissions. Administrator role alone is not an eligible IT_STAFF owner, and implicit Administrator self-claim is rejected. Earlier tests denying every Administrator Ticket write were updated to the approved I4 contract, with positive scoped-write and negative authorization tests.

The approved contract's exact error precedence is implemented; the PDF does not prescribe these HTTP distinctions. No new resolution fields or lifecycle policy were invented. Resolution evidence remains the existing completed action Result and reviewed follow-up.

## 2. Implementation and acceptance traceability

| Issue criterion | Implementation and verification | Result |
|---|---|---|
| AC-01 Transition matrix | Pure matrix/rules plus server-authoritative current destinations; 64 pairs for each of Staff/Admin in real API tests, parser/no-op/stale/invalid/reason precedence cases; matching UI choices. | Automated PASS; live Staff/Admin transitions PASS |
| AC-02 Resolution gate | Transactionally recheck all four predicates before RESOLVED and CLOSED. Missing/inactive/non-staff owner, empty/blank/completed/cancelled evidence, pending work and follow-up tested. UI names blockers and disables gate-dependent choices. | Automated PASS; live Staff/Admin rejection PASS |
| AC-03 Cancellation cascade | One Serializable transaction advances parent version/status, cancels only Planned/In Progress actions, increments their versions, appends STATUS revisions and one Ticket event with matching time/reason. Empty/mixed fixtures, forced child-revision/event failures and completion races tested; completed/already-cancelled records retained. | Automated PASS; live Staff cascade PASS |
| AC-04 Status history | New staff/Admin-only paginated GET, deterministic createdAt/id order, recorded actor name/role, Bangkok display, empty legacy explanation. No edit/delete routes. Failed/no-op requests append nothing; ordering/attribution/privacy verified. | Automated PASS; live Staff/Admin history and Requester denial PASS |
| AC-05 Concurrency | Reuse Ticket.version and I2 Serializable/P2034 retry helper, preserving original client expectations for all attempts. CAS across status/assignment/priority/actions/first indication; real competing writes, resolution versus action creation, cancellation versus completion and retry exhaustion. UI retains draft, explicitly refreshes/compares and requires acknowledgement before manual reapplication. | Automated PASS; live Staff conflict/review PASS |
| AC-06 Terminal restrictions | CANCELLED has no status destination. RESOLVED/CLOSED only permit matrix destinations; all three block Action mutations through existing I2 checks. Existing readable content survives. Versioned Ticket owner/IT Priority maintenance remains allowed as explicitly specified by API section 7. | Automated PASS; live Staff writes/Admin UI restrictions PASS |

Approved-document mapping: FR-04/05/06/09, BR-07–16, specification AC-07–12/16, API sections 5/7, UI sections 3–6, tests WF-01–07/CON-01/UI-03/E2E-02. Relevant earlier creation/attachments/comments/notes/authentication/account safeguards are covered by regression tests.

### Complete Ticket matrix

| Current status | Permitted destinations |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

All other different-status transitions fail. A structurally valid stale version returns 409 STALE_UPDATE before equality/matrix checks. A fresh same-status request returns 400 NO_CHANGES with no event/version change; fresh unlisted destination returns 409 INVALID_TRANSITION. Structural errors precede transactional version checks; permitted cancellation/reopening requires a trimmed 1–500 UTF-16-unit reason before gate/write.

### Resolution, cancellation and history

Resolution/closure require: active IT_STAFF Ticket Owner; at least one COMPLETED action with nonblank Result; no PLANNED/IN_PROGRESS actions; no non-cancelled follow-up flag. Cancelled actions neither satisfy nor block the gate. Existing legacy Resolved Tickets lacking evidence must reopen, record work and resolve before closing.

Cancellation retains creation/assignment/performer/evidence/history; unfinished actions receive the same reason/time as their Ticket cancellation. Any failure rolls back all parent/child/version/history writes. Reopening preserves completed evidence, follow-up and the first requester indication. No new-action-per-reopen rule is added.

History is private operational audit data, not a shared comment. Actor snapshots survive later account-name/role changes. It is append-only through application APIs; no database-trigger immutability claim is made.

### Role matrix

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Ticket/current Action read | Owned Tickets only | All operational Tickets | All operational Tickets |
| Formal status/gate/cancel/reopen | Denied | Approved matrix/version/reason/gate | Same scoped rules |
| Claim as self | Denied | Eligible IT_STAFF; no overwrite | Denied; explicit eligible owner required |
| Explicit owner/IT Priority | Denied | Eligible owner/version rules | Same rules |
| Ticket event / Action revision history | Denied | Read only | Read only |
| Problem Appears Resolved | Owned, advisory/idempotent | Denied | Denied |
| Internal Notes | Denied | Existing permissions | Existing permissions |

Inactive, expired/invalid-session and initial-password accounts retain their existing restrictions; operational writes revalidate actor eligibility transactionally. The first requester indication advances Ticket version once without any status event. Repeated indications retain the first timestamp/version; after reopening the UI labels the indication historical.

## 3. Frontend integration

`TicketWorkflow` replaces the old destination-only inline controls in existing Detail. It uses existing Zen Green cards/buttons and current-user navigation, named loading/retry/error/success states, eligible staff selection, inline required reasons, explicit cancellation confirmation, read-only explanations and private paginated history. Recovery from 409 preserves the original draft/version until deliberate review. Duplicate submits are synchronously guarded.

Workflow changes refresh Action list/version metadata; Action changes refresh gate/destinations without unmounting Public Comment/Internal Note drafts. Requester UI remains advisory/read-only. Focus goes to the first invalid input and returns to the initiating control on cancelling the editor; success is announced. Desktop, iPad Mini and Pixel 7 layouts wrap controls without horizontal page overflow.

## 4. Database and environment safety

**No I4 schema or migration file was needed or created.** I2 already supplies Ticket.version and TicketStatusEvent plus action revisions. No persistent migration status was changed or inferred from these test runs.

The user approved a newly owned disposable PostgreSQL 18 Docker container, published only on 127.0.0.1 at Docker-assigned port 54578. Its dedicated database was `toktickit_lab4_test_i4_354acb0d6bc3`; runtime identity/version/permissions/emptiness were verified before fixtures. Random credentials stayed in process memory/child environments, never command arguments or environment files. Tests used restricted non-superuser, NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS roles with CONNECT/CREATE/TEMPORARY only. A second temporary restricted role supported the broad legacy regression wrapper; both roles exist only in the owned container.

The repository helper creates a random `lab4_<uuid>` schema with CREATE (no reuse), replays existing migrations there and drops only that invocation-owned schema. Broad earlier suites received an explicit disposable bootstrap schema through DATABASE_URL, plus four synthetic category rows and one RelatedSystem; suites requiring additional schemas remained inside the same owned database. The real seed-repeatability tests invoked seeds only inside their own disposable schema. Post-run schema cleanup was checked. The first container was removed after its verified tests. A fresh replacement, `toktickit-i4-c7e53a3fa92b`, database `toktickit_lab4_test_i4_c7e53a3fa92b`, published only on 127.0.0.1:51826, was separately verified under the same approval for the remaining legacy browser regression. The same strict guard/restricted runner applies; it is not the existing port-55432 cluster. Both instances were removed after verified cleanup. A final newly owned instance, toktickit-i4-69bab49ff648 / toktickit_lab4_test_i4_69bab49ff648 at 127.0.0.1:59149, verified the last explicit owner-change/history-snapshot assertions and full-server rerun. No existing cluster was reused. All three owned containers were removed after testing; read-only verification found no leftover user schemas in the last instance before removal.

I4 browser startup requires explicit I4 approval, exact expected random database/port, loopback, the dedicated restricted runner, PostgreSQL major 18, database privileges and no existing user tables. It rejects 5432/5433/55432 and unsupported routing options before schema creation. There is no project DATABASE_URL or .env fallback. Child API uses an ephemeral loopback port; Vite uses localhost:5174 strictPort. Existing services on 3000/3001/5173 and PostgreSQL 5432/5433/55432 were neither stopped nor modified.

Database backup/restore was not run for I4: the single recovery test remains explicitly skipped without a separate LAB4_RECOVERY_DATABASE_URL. I2's earlier user-reported recovery evidence remains historical. Existing migration preservation did run freshly in an owned schema; this does not imply development migrations were applied.

## 5. Actual execution

Counts below overlap; do not sum targeted checks and full suites as independent tests.

| Check | Actual result |
|---|---|
| New workflow rules | 103 passed |
| New workflow API file | 178 passed (174 database-backed, 4 anonymous transport) |
| Workflow + existing Actions Taken API run after route correction | 245 passed, 2 files, 0 skipped/failed |
| Targeted database-independent rules/tools/access/harness checks | 201 passed, 5 files |
| Affected Requester/queue backend rerun | 56 passed, 2 files |
| Final complete server suite | 632 passed / 23 files, 0 failed; 1 backup/restore test skipped |
| Full frontend suite | 263 passed, 21 files, 0 failed/skipped |
| Final lifecycle Playwright suite | 15 passed across desktop/tablet/mobile (five lifecycle/keyboard scenarios × three profiles) |
| Additional Action/staff/queue browser regression | 15 passed: 12 real API-backed, 3 mocked queue layout; 0 failures/skips |
| Client, server and changed E2E TypeScript --noEmit | Passed after source/test changes |
| Client production build | Passed (42 modules); Vite output generated only in ignored build directory |
| git diff --check | Passed after source/test changes; final documentation check passed |

Exact executed commands (package-relative unless noted):

```powershell
# server — approved private LAB4_TEST_DATABASE_URL targeted only at the owned Docker database
npm.cmd test -- --run tests/lab-04/ticket-workflow.rules.unit.test.ts
npm.cmd test -- --run tests/lab-04/ticket-workflow.api.test.ts --no-file-parallelism
npm.cmd test -- --run tests/lab-04/ticket-workflow.api.test.ts tests/lab-04/actions-taken.api.test.ts --no-file-parallelism
npm.cmd test -- --run tests/lab-04/ticket-workflow-harness.unit.test.ts tests/lab-04/ticket-workflow.rules.unit.test.ts tests/lab-04/actions-ui-access.unit.test.ts tests/lab-04/rules.unit.test.ts tests/lab-04/database-tools.unit.test.ts --no-file-parallelism --reporter=dot

# root — local non-submission wrapper supplied guarded private URLs/owned bootstrap schema
node --import ./server/node_modules/tsx/dist/loader.mjs artifacts/lab-04/i4-local/regression-runner.ts tests/lab-03/requester.api.test.ts tests/lab-03/staff-queue.api.test.ts
node --import ./server/node_modules/tsx/dist/loader.mjs artifacts/lab-04/i4-local/regression-runner.ts
# Wrapper invokes the actual server test script's Vitest entry point:
# node node_modules/vitest/vitest.mjs run [selected files] --no-file-parallelism --reporter=dot

# root — additional guarded browser regression; same three profiles, one worker
node node_modules/@playwright/test/cli.js test e2e/lab-04/actions-taken-flow.spec.ts e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/staff-queue.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --output=artifacts/lab-04/i4-local/legacy-browser --reporter=line
npm.cmd --prefix server test -- --run tests/lab-04/ticket-workflow-harness.unit.test.ts --reporter=dot

# client
npm.cmd test -- --run tests/lab-04/TicketWorkflow.test.tsx
npm.cmd test -- --run tests/lab-04/TicketWorkflow.test.tsx tests/lab-04/ActionsTakenIntegration.test.tsx tests/lab-03/StaffWorkflow.test.tsx --reporter=dot
npm.cmd test -- --run tests/lab-03/StaffWorkflow.test.tsx --reporter=dot
npm.cmd test -- --reporter=dot
npm.cmd run build

# root — browser environment privately supplied by approved owned-container controller
node node_modules/@playwright/test/cli.js test e2e/lab-04/ticket-resolution.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --output=artifacts/lab-04/i4-local/browser --reporter=line
node client/node_modules/typescript/bin/tsc --noEmit -p client/tsconfig.json
node server/node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json
git diff --check
```

Do not run legacy full-server tests with a development DATABASE_URL. A future reviewer must independently approve/configure a disposable environment matching the I4 guard and use the helper; do not reuse a removed container or assume persistent test credentials exist.

### Failures discovered and resolved

The initial frontend regression run failed on obsolete UI/permission expectations and a duplicate sibling React key; the key and test adapters were corrected. New component tests initially used the wrong jest-dom focus matcher, corrected to toHaveFocus. A new adapter test was renamed to .test.tsx to match the actual frontend include glob; its 23 cases are included in the final 263.

The combined API regression caught an overly broad Detail refactor that removed legacy creation/attachment routes. Those routes were restored unchanged, then all 245 API cases passed; broad legacy creation/attachment tests also ran. The first broad backend run recorded 626 passes, four failures and one skipped recovery case: three obsolete Admin-denial assertions and failure injection at the old nontransactional requester delegate. The affected 56-case rerun passed after adapting to the approved permissions/transaction boundary. A subsequent full run passed 630 cases with one recovery skip; after adding explicit owner-deactivation/demotion races and historical actor-rename/role assertions, the final full run passed 632 cases with the same single recovery skip. No production code changed in that final assertion extension.

The older real staff browser fixture now uses the guarded I4 harness (NEW/unassigned fixture), replacing its development .env/direct-Prisma setup and persistent-record cleanup. The mocked queue fixture supplies the additive workflow DTO; this remains a mocked API layout test, not live authentication evidence. I3 Action E2E retains its original strict target by default and selects the explicitly approved I4 Docker harness only when LAB4_I4_E2E_APPROVED=1. Its former Admin-write denial asserts rejection of malformed unversioned payloads; real positive writes are verified by I4. The regression run initially recorded 11 passes and 4 failures: three missing API-address persistence checks in the rewritten staff test, plus one tablet interaction before the new workflow panel settled. The API address and readiness wait were corrected, then all fifteen cases passed; no assertions were removed.

The first browser run recorded nine passes and three timeouts: a one-shot simulated history failure was consumed by React's aborted initial request. Error injection now remains until the retry UI is asserted, then is removed before retrying the real API; the subsequent twelve-case run passed. No failing business-rule assertion was removed or converted into a skip.

Early static invocations used incorrect working-directory-relative executable paths and failed MODULE_NOT_FOUND; corrected package-specific commands from repository root subsequently passed. The separate changed-E2E static check first needed an explicit server typeRoots and then exposed missing apiUrl type annotations; those were corrected without runtime changes and the check passed. Historical I2/I3 results were not substituted for fresh runs.

## 6. Evidence and remaining limits

Six selected final screenshots were copied into `artifacts/lab-04/screenshots/actions-taken/`, preserving desktop transition/history/cancellation/conflict and tablet/mobile readability. Evidence filenames: `i4-desktop-resolution-history.png`, `i4-desktop-cancellation.png`, `i4-desktop-conflict-review.png`, `i4-tablet-resolution-history.png`, `i4-mobile-cancellation.png`, `i4-mobile-conflict-review.png`. Browser artifacts under `artifacts/lab-04/i4-local/` are temporary, excluded from the intended commit. Failure traces/screenshots were captured on actual failed runs; raw traces and fixture credentials/cookies are not submission files.

Browser checks use Chromium-based repository projects: Desktop Chrome 1280x720, iPad Mini 768x1024 and Pixel 7 393x727 (device scaling retained). Full-page screenshots may have higher pixel dimensions. Responsive checks verify no horizontal page overflow and named controls; keyboard/focus checks and mocked component failures supplement real API tests. This is not a claim of a complete automated accessibility audit, Firefox/WebKit coverage, performance verification or final-main evidence.

I5 dashboards, I6 lab-wide regression/accessibility/performance and I7 final PDF/release remain separate. No changes to those issues or global completion checklists are claimed. Peer approval, publishing steps and merge still require student authorization.

## 7. Exact intended commit scope

**38 files: 32 source/test/document files and 6 selected screenshots.** Nothing is staged. Exclude all `artifacts/lab-04/i4-local/`, node_modules junctions, build outputs, environment files and unrelated original-worktree files.

1. `artifacts/lab-04/screenshots/actions-taken/i4-desktop-cancellation.png`
2. `artifacts/lab-04/screenshots/actions-taken/i4-desktop-conflict-review.png`
3. `artifacts/lab-04/screenshots/actions-taken/i4-desktop-resolution-history.png`
4. `artifacts/lab-04/screenshots/actions-taken/i4-mobile-cancellation.png`
5. `artifacts/lab-04/screenshots/actions-taken/i4-mobile-conflict-review.png`
6. `artifacts/lab-04/screenshots/actions-taken/i4-tablet-resolution-history.png`
7. `client/src/ActionsTaken.tsx`
8. `client/src/api.ts`
9. `client/src/App.tsx`
10. `client/src/ticket-workflow.api.ts`
11. `client/src/TicketWorkflow.css`
12. `client/src/TicketWorkflow.tsx`
13. `client/tests/lab-03/StaffWorkflow.test.tsx`
14. `client/tests/lab-04/ActionsTakenIntegration.test.tsx`
15. `client/tests/lab-04/TicketWorkflow.test.tsx`
16. `client/tests/lab-04/TicketWorkflowApi.test.tsx`
17. `client/tests/lab-04/workflow-fixtures.ts`
18. `docs/lab-04/api-spec.md`
19. `docs/lab-04/tests.md`
20. `docs/lab-04/ticket-workflow-report.md`
21. `e2e/lab-03/staff-queue.spec.ts`
22. `e2e/lab-03/staff-ticket-flow.spec.ts`
23. `e2e/lab-04/actions-taken-flow.spec.ts`
24. `e2e/lab-04/ticket-resolution.spec.ts`
25. `e2e/lab-04/workflow-fixtures.ts`
26. `e2e/lab-04/workflow-test-server.ts`
27. `server/src/app.ts`
28. `server/src/staff/staff.routes.ts`
29. `server/src/workflow/ticket-workflow.routes.ts`
30. `server/src/workflow/ticket-workflow.rules.ts`
31. `server/src/workflow/ticket-workflow.service.ts`
32. `server/tests/lab-03/requester.api.test.ts`
33. `server/tests/lab-03/staff.api.test.ts`
34. `server/tests/lab-03/staff-queue.api.test.ts`
35. `server/tests/lab-04/actions-ui-access.unit.test.ts`
36. `server/tests/lab-04/ticket-workflow.api.test.ts`
37. `server/tests/lab-04/ticket-workflow.rules.unit.test.ts`
38. `server/tests/lab-04/ticket-workflow-harness.unit.test.ts`

The original `toktickit` workspace remains on `feature/lab4-actions-ui`; all 99 recorded pre-existing modified/untracked files passed SHA-256 comparison (zero changed/missing). Implementation is in sibling worktree `toktickit-lab4-ticket-lifecycle`. Neither main nor lab4-staging moved.

## 8. Proposed peer-review PR

Base lab4-staging; head feature/lab4-ticket-lifecycle. Related GitHub #64. Proposed title: Lab 4 Issue #4 ? Ticket Lifecycle & Resolution Workflow. No PR creation, staging, commit, push, merge or issue closure is authorized by this report.

Implements the approved Ticket matrix, four-condition resolve/close gate, transactional cancellation cascade, private append-only status history and optimistic concurrency. Staff/Admin owner, priority and status operations share Ticket.version with Actions. Detail preserves conflict drafts and refreshes gate/Action metadata together. Requester ownership and advisory indication remain intact. Administrator Ticket operations follow the student's explicit I4 BR-10/API-section-7 approval, superseding I3's queue-read-only prerequisite.

Validation: historical complete results are 632 server passes with one disclosed recovery skip, 263 frontend passes, 30 browser passes, TypeScript/build and whitespace checks. Current live evidence adds eight passing Administrator groups and seven distinct Staff/Requester/preservation groups across documented attempts; the initial local-helper legacy-error assertion failure and affected rerun remain recorded. The mandatory Administrator gate was observed before the student's normal password change; saved false flag, valid session and subsequent application access were verified afterward.

No new I4 migration/schema is required. Automated database writes used approved owned Docker databases. Separate live writes were confined to approved development I4-VERIFY fixtures; explicitly approved Administrator recovery/flag operations are documented independently from the source implementation. BankCore and port-55432 databases were not touched. Local credential-free helpers/raw evidence are excluded from the 38-file allowlist. The pre-existing Lab 3 password-reuse finding remains disclosed for a separately approved follow-up.

Peer reviewer checklist:

- [ ] Review all six Issue #64 criteria, matrix, gate, reason/error precedence and concurrency.
- [ ] Review explicit Administrator scope and Requester/private-history restrictions.
- [ ] Inspect cancellation/rollback and preserved completed/legacy records.
- [ ] Inspect desktop/tablet/mobile, keyboard, conflict and current-role evidence.
- [ ] Review the separate Lab 3 password-reuse finding and disclosed recovery skip.
- [ ] Verify the exact 38-file allowlist; exclude local helpers, credentials and raw artifacts.
- [ ] Obtain the designated peer's approval and required PR checks before any merge to lab4-staging. No direct main merge.

## 9. Live development verification — 2026-11-02 (Asia/Bangkok)

**Historical November 2 status: Staff workflow verified live; Requester/Administrator live permission checks were still pending. Section 10 records their subsequent observed coverage and resolves this earlier blocker.**

### Running application and original cause

The original localhost:5173 Vite process (PID 31524) served `toktickit/client`, with the I3 "IT Staff Actions" panel, and called the old API on localhost:3001 (PID 9356). Its served frontend lacked TicketWorkflow and its backend history route returned 404. The I4 implementation was in the separate worktree, so those missing controls were a running-version mismatch.

During the November 2 check, the correct I4 application ran at **http://localhost:5174**, calling **http://localhost:3002**, owned preview PID **19220**, from `toktickit-lab4-ticket-lifecycle` / `feature/lab4-ticket-lifecycle`. The original processes were left running at that stage; see section 10 for the current 5173-only setup. The local preview wrapper at that stage permitted normal login and restricts Ticket/Action writes to the manifest's new I4-VERIFY fixtures; it is not a production authorization change or an intended commit file.

"Resolution requirements" appears in Ticket Workflow. The resolution Result is entered on Actions Taken; the approved contract has no separate Ticket resolution-description field. Cancellation/reopening reason editors appear after choosing the applicable destination under Update Status. Ticket status history opens the private event section. Requesters intentionally do not receive these operational controls.

### Explicit database scope and preservation

The target was checked read-only before writes: localhost:5433, database `toktickit`, schema `public`, PostgreSQL **16.14**, with all existing Action/history tables and Ticket.version already present. No migration, seed, password reset, user/account change or direct Session insertion was performed.

The student explicitly approved new I4-VERIFY Ticket/Action fixture writes and subsequently required normal user login instead of direct verification-session creation. Hazel's existing normal-login session was reused for real browser/API requests. Only the three Tickets below and their associated Action/history/replay records were created/modified. Pre-existing User, Session, catalog, Ticket, Action, revision, replay, attachment, comment, note and event records were compared using counts/checksums; **all pre-existing records matched**. Concurrent normal user logins may add their own new Session rows; the preservation comparison retains the original Session row IDs. BankCore and port-55432 Lab4 databases were not accessed.

### Available manual-inspection fixtures

All fixture Tickets remain available. In IT Staff Queue, search `I4-VERIFY-20261102-02921B9F`.

| ID / Ticket number | Saved status / version | Evidence |
|---|---|---|
| 431 — I4-VERIFY-20261102-02921B9F-LIFECYCLE | REOPENED / 14 | Owned by Alice; assigned to Hazel; one completed action and seven ordered Ticket status events. |
| 432 — I4-VERIFY-20261102-02921B9F-CANCELLATION | CANCELLED / 8 | Owned by Alice; assigned to Hazel; one completed and three cancelled actions; one Ticket event. |
| 433 — I4-VERIFY-20261102-02921B9F-CONFLICT | IN_PROGRESS / 2 | Owned by a different existing Requester; assigned to Hazel; stale-edit rejection/review/reapply produced one status event. |

These states were reread after verification; the fixture-creation manifest also retains the original starting states.

### Actual live results

The executed local browser script was `node artifacts/lab-04/i4-local/manual-20261102/verify-browser.mjs`. Its final outcome was **6 verification groups passed, 0 failed, 2 skipped**. These are verification groups, not an additional Vitest suite count.

| Check | Live outcome |
|---|---|
| Correct source, API and Hazel session | PASS; actual TicketWorkflow rendered; old I3 panel absent. |
| AC-01 permitted/rejected transitions | PASS as IT Staff: NEW → OPEN → IN_PROGRESS → WAITING_FOR_REQUESTER → IN_PROGRESS → RESOLVED → CLOSED → REOPENED; a fresh REOPENED → CLOSED request returned 409 INVALID_TRANSITION without changing version. Administrator live permission coverage remains pending. |
| AC-02 resolution gate | PASS: disabled UI destination while incomplete, real 409 RESOLUTION_GATE_FAILED, retained version on rejection; completing Result and clearing follow-up enabled resolve/close. |
| AC-03 cancellation cascade | PASS: Planned/In Progress cancelled together; completed/already-cancelled snapshots preserved; child versions/reasons updated and Ticket event persisted. |
| AC-04 status history | PASS as IT Staff: seven chronological from/to/actor/time/reason events on the lifecycle Ticket. Requester denial and Admin visibility are pending live login. |
| AC-05 conflict handling | PASS: two actual authenticated browser contexts; newer priority write made the status draft stale; 409 preserved the draft, explicit refresh/acknowledgement/manual save succeeded. |
| AC-06 terminal restrictions | PASS as IT Staff: Action writes rejected with 409 TICKET_NOT_ACTIVE on RESOLVED/CLOSED/CANCELLED; Record action unavailable and cancelled Ticket status control disabled. |
| Pre-existing record preservation | PASS; no changed tables. |
| Requester live permissions/privacy | NOT VERIFIED; skipped because no usable normal Alice session was available to the role-check contexts. |
| Administrator live scoped permissions | NOT VERIFIED; skipped because no usable normal Admin session was available to the role-check contexts. |

During this manual-verification effort, the database-independent component/adapter command passed **50 tests**, and the workflow-rule command passed **103 tests**. The earlier 632 backend / 263 frontend / 30 browser results remain historical executed I4 evidence; those full suites were not rerun for this preview investigation.

### Authentication discrepancy and pending work

The user reported successful role logins, but read-only checks in the verified development database showed only Hazel with an unexpired session. Alice and Administrator had no current usable sessions. The response requested from `/api/auth/me` was supplied as placeholders rather than actual names/roles/error codes. The existing login service was inspected: successful normal login creates a server session and sets the cookie; no password reset or account-setting change is needed for the active, non-password-gated accounts.

Two fresh, isolated browser contexts were opened on the correct I4 URL, prefilled only with the existing Alice/Admin emails. Passwords are entered by the user through the normal UI; no password, token, cookie or storageState is logged or persisted. Their matching authenticated roles have not yet been observed by the checker. The helper's progress is recorded separately, without credentials. No authentication bypass or direct Session creation was used.

No live Ticket-workflow code defect was found in the November 2 run. At that time the Requester/Admin context discrepancy blocked signoff; section 10 records the subsequent real normal logins, retained failed-helper assertion and successful role coverage.

### Preserved local evidence

`artifacts/lab-04/i4-local/manual-20261102/` contains the safe fixture manifest, final-state readback, structured results, retained pre-login failures and local preview/verification scripts. It remains excluded from the proposed source commit scope. Screenshots:

- `screenshots/hazel-resolved.png`
- `screenshots/hazel-reopened-history.png`
- `screenshots/hazel-cancellation-confirmation.png`
- `screenshots/hazel-cancelled-history.png`
- `screenshots/hazel-conflict-review.png`

No Git staging, commit, push, PR, merge or issue closure occurred. Existing unrelated work is preserved.

## 10. Authentication and role verification ? 2026-11-03 (Asia/Bangkok)

### Current application and scope

Use **http://localhost:5173 only**, served by the Issue #4 worktree's independent Vite process **46780**, with API **http://localhost:3002**, preview backend PID **25804**. Port 5174 is closed. These are observed local process IDs, not deployment requirements. The source branch remains feature/lab4-ticket-lifecycle; main/lab4-staging were not changed.

The temporary local wrapper was corrected to permit the application's normal login, logout and self-service Change Password routes and to include 5173 CORS on rejected writes. It continues to restrict Ticket/Action writes to the approved fixture manifest. Application authentication/authorization code was not changed for the preview correction. The obsolete combined preview no longer starts a second frontend.

### Administrator first-login evidence

The student explicitly approved one account-only development reset and a later flag-only retest for admin@toktickit.test. Both verified localhost:5433/toktickit/public first. The reset used the existing bcrypt helper, set mustChangePassword=true and revoked only its three sessions; role, activation, other account fields and unrelated records were preserved. The later flag-only transaction preserved the current password hash exactly, set only its mandatory-change flag and revoked its one session. Neither operation ran migrations or touched BankCore or the port-55432 cluster. Private input was supplied in the student's local masked prompt; no credential values are included in this report or intended commit scope.

The earlier observation of User Management occurred with the stored flag already false. Login itself does not clear the flag. No request audit exists to attribute that earlier update to a particular client; a frontend gate bypass was not demonstrated.

The retained local checker result local-admin-flow-20261103-stage1.json now verifies a real normal login response and authenticated /api/auth/me with ADMINISTRATOR and mustChangePassword=true, visible mandatory Change Password inputs, hidden normal navigation, and 403 PASSWORD_CHANGE_REQUIRED from User Management, staff queue and Ticket-history reads. No password change was submitted during that stage, and its account/hash preservation check passed.

The student subsequently completed the normal password change. Fresh direct database and authenticated API checks verify mustChangePassword=false, the persisted account-update time, a valid existing Administrator session and normal application access. The stage-2 local checker result is absent; do not claim that complete two-stage checker passed or that Codex independently compared the private new password with its hash. No password was replayed, reset again or changed by the role verifier.

### Fresh Administrator verification

Actual command from the feature-worktree root:

~~~powershell
node artifacts/lab-04/i4-local/manual-20261102/complete-admin-role-20261103.mjs
~~~

Outcome: **8 manual browser/API verification groups passed, 0 failed**. These are grouped live checks, not additional Vitest/Playwright suite case counts.

| Group | Actual result |
|---|---|
| Saved password gate/session | ADMINISTRATOR authenticated through backend 3002; mustChangePassword=false. |
| Queue/Detail/Actions/workflow | Real 5173 UI loaded the queue and approved fixture; scoped controls appeared. |
| No implicit Admin claim/assignee | Omitted owner and Administrator-as-owner requests returned 400 without version changes; no Claim Ticket UI. |
| Scoped assignment/priority | URGENT priority and two explicit eligible-Staff assignments succeeded; owner restored to Hazel. |
| Status/gate/privacy restrictions | WAITING_FOR_REQUESTER then IN_PROGRESS succeeded; resolving without evidence returned 409 RESOLUTION_GATE_FAILED; IN_PROGRESS to CLOSED returned 409 INVALID_TRANSITION; requester-only resolution indication returned 403 FORBIDDEN. Rejections preserved the version. |
| Private immutable history | Administrator read history; prior entries matched exactly; two appended events retained the Administrator name/role and expected destinations. |
| Terminal restrictions | Cancelled fixture 432 displayed disabled status control and no Record action control for Administrator. |
| Preservation | All users, pre-existing sessions, other Tickets, all Actions/revisions/replay records and prior events matched their counts/checksums. |

Only approved fixture **433 ? I4-VERIFY-20261102-02921B9F-CONFLICT** changed: **IN_PROGRESS / version 7 / URGENT / Hazel (ID 5)**, zero Actions, three status events. Five permitted Ticket updates and two appended status events were expected. Fixtures 431 and 432, all Actions and unrelated Tickets remain unchanged by this run. Verification reused a normal session; it did not insert or revoke sessions or change accounts.

Evidence: admin-role-completion-20261103.json and administrator-scoped-workflow-20261103.png in artifacts/lab-04/i4-local/manual-20261102/. Local helpers/raw evidence remain excluded from the 38-file proposed commit allowlist.

### Completed Staff/Requester role and privacy coverage

The initial existing-session attempt recorded **0 groups passed, 0 failed and 2 roles blocked**. Those unexecuted checks were never counted as passes. The student then ran the controlled local normal-login helper, producing real normal Hazel/Alice sessions in the verified development database.

The first local attempt recorded **5 groups passed and 1 failed**. Its failing assertion expected error.code=FORBIDDEN from the legacy Internal Notes endpoint. That endpoint correctly returned HTTP 403 with the existing body {"error":{"message":"Staff access required."}}. No private notes were returned. The local checker was corrected to assert that exact legacy body and absent data, while retaining strict FORBIDDEN checks for the newer routes. No application route, business rule or approved contract was changed.

Only the affected Requester checks were rerun:

~~~powershell
node artifacts/lab-04/i4-local/manual-20261102/verify-role-privacy-20261103.mjs --existing --requester-only
~~~

Outcome: **4 groups passed, 0 failed/blocked**: three Requester groups plus preservation. Hazel's three successful groups remain the earlier local execution evidence; they were not unnecessarily rerun. Final coverage is **7 distinct role/preservation groups passed across these attempts**, not 5+4 additional unique tests and not a newly completed combined-suite run.

| Distinct coverage group | Verified outcome |
|---|---|
| Hazel normal authentication | IT_STAFF with mustChangePassword=false, matching normal session in the development database. |
| Staff operational UI | Queue, owned verification Detail, Actions, Workflow, resolution requirements, permitted controls and private Ticket history loaded. |
| Staff scope | Administrator User Management GET returned 403 FORBIDDEN; operational Ticket read returned 200; requester-only indication UI absent. |
| Alice normal authentication | REQUESTER with mustChangePassword=false and matching normal session. |
| Owned shared content | Ticket 431 and Actions readable; no Workflow, Internal Notes or operational buttons; private gate/destination fields absent. |
| Requester privacy/write denial | Ticket/Action histories and Internal Notes denied with 403; staff queue denied; non-owned Ticket 433 and its Actions returned 404; three same-value status/assignment/priority probes returned 403 FORBIDDEN without changing the fixture. |
| Record preservation | Accounts, pre-existing sessions, all Tickets/Actions/revisions/replay/history/comments/notes/attachments matched the audit before/after. Normal user login alone created its expected new sessions. |

Evidence files under artifacts/lab-04/i4-local/manual-20261102/:

- role-privacy-local-failed-20261103-1793645721092.json ? retained first attempt and its five passes/one failure.
- role-privacy-existing-20261103-1793646063571.json ? successful affected Requester rerun.
- role-privacy-reviewed-20261103.json ? explicitly labelled aggregate coverage, not a single execution.
- review-staff-privacy-20261103.png and existing-requester-privacy-20261103.png ? reviewed current-role screenshots.

A separate fixed-viewport Staff history read confirmed viewport/document/body width **1366/1366/1366**, with no horizontal overflow. Earlier desktop/tablet/mobile suite evidence remains historical; it was not rerun merely for these role checks. All three account flags are false and current normal sessions were present at final readback. No further password/account change was made.

### Checks and separate finding

The temporary preview guard command node --test artifacts/lab-04/i4-local/manual-20261102/preview-auth-guard.test.mjs passed **11 tests, 0 failed/skipped** after normal self-service Change Password was enabled. The earlier saved logout result has **6 passed groups**; it was not rerun here. The historical complete I4 results remain **632 backend passes / 1 recovery skip, 263 frontend passes and 30 browser passes**. None of those full suites was rerun for these account/preview investigations; no source change requires a repeated build here.

A separate pre-existing Lab 3 weakness remains: the current self-service password-change API/UI does not explicitly reject reusing the current password. Proposed follow-up: after verifying the current password, bcrypt-compare the proposed new password with the stored hash and reject reuse before any update; add a matching UI message and role-parametrized rejection/preservation tests. This is not implemented or silently included in I4. The student's current password must not be reset again to investigate it.

Current readiness: **I4 is ready for the designated peer's review.** All six I4 criteria have automated evidence and the documented live Staff/Admin/Requester coverage; no unresolved I4 implementation defect was found. The separate pre-existing Lab 3 password-reuse weakness needs an approved follow-up, and the historical recovery skip remains unexecuted rather than passed. Peer approval, required PR checks and I6/I7 release evidence remain separate. No staging, commit, push, PR, merge or release approval is claimed.
