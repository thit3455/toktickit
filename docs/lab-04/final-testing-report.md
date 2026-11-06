# Final Lab 4 Testing Report - I7

Executed 2026-11-04 (Asia/Bangkok) from `feature/lab4-final-integration`, base `91d627afa88a9cf1d6f2730b00c5b3784d134817`. These are fresh feature-worktree results, **not final-main results**. Product source is unchanged from merged I6; I7 changes documentation/evidence only. [Machine-readable summary](../../artifacts/lab-04/i7/verification-summary.json) and [all browser case results](../../artifacts/lab-04/i7/browser-case-results.json) retain provenance.

## Actual counts

| Group | Passed | Failed | Skipped | Files / projects | Complete output |
|---|---:|---:|---:|---|---|
| Full non-dashboard backend | 722 | 0 | 0 | 29 files | [backend](../../artifacts/lab-04/i7/backend-output.txt) |
| Dashboard APIs | 16 | 0 | 0 | 2 files | [API](../../artifacts/lab-04/i7/dashboard-api-output.txt) |
| Approved performance smoke | 1 | 0 | 0 | 1 file | [smoke](../../artifacts/lab-04/i7/performance-output.txt) |
| Full frontend | 306 | 0 | 0 | 27 files | [full assertion results](../../artifacts/lab-04/i7/frontend.json) |
| Legacy Requester/auth/Admin browser | 27 | 0 | 0 | 3 specs x3 devices | [browser](../../artifacts/lab-04/i7/legacy-browser-output.txt) |
| Actions/Workflow/Staff browser | 30 | 0 | 0 | 4 specs x3 devices | [browser](../../artifacts/lab-04/i7/workflow-browser-output.txt) |
| Dashboard browser | 12 | 0 | 0 | 1 spec x3 devices | [browser](../../artifacts/lab-04/i7/dashboards-browser-output.txt) |
| Accessibility/responsive browser | 15 | 0 | 0 | 1 spec x3 devices | [browser](../../artifacts/lab-04/i7/accessibility-browser-output.txt) |

Disjoint totals: **739 backend /32 files; 306 frontend /27 files; 84 Playwright project cases /9 specs**. Browser totals are28 per project. The initial database-independent backend run passed294/11 files, zero failures/skips; those cases overlap739 and are not added. All groups passed on their first I7 execution; no test assertions, timeouts, retries, skips or application permissions were changed. No I7 product-code fix was necessary.

## Infrastructure and database coverage

Only separately approved container `toktickit-i7-a731c8e042d9` (ID `355a42f06da7f4f1b633b7f21c68a1772ac7600e5677acda9c91d6c38114d1ab`) ran PostgreSQL18.6 on Docker-assigned `127.0.0.1:59026`, using new tmpfs storage. Exact new workflow/dashboard/recovery databases and two non-elevated runners were verified before each group. All targets returned to empty user-table state afterward. The ID/owner-verified container/tmpfs was removed after the last group; no existing volume/container/database was removed.

The unchanged compatibility names in strict I4/I5/I6 helpers contain this new nonce. They do not reuse the previous removed I6 infrastructure. Inherited libpq/LAB4/database variables were filtered before child configuration. Explicit PostgreSQL18.4 psql, pg_dump and pg_restore versions passed checks; all real recovery tools accepted the isolated18.6 server. Database passwords remained in controller memory/private child environments/stdin, outside process arguments, logs and environment files.

Actual MIG-01/02: both cases passed, replaying earlier SQL, preserving earlier records/bytes/ownership/credentials/times and exercising populated ActionTaken, ActionTakenRevision and ActionCreateRequest backup/restore, original replay, restored sequences/subsequent writes and source preservation. The additive Actions migration only adds enum/tables/indexes/FKs and Ticket.version; it contains no DROP/TRUNCATE/DELETE/UPDATE or fabricated historical backfill. Earlier migration files/schema/seed/product sources were not changed. The preserved password-repair migration ran only while initializing new disposable schemas; it was not applied to development.

Actual SEED-01: all10 cases passed, including repeatability and ineligible creator/assignee/performer refusal without account overwrites. Action/workflow API cases cover concurrent actor-role/activation changes, optimistic versions, serialization retry limits, forced revision/event failures and full rollback. Real role/ownership/private-history/notes and initial-password restrictions passed.

## Commands actually executed

The following are actual argument patterns from this run. Absolute loader/output paths were resolved inside this worktree. Sensitive configuration is intentionally omitted. Never execute DB/browser groups against a development URL; first obtain approval and validate a newly owned target as in final-integration-report.md section5. The local provisioning controller remains excluded from publication.

~~~powershell
# Root; inherited database/libpq/LAB4/API overrides removed for independent checks.
npm.cmd --prefix client test -- --run --reporter=json --outputFile=<I7-local absolute frontend.json>
npm.cmd --prefix client run build
npm.cmd --prefix server test -- --run <11 actual pure/mock files listed below> --no-file-parallelism --reporter=json --outputFile=<I7-local absolute backend-independent.json>
server/node_modules/.bin/tsc.cmd --project server/tsconfig.json --noEmit
npm.cmd --prefix server run build

# Root; private approved controller supplies verified disposable-only variables.
node --import <file-URI of server/node_modules/tsx/dist/loader.mjs> server/tests/helpers/i6-execution.ts backend
node --import <same actual loader URI> server/tests/helpers/i6-execution.ts legacy
node --import <same actual loader URI> server/tests/helpers/i6-execution.ts a11y

# Server cwd; choose the exact NEW dashboard target privately for these groups.
node node_modules/vitest/vitest.mjs run tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --no-file-parallelism --reporter=dot
node node_modules/vitest/vitest.mjs run tests/lab-04/dashboard-performance.test.ts --no-file-parallelism --reporter=dot

# Root; actual config, one worker, all three projects; JSON reporter env is PLAYWRIGHT_JSON_OUTPUT_FILE.
node node_modules/@playwright/test/cli.js test --config=playwright.i6.config.ts e2e/lab-04/actions-taken-flow.spec.ts e2e/lab-04/ticket-resolution.spec.ts e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/staff-queue.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --output=<I7 owned output> --reporter=line,json
node node_modules/@playwright/test/cli.js test --config=playwright.i6.config.ts e2e/lab-04/dashboards.spec.ts --project=desktop --project=tablet --project=mobile --workers=1 --output=<I7 owned output> --reporter=line,json

# Browser TypeScript, root: all9 spec paths plus playwright.i6.config.ts were supplied.
server/node_modules/.bin/tsc.cmd --noEmit --target ES2022 --module ESNext --moduleResolution bundler --esModuleInterop --skipLibCheck --typeRoots ./server/node_modules/@types,./client/node_modules/@types <all9 specs> playwright.i6.config.ts
node artifacts/lab-04/i7-local/compiled-health.cjs
~~~

Independent backend files, all under server/tests/lab-04: dashboard.rules.unit.test.ts; dashboard-service.unit.test.ts; i5-database-guard.unit.test.ts; dashboard-harness.unit.test.ts; ticket-workflow-harness.unit.test.ts; ticket-workflow.rules.unit.test.ts; actions-ui-access.unit.test.ts; rules.unit.test.ts; database-tools.unit.test.ts; actions-ui-harness.unit.test.ts; i6-database-guard.unit.test.ts. Exact available inventory is retained locally in initial-inventory.json.

The execution helper discovers all29 non-dashboard backend files. Legacy browser group runs e2e/lab-02/requester-ticket-flow.spec.ts, e2e/lab-03/authentication.spec.ts and user-administration.spec.ts. A11y runs e2e/lab-04/accessibility-responsive.spec.ts. Each receives explicit isolated configuration. Bare root npm test is a deliberate placeholder and was not represented as a passing suite.

Required private names: LAB4_I6_TEST_APPROVED, LAB4_I6_EXPECTED_NONCE, LAB4_I6_EXPECTED_PORT, LAB4_TEST_DATABASE_URL, LAB4_I6_DASHBOARD_DATABASE_URL, LAB4_RECOVERY_DATABASE_URL, LAB4_PG_BIN, plus I4/I5 approval/expected-database/port fields and the pinned LAB4_I6_AXE_PATH. The helpers construct owned DATABASE_URL/API ports only after strict validation; no .env/development fallback is allowed. The weaker general disposableUrl name/local guard is never treated as sufficient by itself: I6 exact identity/port/role checks and actual container/database checks run first.

## TypeScript, builds and health

- Server source/test TypeScript noEmit: passed; server production tsc build: passed. [Server build output](../../artifacts/lab-04/i7/server-build-output.txt).
- Client TypeScript and Vite production build: passed,47 modules. [Build output](../../artifacts/lab-04/i7/client-build-output.txt).
- All9 browser specs/config/imported helpers TypeScript: passed.
- Actual compiled entry server/dist/src/index.js returned health200 on owned temporary port63965, with database variables removed; only that child was stopped. [Health/config evidence](../../artifacts/lab-04/i7/configuration-health.json).
- Existing read-only frontend5173 and API3001 returned200; credentialed CORS allowed http://localhost:5173. Preview metadata identified development5433 and the mutation guard. Product source matches merged I6 exactly; no new permanent I7 application/process was created.
- Final whitespace, exact scope, secret/link and preservation audits are recorded in final-integration-report.md after documentation is finalized.

## Accessibility, responsiveness and visual evidence

Actual result:81 axe4.14.0 screen/state audits; zero violations, zero overlapping controls and zero horizontal page overflows. All93 closed-native-select contrast samples were at least15.426:1. Twenty-seven screen audits retain incomplete native-select contrast targets; these are not relabelled axe passes. [All actual audits](../../artifacts/lab-04/i7/accessibility-audits.json).

Browser projects: desktop Chromium1440x1000; tablet WebKit768x1024; mobile Chromium390x844. Each also exercised320x900 role navigation. Actual browser Tab/Enter/focus/editor/confirmation/error checks passed. The41 selected current synthetic PNGs retain source paths/hashes in verification-summary.json under the three teacher-required screenshot folders. Agent visual review inspected six current screenshots: Staff dashboard desktop, Requester dashboard mobile, Admin dashboard tablet, safe-error desktop, Action editor desktop and Requester Action read-only mobile. The original2026-11-04 draft had30 PDF pages reviewed in five contact sheets, with dense page5 and tablet/mobile form/workflow pages18/23 inspected at full render size. Tables, text, focus, field labels and responsive stacking were legible; native single-line read-only values retain horizontal value scrolling. This is agent visual inspection, not new student manual or screen-reader evidence.

Three Staff Queue project cases use deliberate mocked API coverage; controlled loading/500 feedback scenarios also mock timing/responses. The remaining required integrated workflows use real isolated APIs; supplemental mocks are not substitutes for real authorization/transaction coverage.

No I7 human screen-reader session, physical-device, OS select-popup, exhaustive zoom/high-contrast or broad WCAG certification was performed. The student's earlier I6 three-role dashboard manual review remains historical; it is not relabelled new I7 manual verification.

## Performance and limits

Actual approved1000 Tickets/3000 Actions smoke:3 warmups and20 measured authenticated sequential requests per endpoint; Requester p95 **16.27ms**, Staff p95 **20.70ms**, both below the approved2000ms target. All40 measured requests and6 warmups returned200; all samples/metadata are retained in [performance.json](../../artifacts/lab-04/i7/performance.json). This is a local smoke, not production load/SLA evidence.

No test is currently failing or skipped in the required executed groups. No new integration defect was reproduced. The earlier I6 tablet timeout remains an attributed historical reliability note; all30 current workflow cases passed without retries or a timeout change. Final-main tests/builds, I7 peer review and final Project/release evidence remain unexecuted, not passed.

## Documentation-only revision, 2026-11-05

The AI-use record and Answer Part4 were reorganized into the student's requested structure. The current PDF has32 pages. Changed pages11-14 were rendered and visually inspected;28 other content pages match the prior reviewed draft excluding page-number footers. All67 draft link targets and text bounds passed local checks. No application test, build, database command or service restart was needed for this documentation change. All application test/build counts above retain their2026-11-04 attribution.
