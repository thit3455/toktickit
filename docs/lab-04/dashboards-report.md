# I5 Role-Based Dashboards & Reporting implementation report

Prepared 2026-11-03 (Asia/Bangkok). GitHub Issue #66. Branch feature/lab4-dashboards in the separate toktickit-lab4-dashboards worktree. Base origin/lab4-staging / 3732ff5396086abf6c55126bc9b7c0d1f4a12bef includes merged I4 PR #65 and I3 PR #63.

Status: implementation and approved isolated verification completed. Ready for student and designated peer review of I5; one unrelated recovery skip and I6/I7 evidence gaps are disclosed. No staging, commit, push, PR or merge performed.

## 1. Authorization and workflow

The student approved the I5 plan and exact BR-18/20/21 timestamp clarification on 2026-11-03. Existing matching Issue #66 was reused and renamed "Lab 4 Issue #5 - Role-Based Dashboards & Reporting" (GitHub uses an em dash); its original checklist was preserved and the approved contract appended. No duplicate/literal GitHub issue #5 was created. The student confirmed adding #66 to TokTickIT Individual Sprints with Todo status. The agent could update repository issues but GitHub rejected Projects access for insufficient token scope, so Kanban placement is user-confirmed, not independently verified through the API.

Original workspace and I4 worktree are preserved. Ignored dependency junctions reuse the existing compatible packages; no package install, dependency/library addition or environment-file change was needed.

## 2. Contract and implementation

Teacher handout: complete eleven pages read; sections 4.6/6.2/7/8.1-2/8.5-6/10/12 and Parts 5/8/9. Approved FR-07/08, relevant FR-09/12, BR-18-21, AC-13-15 and dashboard contributions to AC-18/23-25 are used. Reporting means these approved summaries and filtered detail/list navigation. No charts/library, separate reporting screen, export, BI feature, optional account counts or Lab 3 password-reuse fix is included.

| Requirement | Implementation | Verification so far |
|---|---|---|
| Requester-owned metrics | GET /api/requester/dashboard fixes requesterId to session identity; My Open Tickets, Needs My Attention and Recently Resolved; five recent and five attention summaries maximum. | Pure/mock checks and 11 real Requester API cases PASS; real SQL/list reconciliation and three-device ownership/privacy PASS. |
| Staff/Admin metrics | GET /api/staff/dashboard: unassigned/my active Tickets, literal current-assignee active actions, all four IT-priority buckets including zeros, five recent Tickets/actions maximum. | Pure/mock checks and 5 real operational API cases PASS; independent SQL, zero buckets and Staff/Admin browser metrics PASS. |
| Consistent calculations | One server asOf at the beginning of RepeatableRead; inclusive Ticket createdAt/updatedAt and child Action cutoffs; seven Bangkok calendar dates only for Recently Resolved. | 26 rule tests, fixed-clock mock snapshot and real inclusive/future boundary cases PASS. |
| Latest resolution | Prisma relational anti-join: a resolution in the inclusive interval and no later resolution event. This is equivalent to selecting the latest RESOLVED timestamp across all events; equal-time id ties share interval membership. Future latest events never fall back; missing legacy history is not guessed. | Independent LATERAL/latest-event SQL matches the predicate; future/latest/legacy/reopened cases PASS. |
| Drill-down | Additive asOf/statuses/resolvedSince/resolvedUntil and owner=me filters on existing lists; exact returned cutoffs retained through sorting/paging. Requester rows/counts now share RepeatableRead, as the queue already does. | Real card/list totals, exact cutoff/window/ownership/priority and paginated/filter navigation PASS. |
| Action navigation | Dashboard passes Ticket/action IDs; existing authorized chronological pages are read until target is located, then the row receives focus. No new action-write permission or endpoint. | Beyond-page-one component and real Staff browser focus PASS on all three profiles. |
| Shell/gates | Dashboard is landing page after the unchanged mandatory password gate; existing screens/nav retained, role-specific nav labels/current-page semantics added. | All-role gate/navigation component regressions and real Requester/Staff/Admin browser navigation PASS. |
| States/layout | Explicit loading/refresh, real zero/empty, retry/safe errors, response validation and protected-data clearing; scoped Zen Green responsive CSS and named keyboard controls. | Component checks and 12 real desktop/tablet/mobile cases PASS; screenshots/keyboard/no-overflow reviewed. |

Active Ticket set: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED. My Active Actions: assignedToId=current user, PLANNED/IN_PROGRESS, parent/child cutoffs; creator/performer/Ticket Owner do not substitute. Administrator uses the same literal current-user rules. Counts cover full matching sets; current/recent lists have no lower date bound. List reads remain live with the original cutoff, not historical reconstruction.

Both dashboard GETs reject all query parameters. New transport returns safe typed errors and validates DTO fields, maximum list sizes, canonical dates and exact permitted drill-down filters before UI navigation. Existing authentication/session/role/account rules are retained. API private notes, history, attachment bytes, password hashes and session identifiers are not dashboard fields.

No I5 schema/migration/seed change was required. Existing Ticket/Action/status-event fields and indexes are reused. No existing records or dates were rewritten.

## 3. Actual executed checks

Do not add overlapping targeted and complete-suite counts.

| Check | Actual result |
|---|---|
| Initial pure rule TDD run before implementation | 1 failed suite; missing new module, zero executed assertions. |
| Pure I5 rules after implementation | 26 passed. |
| Focused mock route + rules | 46 passed, 2 files. |
| Pure configuration refusal guard | 13 passed; no client constructed. |
| Focused role components + transport | 25 passed, 3 files. |
| Focused landing/gates/action-focus + earlier requester-auth regression | 22 passed, 3 files. |
| Final selected database-independent backend regression | 270 passed / 9 files, 0 failed/skipped. |
| Final full frontend suite | 299 passed / 26 files, 0 failed/skipped. |
| Affected Staff Dashboard after final presentation adjustment | 10 passed; subsequent build/backend static/whitespace checks PASS. |
| Server TypeScript --noEmit | PASS, including prepared real API test sources. |
| Client TypeScript / production build | PASS; Vite built 47 modules in the ignored build directory. |
| New E2E TypeScript --noEmit | PASS; not browser execution. |
| git diff --check | PASS before documentation; final documentation/scope audit passed. |

Exact final commands from the I5 root (backend command is package-relative to server):

~~~powershell
# Backend shell removes inherited DATABASE_URL/LAB4/libpq variables in that child shell only.
npm.cmd test -- --run tests/lab-04/dashboard.rules.unit.test.ts tests/lab-04/dashboard-service.unit.test.ts tests/lab-04/i5-database-guard.unit.test.ts tests/lab-04/dashboard-harness.unit.test.ts tests/lab-04/ticket-workflow-harness.unit.test.ts tests/lab-04/ticket-workflow.rules.unit.test.ts tests/lab-04/actions-ui-access.unit.test.ts tests/lab-04/rules.unit.test.ts tests/lab-04/database-tools.unit.test.ts --no-file-parallelism --reporter=dot
npm.cmd --prefix client test -- --reporter=json --outputFile=../artifacts/lab-04/i5-local/client-final-approved-scope.json
npm.cmd --prefix client test -- --run tests/lab-04/StaffDashboard.test.tsx --reporter=dot
npm.cmd --prefix client run build
node client/node_modules/typescript/bin/tsc --noEmit -p client/tsconfig.json
node server/node_modules/typescript/bin/tsc --noEmit -p server/tsconfig.json
node server/node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --esModuleInterop --skipLibCheck --types node --typeRoots server/node_modules/@types e2e/lab-04/dashboards.spec.ts e2e/lab-04/dashboard-fixtures.ts e2e/lab-04/dashboard-test-server.ts
git diff --check
~~~

Earlier targeted commands used the actual npm test scripts with --run for the files named above. Raw frontend reports are under artifacts/lab-04/i5-local and are not proposed submission/commit files.

### Failures and corrections retained

Initial complete frontend run: 248 passed / 40 failed / 0 skipped. Earlier workflows assumed Create Ticket, Queue or User Management was the immediate landing page. Their setup now navigates from the approved Dashboard; underlying workflow assertions were preserved. An unchanged repeat after a failed local edit script retained the same failures and was not relabelled a pass. The next corrected run had 287 passed / 1 failed: a broad /REQUESTER/ selector now matched both identity and Ticket status text. It was scoped to the authenticated identity paragraph. The first green full result was 297 passed; after adding two cross-session/status-filter regression cases, the final full result is 299 passed.

Two incomplete focused Requester runs were interrupted rather than counted as suite passes. A beforeEach arrow returned its loader mock; Vitest interpreted it as teardown and awaited the test's intentionally unresolved loading promise. A block-bodied hook fixed the setup; assertions were unchanged, and all 25 focused tests passed.

Static checks initially caught Playwright-only exact options used in RTL role queries, a priority-fixture type mismatch and a Vite lifecycle cast. These test/harness typing issues were corrected; final static checks passed. Local editing-script syntax failures did not modify approved existing work or establish test passes.

Additional targeted checks caught/prevented integration mistakes: assigned=true must not widen owner=me; changing a requester single-status filter replaces the dashboard multi-status filter; action focus waits for the matching response page, avoiding an old-page race. Focused navigation/focus tests pass. New sessions/role changes clear prior dashboard filters, and a user-selected status replaces the dashboard status group; both have focused regression coverage.

## 4. Approved database and browser execution

The student separately approved the exact section-5 isolation plan. The new PostgreSQL 18.6 container/database was verified before test writes; only unique owned schemas were migrated, populated and disposed. No existing database was a target.

| Fresh approved check | Actual result | Retained local output |
|---|---|---|
| Requester dashboard API | 11 passed / 1 file, 0 failed/skipped | i5-local/api-all-1793703156291.txt |
| Staff/Admin dashboard API | 5 passed / 1 file, 0 failed/skipped | Same two-file run |
| Backend regressions excluding the two files above | 701 passed / 27 files, 0 failed; 1 backup/restore test skipped | i5-local/regression-1793703189863.txt |
| Final real Playwright | 12 passed, 0 failed/skipped/flaky; 4 each desktop/tablet/mobile | i5-local/e2e-1793703699626.txt and playwright-results.json |
| Owned database after every test task | Empty: no remaining user tables; invocation-owned schemas cleaned | Controller postTestIsolation records |
| Final owned-resource cleanup | Verified container removal and released port 5174 | i5-local/cleanup-verification.json |

The disjoint backend runs cover **717 passed tests across 29 files, plus 1 skipped**. The 270 database-independent checks and targeted checks in section 3 overlap this regression coverage and are not additional unique tests. API suites passed twice; Playwright passed twice (the final run added explicit held-response loading and Tab/Enter assertions). These are repeated verification, not 32 API or 24 unique browser cases.

The backend regression ran actual migration preservation, create-only seed repeatability/actor eligibility, authorization, Actions, Ticket transitions/gates/history, concurrency and rollback tests. The existing recovery case in migration-recovery.test.ts was skipped because LAB4_RECOVERY_DATABASE_URL was deliberately absent. No backup or restore was run or claimed. Historical I2 recovery evidence remains separately attributed; I5 adds no recovery implementation or schema change.

The exact child commands used by the local owned-environment controller were:

~~~powershell
# Package-relative working directory: server; only the controller's private, verified I5 environment.
node node_modules/vitest/vitest.mjs run tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --no-file-parallelism --reporter=dot

# I5 root: actual TSX loader resolved to a file: URL, not a Windows drive import specifier.
node --import ([uri](Join-Path (Get-Location) 'server/node_modules/tsx/dist/loader.mjs')).AbsoluteUri artifacts/lab-04/i5-local/regression-runner.ts
# That local wrapper supplies DATABASE_URL only for an owned migrated bootstrap schema
# to the 27 earlier API/test files; test DB URL remains the exact empty I5 database.
# The child uses: node node_modules/vitest/vitest.mjs run <the 27 test paths> --no-file-parallelism --reporter=dot

# I5 root; PLAYWRIGHT_JSON_OUTPUT_FILE points to artifacts/lab-04/i5-local/playwright-results.json.
node node_modules/@playwright/test/cli.js test e2e/lab-04/dashboards.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --output=artifacts/lab-04/i5-local/browser --reporter=line,json
~~~

These document actual execution, not instructions to reuse the removed database. The controller and regression wrapper are local orchestration artifacts, excluded from the review allowlist. A future DB rerun requires a new separately approved owned environment. The harness refuses development/production fallback, protected ports and unapproved targets.

### Browser evidence and accessibility scope

The final run started at 2026-11-03T11:01:40.516Z (18:01 Bangkok) and finished in 89.19 seconds. Profiles: desktop Chromium 1280x720, iPad Mini WebKit 768x1024, Pixel 7 Chromium 393x727. PNG dimensions include device pixel scaling and full-page height.

All three dashboards were visually reviewed across all three profiles, plus desktop loading/error/empty captures. Text/buttons wrap, cards stack on mobile, the tablet grid wraps, and screenshots show no clipped controls. Browser assertions verify document width, named buttons, no page errors, real role metrics/privacy/drill-down, Staff action-row focus beyond page one, Tab traversal and Enter activation/retry. Loading uses a held real request; only the recoverable 500 response is controlled. Empty ownership is real fixture data. These focused checks are not a full screen-reader/WCAG or whole-application I6 audit.

| Profile | Requester | IT Staff | Administrator |
|---|---|---|---|
| Desktop | [Screenshot](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-desktop.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-staff-desktop.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-desktop.png) |
| Tablet | [Screenshot](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-tablet.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-staff-tablet.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-tablet.png) |
| Mobile | [Screenshot](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-mobile.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-staff-mobile.png) | [Screenshot](../../artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-mobile.png) |

Desktop states: [loading](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-loading-desktop.png), [safe error](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-error-desktop.png), [empty ownership](../../artifacts/lab-04/screenshots/requester-dashboard/i5-requester-empty-desktop.png). Twelve selected images are review files. All eighteen original captures and JSON/stdout remain local. Failure traces were configured with retain-on-failure; **zero traces** were generated because there were no browser failures.

### Local orchestration failures, not hidden passes

Initial startup inspection expected a Docker tmpfs entry in Mounts; this image exposes it in HostConfig.Tmpfs. The guard refused before migrations/fixtures. An initial PowerShell label-format quoting failure also refused cleanup until labels were safely parsed as JSON. A second noninteractive controller ended on stdin EOF. Each newly created container was individually verified and removed; no existing resource was reused or removed.

The first complete two-file API run passed 16 tests. A local regression launcher then failed before collection because --import was given a Windows drive path (ERR_UNSUPPORTED_ESM_URL_SCHEME). Resolving the actual loader with pathToFileURL corrected only the excluded controller. A new owned instance reran the APIs (16 passed), then completed the 701-pass backend regression and both 12-pass browser runs. No failed product assertion was skipped or weakened.

## 5. Executed database isolation and cleanup

The student explicitly approved container toktickit-i5-2262f51b582d and database toktickit_lab4_test_i5_2262f51b582d. The completed environment was:

- PostgreSQL 18.6 (server_version_num 180006), data directory /var/lib/postgresql/18/docker, new container ID 720f3b13b3bb406ec6331fe2a24466cbae7953cb85efc79f1d37fc0faa1c313c.
- Only published endpoint 127.0.0.1:64729, Docker-assigned; never 5432, 5433 or 55432. The internal Docker port 5432 is separate from the published endpoint.
- Private random administrator/runner secrets stayed in process memory and child environments/stdin. No passwords/URLs were printed, passed as command-line credentials, committed or written to environment files.
- Restricted login role toktickit_lab4_i5_runner: NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS; CONNECT/CREATE/TEMPORARY only on the new admin-owned database. It owned only its allocated schemas. Runtime identity/permissions and an empty target were checked before every task.
- No existing/named Docker volume was attached. Storage was tmpfs under the owned container. A nonce label, full container ID and exact loopback binding guarded all lifecycle operations.
- LAB4_I5_TEST_APPROVED=1 and exact expected port/database were required. The filtered child environment removed inherited DATABASE_URL/LAB4/libpq routing. No .env load or development fallback exists. The regression wrapper's DATABASE_URL referred exclusively to its own migrated schema.
- Existing migrations ran only inside new invocation-owned lab4_<uuid> schemas. No I5 schema/migration change was needed. All owned schemas were disposed, and the database was empty after each task.
- Browser setup verified free port 5174, used an ephemeral owned API port, and directed Vite cache into i5-local rather than the original worktree dependency junction.
- Normal controller cleanup verified ownership, stopped only the new container and verified automatic removal of its tmpfs/container. A separate read-only Docker check found no remaining container. Port 5174 was free; existing frontend 5173 PID 46780 and backend 3002 PID 25804 remained running.
- The earlier failed local startup/launcher containers were also individually verified and removed. No existing container, volume, PostgreSQL service, BankCore resource, development database or existing port-55432 Lab 4 database was modified, queried for test data, reset or stopped.

## 6. Working-tree scope

The numbered allowlist below records the final source/test/document/evidence scope audit. Exclude artifacts/lab-04/i5-local, ignored dependencies/build output and all original/I4 worktree changes. No staging is authorized until the student's final report review.

**58 files: 46 source/test/document files and 12 required screenshot evidence files.** This is a review allowlist, not staging approval.

1. `client/src/ActionsTaken.tsx`
2. `client/src/App.tsx`
3. `client/src/Dashboard.css`
4. `client/src/DashboardShared.tsx`
5. `client/src/RequesterDashboard.tsx`
6. `client/src/StaffDashboard.tsx`
7. `client/src/StaffTicketQueue.tsx`
8. `client/src/api.ts`
9. `client/src/dashboard.api.ts`
10. `client/tests/lab-02/AttachmentSection.test.tsx`
11. `client/tests/lab-02/CreateTicket.test.tsx`
12. `client/tests/lab-02/MyTickets.test.tsx`
13. `client/tests/lab-02/RequesterSelection.test.tsx`
14. `client/tests/lab-02/RequesterTicketDetail.test.tsx`
15. `client/tests/lab-03/AdminUserManagement.test.tsx`
16. `client/tests/lab-03/RequesterResolution.test.tsx`
17. `client/tests/lab-03/StaffWorkflow.test.tsx`
18. `client/tests/lab-04/ActionsTakenIntegration.test.tsx`
19. `client/tests/lab-04/DashboardActionLink.test.tsx`
20. `client/tests/lab-04/DashboardApi.test.tsx`
21. `client/tests/lab-04/DashboardNavigation.test.tsx`
22. `client/tests/lab-04/RequesterDashboard.test.tsx`
23. `client/tests/lab-04/StaffDashboard.test.tsx`
24. `client/tests/lab-04/dashboard-fixtures.ts`
25. `client/tests/lab-04/mock-dashboard-navigation.ts`
26. `docs/lab-04/api-spec.md`
27. `docs/lab-04/dashboards-report.md`
28. `docs/lab-04/specification.md`
29. `docs/lab-04/tests.md`
30. `docs/lab-04/ui-spec.md`
31. `e2e/lab-04/dashboard-fixtures.ts`
32. `e2e/lab-04/dashboard-test-server.ts`
33. `e2e/lab-04/dashboards.spec.ts`
34. `server/src/app.ts`
35. `server/src/dashboard/dashboard.routes.ts`
36. `server/src/dashboard/dashboard.rules.ts`
37. `server/src/dashboard/dashboard.service.ts`
38. `server/src/staff/staff.routes.ts`
39. `server/tests/helpers/dashboard-fixtures.ts`
40. `server/tests/helpers/i5-database.ts`
41. `server/tests/lab-04/dashboard-harness.unit.test.ts`
42. `server/tests/lab-04/dashboard-service.unit.test.ts`
43. `server/tests/lab-04/dashboard.rules.unit.test.ts`
44. `server/tests/lab-04/i5-database-guard.unit.test.ts`
45. `server/tests/lab-04/requester-dashboard.api.test.ts`
46. `server/tests/lab-04/staff-dashboard.api.test.ts`
47. `artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-desktop.png`
48. `artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-mobile.png`
49. `artifacts/lab-04/screenshots/staff-dashboard/i5-administrator-tablet.png`
50. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-desktop.png`
51. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-mobile.png`
52. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-tablet.png`
53. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-empty-desktop.png`
54. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-error-desktop.png`
55. `artifacts/lab-04/screenshots/requester-dashboard/i5-requester-loading-desktop.png`
56. `artifacts/lab-04/screenshots/staff-dashboard/i5-staff-desktop.png`
57. `artifacts/lab-04/screenshots/staff-dashboard/i5-staff-mobile.png`
58. `artifacts/lab-04/screenshots/staff-dashboard/i5-staff-tablet.png`

## 7. Readiness

**Ready for the student's final review and designated peer review of I5.** AC-13/14/15 and I5 contributions to AC-18/23/24/25 have the query, component and browser evidence above. No remaining I5 code defect was found in the final security/scope review. Dashboard queries are read-only, fixed to authenticated identities, transactionally consistent and bounded; existing ownership, account gates and Ticket/Action write permissions remain intact.

One earlier backup/restore recovery test remains skipped, explicitly not passed. Full-lab accessibility, the proposed benchmark, final-main regressions/PDF submission evidence and I6/I7 work remain separate. This report does not mark the whole lab complete or claim peer approval. Kanban placement remains user-confirmed Todo; no GitHub acceptance checklist was marked complete.

Final preservation audit: all 99 original files and 83 I4 local artifacts match their recorded SHA-256 values; I4 tracked files/index unchanged. Authentication implementation and the mandatory-password block match the base. No unrelated source or environment/schema change and no staged files were found. No commit, push, PR or merge was performed. The student must review this report before authorizing publication.
