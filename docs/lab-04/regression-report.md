# I6 Regression, Accessibility & Responsive Testing

Prepared 2026-11-03 (Asia/Bangkok). GitHub [#68](https://github.com/thit3455/toktickit/issues/68). Branch feature/lab4-regression-testing; worktree toktickit-lab4-regression. Base d8ba0a5184e8dc006d258b4fd1877f46aa13acf8 is merged I5 PR #67 and contains exact I5 commit 7b821be43165107c47f0156105050f1ed2577965 and the approved I3/I4 dependencies.

Status: student manual dashboard review completed on2026-11-04. The student explicitly authorized the final scoped audit, commit and push of feature/lab4-regression-testing. This report is a pre-publication evidence snapshot; the final Git commit and push result are reported in Git/chat. Designated peer review, PR creation and merge remain pending. No PR, merge, issue-state or checklist changes are part of this authorization.

2026-11-04 configuration follow-up: the student explicitly requested shared local ports5173/3001/5433. The standard read-only preview is running; the student has now completed the Requester, IT Staff and Administrator dashboard review and reports that the UI looks correct. No new automated browser inspection is claimed. [local-configuration.md](local-configuration.md) records the complete audit, necessary configuration delta and fresh checks. This is an authorized configuration follow-up; existing business permissions and database contracts are unchanged.

## 1. Contract and scope

Read the complete eleven-page SE+Lab+4.pdf and the approved specification.md, ui-spec.md, api-spec.md, tests.md and I2-I5 reports. Cover REG-01, AUTH-01, STYLE-01, RESP-01, A11Y-01, POLISH-01, PERF-01 and ACT/WF/CON/DUP/DASH/MIG/SEED regressions. No new product features, charts, exports, authorization expansion, schema, migration or private environment-file changes. Public example endpoints were corrected only in the separately requested port follow-up.

I4's explicitly approved Staff/Admin transitions, assignment and priority permissions remain authoritative. Requester ownership/private-history restrictions and the Administrator's prohibition on Create Ticket remain enforced. The older Lab 3 browser assertion denying all Administrator Queue navigation was obsolete after I3/I4; it now requires approved Queue visibility and additionally retains the negative Create Ticket assertion.

## 2. Acceptance-criteria traceability

| GitHub #68 criterion | Approved requirement and actual evidence | Result |
|---|---|---|
| AC1 earlier lab regression | FR-11 / AC-22 / REG-01; health/catalogs, authentication, Requester create/list/detail/attachments/comments, Staff operational/private notes, Administrator safeguards. Full backend/frontend and all eight earlier browser specs executed. | Verified |
| AC2 auth, roles, workflow, Actions and dashboards | AUTH-01, ACT-01-08, WF-01-07, CON-01, DUP-01, DASH-01-05. Real API/browser permissions, ownership, gates, actor eligibility, revisions/replay, concurrency, rollback, cancellation and terminal states; all-role first-login reuse/expiry coverage added. | Verified |
| AC3 accessibility | FR-12 / AC-24 / A11Y-01. Fifteen device cases, 81 axe screen/state audits, actual Tab/Enter/focus/validation checks, native-select CSS contrast, headings/labels and representative screenshot review. See accessibility-report.md for incomplete native-popup/screen-reader limits. | Verified within stated scope |
| AC4 responsive/style | BR-25 / AC-23/25 / RESP-01 / STYLE-01. 1440, 768 and 390 CSS-pixel projects; additional 320 checks. Long valid content, bounded lists/cards, no page overflow or overlapping controls, stacked tables/forms and role navigation. | Verified; responsive-report.md |
| AC5 actual automated execution | 739 distinct backend tests across three disjoint groups, 306 frontend tests, 84 earlier browser project cases; final groups have zero failures/skips. Server/client/browser TypeScript, both builds, compiled health and whitespace checks passed. | Verified |
| AC6 evidence, fixes and limitations | Actual result/failure history below; 18 selected synthetic screenshots, 81 retained audits, all performance samples, sanitized verification summary; original local failure logs/traces preserved. | Verified |
| AC7 limited scope and preservation | Exact candidate allowlist below; final source review, empty index, SHA-256 preservation of original 99 files, I4's 83 artifacts and I5's 124 evidence files; mutating database verification confined to newly owned resources that were removed; the later approved manual preview reads development data with normal authentication sessions only. | Engineering audit verified; student review/publication approved; peer approval pending |

Teacher trace: sections 4.6/6.2/7/8.1-8.6/10/12/14 and Parts 5/8/9 require dashboard regression, real expected/actual testing, accessibility/responsive polish and evidence. Final reviewed integration, Kanban completion and final nine-part report remain I7 responsibilities.

## 3. Environment and safety

The initial inventory was 29 server test files, 26 client files and eight browser specs; local initial-inventory.json records exact names. Final coverage is 32 server files, 27 client files and nine browser specs. Root npm test is a deliberate placeholder; package Vitest scripts and the actual Playwright CLI were used.

The student separately approved the exact disposable isolation plan and PERF-01 threshold before provisioning. Only new container toktickit-i6-ddfdebd14943 (full ID 5761dfc5779693c30c2b54922528361dfc095bccda936f780e9f0896da70a690), PostgreSQL 18.6, was created. Docker assigned 127.0.0.1:54030; data directory /var/lib/postgresql/18/docker used new tmpfs storage.

Three new databases were used:
- toktickit_lab4_test_i4_ddfdebd14943
- toktickit_lab4_test_i5_ddfdebd14943
- toktickit_lab4_test_i6_recovery_ddfdebd14943

New i4/i5 runners had no superuser, database/role creation, replication, bypass-RLS or elevated-membership privileges. Only CONNECT/CREATE/TEMPORARY on their corresponding test databases were granted. Private random credentials stayed in controller memory, filtered child environments and stdin; no secret arguments, password files, persistent PATH or .env edits.

Container ID/nonce/tmpfs/loopback publication and actual PG18/database/role/permissions/empty targets were checked before every group. Existing unique lab4_UUID schema helpers owned migrations, fixtures and scoped disposal. Legacy auth/migration tests additionally owned their uniquely named nested schemas. No development DATABASE_URL/.env/default API fallback is permitted by the new I6 guards. Existing strict I4/I5 harnesses received only the three new targets and explicit approval/expected-identity variables.

Recovery actually executed both migration-preservation and populated backup/restore cases, including Actions, revisions, replay records, subsequent writes and source preservation. Explicit PostgreSQL 18.4 psql/pg_dump/pg_restore versions were checked; pg_dump/restore passed against the isolated 18.6 server. Credentials remained outside process arguments.

Every group returned the new databases to empty user-table state. The nonce/ID-verified new container and its tmpfs were removed after testing; no Docker volume or existing container was reset/deleted. Port 5174 was released. Existing frontend 5173/PID18116, APIs 3002/PID25804 and 3003/PID29808, BankCore 3000 and database listeners 5432/5433/55432 remained present. No automated database test targeted those existing databases. The subsequently approved read-only preview uses development5433 for reads and normal login/logout session handling; the agent made no User/Ticket/Action business writes. Preservation is based on controlled targets and file hashes, not a claim that unrelated running applications cannot change their own data.

## 4. Actual final results

| Executed group | Passed | Failed | Skipped | Evidence under artifacts/lab-04/i6-local |
|---|---:|---:|---:|---|
| Complete non-dashboard backend regression, 29 files | 722 | 0 | 0 | backend-1793721264519.txt |
| Dashboard API, 2 files | 16 | 0 | 0 | dashboard-api-1793717404041.txt |
| Representative dashboard performance, 1 file | 1 | 0 | 0 | performance-1793721409844.txt; selected performance.json |
| Full frontend after port standardization, 27 files | 306 | 0 | 0 | port-audit-a0446818ba/frontend-standard-ports.json |
| Legacy authentication/Requester/Admin E2E | 27 | 0 | 0 | legacy-1793718621159.json |
| Actions/Workflow/Staff E2E, final full rerun | 30 | 0 | 0 | workflow-browser-1793721470161.json |
| Dashboard E2E | 12 | 0 | 0 | dashboard-browser-1793720914189.json |
| Accessibility/responsive E2E, final expanded audit | 15 | 0 | 0 | a11y-1793721137627.json |

The database/backend, E2E, axe and performance groups above retain their original 2026-11-03 attribution; they were not rerun against development data after port normalization. On2026-11-04, all306 frontend cases and44 database-independent harness/guard cases passed, both builds passed, and standard-port HTTP/CORS/read-only checks passed. The44 overlap earlier backend coverage; they are not added to739. Agent browser inspection was deferred. The student subsequently confirmed all three role dashboards look correct; this manual observation is recorded separately from automated counts.

Backend totals are 739 passes / 32 files across the disjoint 722+16+1 groups, not a single command. Dashboard API's 16-case run occurred earlier in this I6 execution; dashboard implementation was unchanged afterward. The final full backend run covers the subsequent auth correction. Browser totals are 84 distinct project cases: 28 each on desktop Chromium, tablet WebKit and mobile Chromium, one worker, retries disabled. Three mocked Staff Queue project cases and the explicitly controlled loading/500 feedback scenario are identified as such; they are not substituted for the real-API flows.

The frontend's four affected Ticket Detail cases passed again after a test-only typing correction. Repeated focused runs are not extra unique tests. Earlier I5's 701 passes/one recovery skip, 299 frontend and 12 browser cases remain historical; I6 actually executed recovery with zero skips.

Other actual checks:
- Server TypeScript --noEmit and server tsc production build: passed.
- Frontend tsc and Vite production build: passed, 47 modules.
- All changed browser specs, their imported helpers and playwright.i6.config.ts TypeScript: passed with explicit installed type roots.
- Corrected production start entrypoint: owned loopback process returned GET /api/health HTTP 200, database variables removed, process then stopped.
- git diff --check and new-file whitespace/scope checks: passed in the final audit.

## 5. Defects, corrections and retained failures

| Finding / initial result | Small correction and actual affected verification |
|---|---|
| Same-password change returned HTTP 200 and cleared the first-login gate for every role; new regression initially failed 3/3 (backend-1793717773960.txt). This confirms the earlier Lab 3 concern, not an I4 permission regression. | Authenticated change-password compares the candidate to the current bcrypt hash before hashing/updating; returns existing 400 WEAK_PASSWORD with a safe specific message. Hash/flag stay unchanged on rejection. New all-role plus existing auth tests: 12/12 passed; related login/Requester components: 18/18; final backend includes all three new cases. No universal initial-password exception, account reset or role change. |
| npm --prefix server start failed MODULE_NOT_FOUND after a successful build: dist/index.js did not exist; tsc emits dist/src/index.js. | Corrected only scripts.start. Rebuilt and validated actual compiled health on an owned temporary loopback process without DB configuration. |
| Eleven Ticket Detail read-only controls had unassociated visible labels; two settled desktop scenarios failed axe label checks. | Added matching htmlFor/id pairs, no value/permission changes. New accessible-name assertion plus existing detail tests: 4/4 passed; final axe audits passed. |
| Retry text on red error background measured 3.39:1; action-editor link/secondary text on gray measured 4.18:1 / 4.35:1. | Filled success retry button and scoped darker editor text/border variables; preserved enabled/disabled behavior. Four focused component files: 82/82 passed; desktop 5/5 then final devices 15/15 passed. |
| Initial accessibility run: 6 passed / 9 failed; color measurements included finite navigation transitions. | Wait for real finite animations to finish, without disabling motion or contrast rules. The settled desktop run then honestly exposed the label defects (3 passed/2 failed), and the next exposed the real contrast defects (3/2). All original reports/traces remain local. |
| Initial full workflow run: 29 passed / 1 tablet timeout waiting for Save action after Start; retained trace shows successful prior PATCH/GETs, no failed API response explaining it. | No timeout increase, assertion removal or automatic retry. Unchanged affected tablet file: 3/3 passed. Final full group: 30/30 passed. Retain as an observed transient browser reliability limitation; the exact pointer-timing cause is not proven. |
| New guard TDD initially could not collect a not-yet-created helper; later heterogeneous tuple typing failed static checking. | Implemented fail-closed helper; fixed only tuple typing. All 17 guard cases passed and are included in final 722. |
| Windows selected-file runner rejected forward-slash names before test collection. | Normalize discovered paths before allowlist comparison. Selected auth run then collected the three genuine failures above; failed setup is not a passing test. |
| New component test used Playwright's unsupported exact option in Testing Library queries; build failed TS2769 although runtime tests passed. An initial standalone E2E static command could not find root Node types. | Removed only ignored query options (string accessible-name matching remains exact by default); affected 4/4, both builds passed. E2E static command uses actual server/client installed type directories and passed. |
| First performance dataset allowed active work/unassigned owners on terminal synthetic Tickets. Initial measurements passed but did not represent valid terminal invariants. | Kept 1000/3000 scale; terminal fixtures now have completed/cancelled work and required resolution owners, with invariant assertions. Final smoke passed; final samples supersede initial timing data. |

No failing assertions were converted to skips, no private-history checks removed and no business rule weakened.

## 6. Performance smoke

Student-approved target: 1000 representative Tickets, 3000 actions, three warmups and twenty sequential authenticated requests per dashboard endpoint; p95 <=2000ms; retain every slow/error sample.

Actual final p95: Requester 18.64ms, Staff 18.09ms; all 40 measured requests and six warmups returned 200. Five-row bounds held. [performance.json](../../artifacts/lab-04/i6/performance.json) retains all samples and machine/runtime metadata. This measures local Supertest HTTP round trips against disposable PostgreSQL, not production network/load capacity or a teacher-prescribed SLA.

## 7. Reproducible execution

These commands ran only inside the approved private controller environment. Do not execute DB/browser commands with development variables. A future rerun requires a newly approved disposable environment, actual identity checks, and fresh private credentials; the removed container cannot be reused.

The guarded source runner requires LAB4_I6_TEST_APPROVED=1, exact LAB4_I6_EXPECTED_NONCE and LAB4_I6_EXPECTED_PORT, LAB4_TEST_DATABASE_URL (new workflow target), LAB4_I6_DASHBOARD_DATABASE_URL, LAB4_RECOVERY_DATABASE_URL and explicit LAB4_PG_BIN. Legacy/API bootstrap DATABASE_URL and owned-schema/API variables are generated by the runner, not read from .env. Existing I4/I5 browser harnesses additionally require their explicit approval/expected DB/port variables. The local controller supplies the correct workflow/dashboard target separately for each group and filters inherited libpq/DB settings. Its temporary provisioning/credential code remains excluded from the candidate commit.

Actual CLI argument patterns (absolute local paths/URI and per-run output timestamps were supplied by the controller):

~~~powershell
npm.cmd --prefix client test -- --reporter=json --outputFile=../artifacts/lab-04/i6-local/frontend-final.json
npm.cmd --prefix client test -- --run tests/lab-02/RequesterTicketDetail.test.tsx
npm.cmd --prefix client test -- --run tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx tests/lab-04/ActionsTaken.test.tsx tests/lab-04/TicketWorkflow.test.tsx

# Root cwd; $tsxLoader is the actual file URI for server/node_modules/tsx/dist/loader.mjs.
node --import $tsxLoader server/tests/helpers/i6-execution.ts backend
node --import $tsxLoader server/tests/helpers/i6-execution.ts backend tests/lab-04/auth-regression.api.test.ts tests/lab-03/auth.api.test.ts
node --import $tsxLoader server/tests/helpers/i6-execution.ts legacy
node --import $tsxLoader server/tests/helpers/i6-execution.ts a11y

# Server cwd; private controller supplies the group's exact approved DB target.
node node_modules/vitest/vitest.mjs run tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --no-file-parallelism --reporter=dot
node node_modules/vitest/vitest.mjs run tests/lab-04/dashboard-performance.test.ts --no-file-parallelism --reporter=dot

# Root cwd; actual controller adds timestamped --output and JSON reporter path.
node node_modules/@playwright/test/cli.js test --config=playwright.i6.config.ts e2e/lab-04/actions-taken-flow.spec.ts e2e/lab-04/ticket-resolution.spec.ts e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/staff-queue.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --reporter=line,json
node node_modules/@playwright/test/cli.js test --config=playwright.i6.config.ts e2e/lab-04/dashboards.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --reporter=line,json

node server/node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json
npm.cmd --prefix client run build
npm.cmd --prefix server run build
node server/node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --skipLibCheck --types node --typeRoots "./server/node_modules/@types,./client/node_modules/@types" --lib ES2022,DOM,DOM.Iterable playwright.i6.config.ts e2e/lab-02/requester-ticket-flow.spec.ts e2e/lab-03/authentication.spec.ts e2e/lab-03/user-administration.spec.ts e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/staff-queue.spec.ts e2e/lab-04/accessibility-responsive.spec.ts e2e/lab-04/workflow-test-server.ts
git diff --check
~~~

The runner invokes Vitest --no-file-parallelism; browser groups use one worker and all three projects. Its a11y/legacy modes allocate the owned API and strict 5174 Vite server themselves. The workflow/dashboard commands use the existing guarded fixture servers. Do not launch these groups concurrently.

Accessibility tooling was installed with the actual command below. LAB4_I6_AXE_PATH points to that exact package file in the child environment. PLAYWRIGHT_JSON_OUTPUT_FILE selects each timestamped JSON result; --reporter=line,json enables its reporter. These settings are process-local.

~~~powershell
npm.cmd install --prefix artifacts/lab-04/i6-local/a11y-tools --no-audit --no-fund --ignore-scripts --registry https://registry.npmjs.org/ axe-core@4.14.0
~~~

The initial independent baseline was 299 frontend, 270 selected pure/mock backend and 17 new guard passes, zero final failures/skips. Their actual selected commands are retained in local JSON/terminal records; they overlap later full suites. Affected tablet rerun selected only actions-taken-flow.spec.ts and --project=tablet; desktop accessibility reruns selected only --project=desktop. No added unique passes are counted.

## 8. Evidence, limits and next step

[verification-summary.json](../../artifacts/lab-04/i6/verification-summary.json) identifies actual final source reports, per-device counts, failures/reruns, cleanup and preservation. [accessibility-report.md](accessibility-report.md) and [responsive-report.md](responsive-report.md) distinguish automated keyboard checks, seven actual agent screenshot reviews and unperformed human screen-reader/native-popup/hardware tests.

All 81 audit screenshots and original failure traces remain under i6-local; 18 useful synthetic-fixture images are selected for review. Raw logs, traces, temporary controllers/launchers, tool dependency/cache folders, dist output and database backup files are excluded. The generated i5-local Vite cache here belongs to this I6 test execution, not changes in the preserved I5 worktree.

No outstanding failed or skipped cases in final required runs. Known limitations are the retained one-off tablet timeout, incomplete native popup/screen-reader coverage, emulated rather than physical devices and local sequential performance scope. Student manual review is complete, and scoped Git publication is explicitly authorized. Designated peer approval, PR creation and merge remain outstanding. Only the exact audited allowlist is authorized for staging/commit/push; no PR creation or merge is authorized.


## 8.1. Final publication audit, 2026-11-04

The student reviewed Requester, IT Staff and Administrator dashboards and reported that the UI looks correct. This is student-reported manual evidence, not another automated browser run or an additional framework test count.

GitHub #68's seven acceptance criteria were read again and match the traceability table. The issue is already closed while its AC checkboxes remain unchecked; neither state nor checkboxes were changed. All seven criteria have supporting engineering evidence, with the documented accessibility/device/performance limitations and peer review still pending.

Fresh audit reruns:10 transport/discussion tests in2 files and44 database-independent harness/guard tests in4 files passed, zero failed/skipped. Client TypeScript/Vite build, server TypeScript build and changed-browser TypeScript passed. These focused tests overlap the retained306 frontend/739 backend totals. The84 Playwright cases,81 audits and performance/recovery measurements retain their original execution dates and were not rerun against any existing database for publication.

The reviewed configuration remains frontend5173/backend3001/development PostgreSQL5433. The final allowlist was recalculated from complete Git status rather than assumed from the earlier49-file list:59 files,37 source/test/configuration/documentation and22 selected evidence. Raw launchers, logs, caches, private environment files and unrelated worktrees remain excluded. Final staging must match this set exactly; the index was empty before the authorized staging step.

## 9. Exact candidate allowlist

1. `README.md`
2. `artifacts/lab-04/i6/accessibility-audits.json`
3. `artifacts/lab-04/i6/desktop-action-editor-focus.png`
4. `artifacts/lab-04/i6/desktop-action-revision-history.png`
5. `artifacts/lab-04/i6/desktop-administrator-validation.png`
6. `artifacts/lab-04/i6/desktop-login.png`
7. `artifacts/lab-04/i6/desktop-mandatory-requester.png`
8. `artifacts/lab-04/i6/desktop-requester-create-validation.png`
9. `artifacts/lab-04/i6/desktop-requester-safe-error.png`
10. `artifacts/lab-04/i6/desktop-staff-detail-workflow.png`
11. `artifacts/lab-04/i6/desktop-ticket-status-history.png`
12. `artifacts/lab-04/i6/mobile-action-cancel-dialog.png`
13. `artifacts/lab-04/i6/mobile-administrator-dashboard.png`
14. `artifacts/lab-04/i6/mobile-requester-detail-actions.png`
15. `artifacts/lab-04/i6/mobile-requester-list.png`
16. `artifacts/lab-04/i6/mobile-small-mobile-administrator.png`
17. `artifacts/lab-04/i6/mobile-workflow-editor.png`
18. `artifacts/lab-04/i6/performance.json`
19. `artifacts/lab-04/i6/port-configuration-audit.json`
20. `artifacts/lab-04/i6/tablet-administrator-users.png`
21. `artifacts/lab-04/i6/tablet-requester-dashboard.png`
22. `artifacts/lab-04/i6/tablet-staff-queue.png`
23. `artifacts/lab-04/i6/verification-summary.json`
24. `client/.env.example`
25. `client/src/ActionsTaken.css`
26. `client/src/App.tsx`
27. `client/src/DashboardShared.tsx`
28. `client/src/TicketDiscussion.tsx`
29. `client/src/TicketWorkflow.css`
30. `client/src/api.ts`
31. `client/tests/lab-02/RequesterTicketDetail.test.tsx`
32. `client/tests/lab-04/ApiConfiguration.test.tsx`
33. `client/vite.config.ts`
34. `docs/lab-04/accessibility-report.md`
35. `docs/lab-04/local-configuration.md`
36. `docs/lab-04/regression-report.md`
37. `docs/lab-04/responsive-report.md`
38. `docs/lab-04/tests.md`
39. `e2e/lab-02/requester-ticket-flow.spec.ts`
40. `e2e/lab-03/authentication.spec.ts`
41. `e2e/lab-03/staff-queue.spec.ts`
42. `e2e/lab-03/staff-ticket-flow.spec.ts`
43. `e2e/lab-03/user-administration.spec.ts`
44. `e2e/lab-04/accessibility-responsive.spec.ts`
45. `e2e/lab-04/i6-accessibility.ts`
46. `e2e/lab-04/i6-browser-fixtures.ts`
47. `e2e/lab-04/workflow-test-server.ts`
48. `playwright.i6.config.ts`
49. `server/.env.example`
50. `server/package.json`
51. `server/src/auth/auth.routes.ts`
52. `server/src/index.ts`
53. `server/tests/helpers/i6-database.ts`
54. `server/tests/helpers/i6-execution.ts`
55. `server/tests/lab-03/admin-safety.api.test.ts`
56. `server/tests/lab-03/auth.api.test.ts`
57. `server/tests/lab-04/auth-regression.api.test.ts`
58. `server/tests/lab-04/dashboard-performance.test.ts`
59. `server/tests/lab-04/i6-database-guard.unit.test.ts`

59 candidate files:37 source/test/configuration/documentation files and22 selected evidence files. The ten-file addition records the student's explicit port-standardization request (seven existing configuration/runbook files, one focused test, this configuration document and one sanitized audit). All raw previews/controllers/logs/caches, private environment files and other worktrees remain excluded. The student's explicit publication approval applies only after the final scope and staged-diff checks pass.
