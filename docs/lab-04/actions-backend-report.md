# I2 Actions Taken backend implementation review

Prepared 2026-10-29; latest review 2026-10-30 (Asia/Bangkok). **Current Issue #2 status: ready for peer review.** The user confirmed the TEMPORARY correction and a successful five-file run: **157 tests passed, 0 failures**. The saved Vitest cache corroborates all five files passed. See section 16 for evidence attribution, acceptance scope and remaining review/release gaps. Codex did not rerun the database tests. This is not peer approval, merge authorization, final-main evidence or completion of all Lab 4 criteria.

Sections 1-15 retain the investigation history; their earlier pending/unverified/unapplied statements describe those earlier stages and are superseded by section 16. The migration was exercised in isolated test schemas in the reported successful run; no development/production deployment is claimed.

Updated 2026-10-29 after focused remediation: see section 11 for the seed eligibility fix, API-wide safe JSON transport handling, contract clarification and latest results (**70 passed, 41 database tests skipped**). Earlier execution results below remain historical evidence.

Database-independent verification and source review (2026-10-29, superseded by section 13): section 12 records **70 passed, 0 failed; 37 database tests excluded in the filtered run and 4 database tests not selected**. The findings below describe the source as it existed at that review.

Historical focused remediation (2026-10-30, Asia/Bangkok): section 13 records the seed actor correction, added concurrent role-change/PATCH rollback/populated recovery coverage, and **83 passed, 0 failed** database-independent checks. At that stage, all 51 database-dependent cases were unverified. The later user-executed passing run is recorded in section 16.

## 1. Branch and preflight

- Feature branch: `feature/lab4-actions-backend`.
- Verified base and current HEAD: `c58b70566e7a2c2a4ab8892e66149df2536d8abc`, fetched `origin/lab4-staging`, “Merge pull request #59 from thit3455/main”.
- Started on `feature/lab4-spec` at `9abf18d`; it was two commits behind the fetched staging reference with an identical tracked tree. The branch switch preserved existing modifications and untracked files. The index was empty before implementation and remains empty.
- Reviewed `specification.md`, `api-spec.md`, `tests.md`, `ui-spec.md`, Prisma schema/migrations/seed, auth/roles, Ticket/staff/Admin/discussion code and backend fixtures. No applicable AGENTS.md was found in the project or checked ancestor directories. The original Lab 4 PDF was not found in the project, scaffold tree or attachment directory; the four approved repository documents supplied the contract.
- Scope uses the documents' **I2 Actions Taken Backend** mapping. Live GitHub Issue/Kanban/reviewer metadata was not independently verified. No Issue, PR or review state was changed.

## 2. Files

Modified:

- `docs/lab-04/api-spec.md`: document safe transport errors and preservation of existing HTTP statuses.
- `docs/lab-04/tests.md`: extend transport and seed eligibility coverage without weakening acceptance criteria.
- `server/prisma/schema.prisma`: action enums/models, relationships and indexes; Ticket version; TicketStatusEvent storage dependency.
- `server/prisma/seed.ts`: call the additive Lab 4 seed increment after existing examples.
- `server/src/app.ts`: register action routes and safe API-wide JSON transport-error handling.
- `server/src/staff/staff.routes.ts`: permit Administrator access to the existing active IT Staff lookup.
- `server/tests/lab-03/staff.api.test.ts`: update only the corresponding Admin lookup assertion; leave I4 Ticket write permissions unchanged.

Created:

- `server/prisma/migrations/20261029090000_actions_taken/migration.sql`
- `server/prisma/seed-lab4.ts`
- `server/src/actions/actions.rules.ts`
- `server/src/actions/actions.service.ts`
- `server/src/actions/actions.routes.ts`
- `server/tests/helpers/lab4-database.ts`
- `server/tests/lab-04/rules.unit.test.ts`
- `server/tests/lab-04/actions-taken.api.test.ts`
- `server/tests/lab-04/migration-recovery.test.ts`
- `server/tests/lab-04/seed.api.test.ts`
- `docs/lab-04/actions-backend-report.md` (this report)

## 3. Implemented contract

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/tickets/:id/actions-taken` | Owned Requester or operational staff/Admin current actions; stable ordering, strict pagination and consistent count/page snapshot. |
| POST | `/api/tickets/:id/actions-taken` | Staff/Admin create a Planned action, validate active IT Staff assignee, store original normalized request/response for authorized replay. |
| PATCH | `/api/tickets/:id/actions-taken/:actionId` | Versioned content, assignment and lifecycle mutation; one resulting-state revision for the entire mutation. |
| GET | `/api/tickets/:id/actions-taken/:actionId/history` | Staff/Admin-only immutable revisions, actor name/role snapshots, version ordering and pagination. |

The existing `GET /api/staff/users` now permits Admin callers while retaining its safe projection and active IT_STAFF filter. This is the minimal backend dependency for Admin action assignment specified in UI/API contracts.

Creators and completion performers come from authenticated identity; assignment is independent of Ticket ownership. Planned/In Progress actions can start/complete/cancel according to the action matrix. Completion requires Result and an eligible assignee; cancellation requires a reason and allows an unchanged inactive assignee. Completed content corrections preserve performer/assignment/completion time; cancelled actions are immutable. Resolved/Closed/Cancelled Tickets reject new action mutations. Whole-state conditional follow-up validation applies.

Writes recheck actor and affected account facts inside Serializable transactions. Original client versions remain fixed across at most two serialization retries. Parent and action conditional updates prevent action editors from overwriting each other. State, versions, revision and creation replay record commit together. Exact replay precedes current lifecycle/version checks after current authorization, returns the original snapshot, and creates no extra effects. Changed-payload UUID reuse returns a safe conflict. Reads use RepeatableRead snapshots. Only safe DTOs/errors are returned; body allowlists reject forged identity/timestamp/server fields.

## 4. Migration and preservation

The additive migration introduces ActionStatus/ActionOperation, `Ticket.version DEFAULT 0`, ActionTaken, ActionTakenRevision, ActionCreateRequest and TicketStatusEvent. Actions start at version 1. Restrictive new foreign keys retain parent/user/history relationships, revision `(actionId, version)` is unique, and replay keys are unique by `(actorId, ticketId, requestId)`. New instants use PostgreSQL `TIMESTAMPTZ(3)`; earlier timestamp columns retain their original types.

The SQL body was generated from the verified staging schema and compared again to Prisma's baseline-to-current schema diff. An explicit BEGIN/COMMIT wraps its additive DDL. There are no drops, legacy record rewrites, fabricated legacy actions/events, password changes or timestamp backfills. Prior migration files are unchanged. **The migration has not been applied.** Actual preservation must still be verified against PostgreSQL by MIG-01.

Lab 4 seeding uses stable user/Ticket identities, empty user updates and create-only per-Ticket transactions. It supplies eight Ticket statuses, requested/IT priorities, assigned/unassigned and zero/one/many actions, separate creator/assignee/performer, inactive-assignee demonstration, pending follow-up, known new-example history and empty-user scenarios. Existing work/passwords/dates are not reset on rerun. These are synthetic demonstration records, not backfilled history for earlier Tickets. **No seed command has been run.**

## 5. Executed verification

Commands below ran from `server` unless a root command/path is explicitly shown. Windows PowerShell blocks `npm.ps1`, so successful checks use `npm.cmd`. Vitest required approved execution outside the sandbox because esbuild could not read ancestor directories under the sandbox; this did not authorize or run any database mutation.

| Command | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/rules.unit.test.ts` (before implementation) | Failed to collect because the action rules module did not exist yet; initial test-first failure, not a pass. |
| `npm.cmd test -- --run tests/lab-04/rules.unit.test.ts tests/lab-01/health.test.ts` | 2 files, 40 tests passed. |
| `npm.cmd test -- --run tests/lab-04 tests/lab-01/health.test.ts --no-file-parallelism` (initial implementation final run; superseded by section 11) | 3 files passed, 2 files skipped; **45 tests passed, 40 skipped, 0 failed**. Breakdown: 39 rule tests, 5 database-free HTTP transport/auth tests, 1 health regression passed; 37 real API, 2 migration/recovery and 1 seed tests skipped. |
| `npm.cmd --prefix server run build` (root) / `npm.cmd run build` (server) | TypeScript compilation passed, including the new source, seed and test files. |
| `node node_modules/prisma/build/index.js validate` | Prisma 5.22 schema valid. |
| `node server/node_modules/prisma/build/index.js generate --schema server/prisma/schema.prisma` (root) | Prisma Client generated successfully into ignored server/node_modules. |
| `node server/node_modules/prisma/build/index.js migrate diff --from-schema-datamodel <temporary-staging-schema> --to-schema-datamodel server/prisma/schema.prisma --script` (root) | Generated SQL matches the migration body after excluding its explicit transaction wrapper. No database connection/migration execution. |
| `git diff --check` (root) | Passed. Git also reports CRLF normalization notices for the two pre-existing modified files. |

An initial plain `npm` invocation failed under PowerShell execution policy; an initial sandboxed `npm.cmd` invocation failed loading Vitest's config due to directory access. Both were resolved using `npm.cmd` and approved execution. An initial root-directory Prisma validation lacked DATABASE_URL; the successful validation ran from server and loaded its configuration without connecting to the database. These setup failures are not test passes.

## 6. Database checks not executed

Neither `LAB4_TEST_DATABASE_URL` nor `LAB4_RECOVERY_DATABASE_URL` is configured. The existing `.env.example` names the working `toktickit` database, and earlier tests create/delete records or schemas, so the development/unknown database was not used for integration or regression checks.

Not executed: action persistence/authorization/transaction/race integrations; actual prior-SQL migration and preservation; backup/restore; repeatable full seeding; database-dependent Lab 1-3 regression. No frontend/E2E runs are claimed; this task changes no frontend. Server package.json has no lint script.

The planned database suites require an explicitly supplied PostgreSQL URL in `LAB4_TEST_DATABASE_URL`, local host and a database name matching `toktickit_lab4_test_*`. They never fall back to DATABASE_URL or load .env. Supply only a separately prepared disposable database. The helper allocates a fresh random `lab4_<uuid>` schema using CREATE without IF NOT EXISTS, deploys actual migration files, and cleans up only that invocation-owned namespace. It never creates/drops/resets an existing database. Temporary migration/backup files are retained for inspection.

Recovery additionally requires a distinct disposable `LAB4_RECOVERY_DATABASE_URL` database and PostgreSQL `pg_dump`/`pg_restore` on PATH. It verifies that the destination namespace is absent, uses a custom-format backup with SHA-256 and migration metadata, restores without --clean, compares prior records/relationships/bytes and migration checksums, then reads restored data through authenticated app APIs. A successful future run is still needed before AC-21 can be claimed.

Once those explicit disposable targets have been verified and configured, run:

```powershell
npm.cmd --prefix server test -- --run tests/lab-04 --no-file-parallelism
```

Do not run the full earlier suites until their DATABASE_URL and any child-process configuration have also been redirected to a verified disposable database with appropriate catalog fixtures. No existing database reset is required by this implementation.

## 7. Acceptance traceability

| AC / test-plan rows | Implementation / coverage | Current verification |
|---|---|---|
| AC-01; ACT-01 | Nested create, independent identities, initial state, unchanged Ticket ownership, Admin writes. | Implemented; real API tests pending DB. |
| AC-02; ACT-02 | Allowlists, required/type/UTF-16 limits, strict bools, conditional whole-state rules, safe malformed JSON. | Rules/transport passed; DB rollback/persistence cases pending. |
| AC-03; ACT-03 | Active IT_STAFF assignment/revalidation; account-deactivation race test. | Implemented; real API/race tests pending. |
| AC-04; ACT-04, UNIT-01 | All 16 action source/destination combinations, Result/reason rules and actual performer. | Rule matrix passed; real persistence/performer checks pending. |
| AC-05; ACT-05 | Completed content correction, frozen identities/times, cancelled immutability, terminal Ticket lock. | Rules passed; DB checks pending. |
| AC-06; ACT-08, AUTH-01 | Owner-only shared action reads, private histories, nested pairing, existing session gates. | Four anonymous HTTP route checks passed; owned/role/session integration pending. |
| AC-07; ACT-06 | Atomic revisions, actor snapshots, no history for replay/no-op/failure, rollback injection. | Implemented; real transaction/history checks pending; Ticket events API is I4. |
| AC-08 backend contribution; ACT-07 | Stable action createdAt/id and revision version ordering. | Implemented; DB ordering tests pending; Bangkok UI display is I3/I4. |
| AC-16 action contribution; CON-01 | Conditional action/parent versions, Serializable retry bound, competing-edit/account-race tests. | Implemented; DB races pending; Ticket workflow races are I4. |
| AC-17; DUP-01 | Normalized replay, exact stored response, actor/Ticket key scope, duplicate mutation/no-op protection. | Normalization/no-op rules passed; persisted/concurrent replay tests pending. |
| AC-19; MIG-01 | Additive SQL, actual pre-Lab-4 migration fixture and all-earlier-column/content comparison. | Schema/diff checks passed; actual migration pending. |
| AC-20; SEED-01 | Stable create-only full seed reruns with intervening edits/password/date/history snapshots. | Implemented; seed integration pending. |
| AC-21; MIG-02 | Distinct-database guarded backup/restore and authenticated application read. | Implemented; recovery rehearsal pending. |
| AC-22 contribution; REG-01 | Existing paths retained; only the approved Admin staff lookup expectation changed. | Health passed; full earlier regressions not run. |

Test filenames match the I2 required/supplementary planned paths. The database helper is supporting infrastructure, not a substitute for the planned suites. No planned Final status was relabelled as passed in tests.md.

## 8. Scope/dependencies and unresolved verification

- No frontend, dashboards, formal Ticket resolution gate, Ticket transition matrix, Ticket cancellation cascade or status-history endpoint was implemented. `/api/tickets/:id/status-history` belongs to I4. TicketStatusEvent storage is included because the approved I2 data-design/migration/seed obligations require it.
- I4 must make existing Ticket assignment/priority/status writes and the first requester-indication change participate in parent versioning, add detail metadata, and atomically enforce its resolution gate/cascades. Those existing request contracts remain unchanged here. Action-vs-resolution safety for the complete Lab 4 workflow cannot be claimed until that integration and its concurrency tests pass. This is an explicit scope dependency, not a claimed implementation of AC-09-12.
- Requester indication was not modified and cannot resolve a Ticket through the new action API. Its existing first-timestamp/advisory regression remains pending along with the other database regressions.
- The source review and database-free checks are complete. The unconfigured disposable database is the boundary for remaining execution. Do not treat skipped integrations as a pass or apply the migration to working data merely to remove a skip.
- No staging, commit, push, PR creation or merge was performed. Review is the next Git workflow step.

## 9. Reviewed diff summary

The diff is limited to action backend/storage/seed/tests, the action route/parser registration, one approved role expansion on active staff lookup, its regression assertion and this report. Old migrations, Ticket workflow handlers, auth middleware, frontend and existing local artifacts were left in place. No dependencies/frameworks were added. Generated Prisma client/build output remains ignored. The original local modifications and untracked artifacts are retained in the complete status below.

## 10. Initial implementation `git status --short`

Historical snapshot after first creating this report, before focused remediation; no files were staged. The current snapshot is included in section 11.

     M playwright.config.ts
     M server/prisma/schema.prisma
     M server/prisma/seed.ts
     M server/src/app.ts
     M server/src/staff/staff.routes.ts
     M server/tests/lab-03/staff.api.test.ts
     M test-results/.last-run.json
    ?? client/client/
    ?? client/docs/
    ?? client/src/src/
    ?? cookies.txt
    ?? docs/lab-04/actions-backend-report.md
    ?? server/check-password.js
    ?? server/prisma/migrations/20261029090000_actions_taken/
    ?? server/prisma/seed-lab4.ts
    ?? server/src/actions/
    ?? server/tests/helpers/lab4-database.ts
    ?? server/tests/lab-04/
    ?? staged-files.txt
    ?? tatus
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-desktop/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-mobile/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-tablet/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-desktop/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-mobile/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-tablet/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-desktop/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-mobile/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-tablet/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-desktop/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-mobile/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-tablet/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-desktop/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-mobile/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-tablet/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-desktop/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-mobile/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-tablet/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-desktop/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-mobile/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-tablet/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-desktop/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-mobile/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-tablet/

## 11. Focused remediation before commit (2026-10-29, Asia/Bangkok)

The user authorized only the active-assignee seed correction and complete safe JSON transport-error handling, with focused verification. Work stayed on `feature/lab4-actions-backend` at base/HEAD `c58b70566e7a2c2a4ab8892e66149df2536d8abc`. The staged diff was empty at preflight. No branch switch, reset, clean, stash, stage, commit, push, PR or merge was performed.

### Seed eligibility: BR-03/BR-23, AC-03/AC-20, SEED-01

- All newly created seed actions now reference the active IT Staff assignee. The inactive seed user remains separate and has no newly assigned work; its purpose is an actual API rejection example. There is no synthetic-fixture exception.
- Each create-only Ticket transaction checks the assignee's current active IT_STAFF eligibility before creating the Ticket/actions. Serializable isolation coordinates that check with concurrent account changes. An ineligible existing account causes a clear failure without being reactivated or re-roled.
- Existing Ticket lookup still precedes this check: completed seed reruns preserve existing work, assignments, passwords, dates and later account changes. No existing bad fixture is silently rewritten; this correction governs new fixture creation.
- The updated real-database seed tests require zero ineligible assignments on a fresh seed, authenticate/change the worker's initial password through the existing API, assert inactive-assignee rejection without writes, then verify repeated seeding preserves intervening changes and later assignee deactivation. A second test covers an already-ineligible seed account and requires no new Tickets/actions or account overwrite.
- These seed tests are written and compile, but remain unexecuted because no verified disposable database is configured. No seed or database repair was performed.

### Safe JSON transport: BR-17, AC-02/AC-18 contribution, ACT-02/FAIL-01

The error middleware remains immediately after express.json and now sanitizes API parser failures, including Express's case-insensitive API paths. It sends fixed JSON messages without body/header values, stack traces or internal details:

| Failure | Status | Code |
|---|---|---|
| Malformed JSON | 400 | INVALID_INPUT |
| JSON body over the unchanged 100 KiB parser limit | 413 | INVALID_INPUT |
| Unsupported charset or Content-Encoding | 415 | INVALID_INPUT |
| Other unreadable body, including invalid compressed JSON | 400 | INVALID_INPUT |
| Unexpected parser failure | 500 | SERVER_ERROR |

The middleware operates before route handlers and does not replace their authentication, role, validation or error handling. Valid JSON still receives the existing missing-session and login-field responses. Multipart attachment parsing/limits and non-API parser behavior are unchanged.

The API contract now explicitly documents the previously unspecified 413/415 JSON transport cases and the API-wide safe envelope. Reason: preserve existing Express HTTP statuses and request limit while removing HTML/stack disclosure on both new and existing API routes. No lifecycle, eligibility, ownership or other business rule was weakened. The test plan records this clarification and added seed coverage; its planned Final table was not relabelled as passing.

### Executed commands and actual results for this remediation

All npm commands below ran from server. As before, Vitest required approved execution outside the Windows sandbox; its initial sandboxed invocation failed to load the config and ran no tests.

| Command / stage | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/actions-taken.api.test.ts -t 'transport/authentication' --no-file-parallelism` before the code fix | 18 failed, 7 passed, 37 DB tests skipped. Failures demonstrated HTML responses from unsafe transport paths. |
| Same command after the middleware fix | 25 passed, 37 DB tests skipped, 0 failed. |
| `npm.cmd test -- --run tests/lab-04 tests/lab-01/health.test.ts --no-file-parallelism` before mixed-case coverage | 65 passed, 41 DB tests skipped, 0 failed. |
| Same collection after mixed-case coverage (final code run) | **70 passed, 41 DB tests skipped, 0 failed; 3 files passed, 2 files skipped.** Passed: 30 HTTP transport/auth checks, 39 rules, 1 health regression. Skipped: 37 real action API tests, 2 migration/recovery tests, 2 seed tests. |
| `npm.cmd run build` | Passed after implementation and again after the mixed-case path correction. |
| `git diff --check` | Passed; Git emitted line-ending normalization notices, not whitespace failures. |

LAB4_TEST_DATABASE_URL and LAB4_RECOVERY_DATABASE_URL remain unset. No migration, seed, backup/restore, database-dependent regression, frontend or E2E command was run. Full persistence/session/transaction/migration/seed guarantees therefore remain unverified. The other findings from the read-only review, including I4 workflow integration and broader test coverage, remain outside this focused remediation.

### Changes and preservation

This remediation changes seven files: `server/prisma/seed-lab4.ts`, `server/src/app.ts`, `server/tests/lab-04/seed.api.test.ts`, `server/tests/lab-04/actions-taken.api.test.ts`, `docs/lab-04/api-spec.md`, `docs/lab-04/tests.md`, and this report. No schema/migration or other Issue #2 implementation file was changed during remediation. SHA-256 comparison confirmed that all 65 other preflight modified/untracked files were unchanged, including unrelated local work. The only additional tracked-file modifications were the two documented API/test-plan clarifications; no unexpected file changes or deletions were found.

Current complete `git status --short` (no staged files):

     M docs/lab-04/api-spec.md
     M docs/lab-04/tests.md
     M playwright.config.ts
     M server/prisma/schema.prisma
     M server/prisma/seed.ts
     M server/src/app.ts
     M server/src/staff/staff.routes.ts
     M server/tests/lab-03/staff.api.test.ts
     M test-results/.last-run.json
    ?? client/client/
    ?? client/docs/
    ?? client/src/src/
    ?? cookies.txt
    ?? docs/lab-04/actions-backend-report.md
    ?? server/check-password.js
    ?? server/prisma/migrations/20261029090000_actions_taken/
    ?? server/prisma/seed-lab4.ts
    ?? server/src/actions/
    ?? server/tests/helpers/lab4-database.ts
    ?? server/tests/lab-04/
    ?? staged-files.txt
    ?? tatus
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-desktop/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-mobile/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-tablet/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-desktop/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-mobile/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-tablet/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-desktop/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-mobile/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-tablet/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-desktop/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-mobile/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-tablet/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-desktop/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-mobile/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-tablet/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-desktop/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-mobile/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-tablet/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-desktop/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-mobile/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-tablet/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-desktop/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-mobile/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-tablet/

## 12. Database-independent verification and final review (2026-10-29, Asia/Bangkok)

The user authorized database-independent verification, complete diff/traceability review and recording results. Branch remains `feature/lab4-actions-backend`; HEAD/base is `c58b70566e7a2c2a4ab8892e66149df2536d8abc`. Only this report was edited during this verification/review. No database connection, database-dependent test/setup, migration, seed, backup, restore, build, environment edit, branch change, staging, commit, push, PR or merge was performed.

### Actual commands and results

Both commands ran from `server` with approved execution outside the Windows sandbox, whose directory restrictions previously prevented Vitest configuration loading.

| Exact command | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/rules.unit.test.ts tests/lab-01/health.test.ts --no-file-parallelism` | Exit 0; 2 files passed; **40 tests passed** (39 rules + 1 health), 0 failed, 0 skipped. |
| `npm.cmd test -- --run tests/lab-04/actions-taken.api.test.ts -t 'transport/authentication' --no-file-parallelism` | Exit 0; 1 file passed; **30 HTTP tests passed**, 0 failed, 37 database tests excluded/skipped. |

Total actually executed: **70 passed, 0 failed**. The two migration/recovery and two seed tests were not selected by either command. Thus 37 were reported excluded/skipped and another 4 were not run; all 41 database-dependent cases remain unverified. These are not extra passes or another full-suite run. No tests were rerun after they passed.

### Diff and acceptance review

Reviewed all 18 Issue #2 files listed below against specification.md, api-spec.md and tests.md. Section 7 retains the detailed acceptance mapping. Current evidence boundaries are:

- AC-01/03/06 (ACT-01/03/08, AUTH-01): creation, assignment and access checks are implemented; anonymous HTTP checks passed, authenticated ownership/identity/race persistence remains unverified.
- AC-02/04/05 (ACT-02/04/05, UNIT-01): pure validation/lifecycle and transport checks passed; database rollback, performer/timestamp preservation and Ticket locks remain unverified.
- AC-07/16/17 (ACT-06, CON-01, DUP-01): revisions, conditional versions/retries and replay implementation reviewed; actual atomicity/concurrent replay remains unverified. Existing Ticket writes join the version protocol in I4.
- AC-19/20/21 (MIG-01, SEED-01, MIG-02): additive SQL, seed and recovery source reviewed; no database evidence exists for these criteria. The seed actor defect below affects the completion recommendation.
- Backend contributions to AC-08 ordering, AC-18 safe failures and AC-22 health regression are present. Full earlier regression, UI/Bangkok display and later Issue-owned features are not claimed complete. UNIT-01 currently covers actions; Ticket/gate/dashboard unit coverage remains I4/I5.

No frontend/dashboard or formal Ticket workflow was added. Admin active-staff lookup and TicketStatusEvent storage/fixture support remain documented backend dependencies. The API transport clarification preserves existing HTTP statuses and is explicitly documented; business rules were not weakened. Planned test Final values were not relabelled as passed.

### Remaining defect and blockers

1. **Medium: seed actor eligibility.** `seed-lab4.ts` preserves existing creator/performer roles and activation via empty upserts, then revalidates only the assignee (lines 27-31). If a creator or performer account is inactive or role-changed before a first/partial seed run, missing fixtures can still be created/completed with that account; new revisions can record an ineligible actor role (lines 45-59, 68-70). This is separate from the corrected inactive-assignee problem. Before calling the increment ready, validate the accounts used for new creator/performer/owner fixtures, fail safely for ineligible accounts, and preserve existing records instead of reactivating/re-roling users. Add guarded regression coverage. This finding is derived from source, not a reproduced database test. No implementation fix was made in this review turn.
2. Coverage gaps: ACT-03 has a concurrent deactivation test but no concurrent role-change equivalent; ACT-06 injects creation failure but not PATCH revision-failure rollback; MIG-02 restores earlier records with empty new action/history/replay/event tables and does not verify populated new-table recovery. Address these before claiming complete planned coverage.
3. All 41 database-dependent Lab 4 cases remain unverified. The changed Lab 3 Admin lookup regression and broader earlier regressions were also not run; they are outside that 41-case count. Safe database provisioning/configuration and separate execution authorization remain prerequisites.
4. I4 must integrate existing Ticket status/assignment/priority/indication writes with parent versions and the gate/cascades. This is a deferred dependency, not an Issue #2 scope expansion or proof of action-versus-resolution safety.

No additional endpoint code defect was established by this static review and limited passing tests. This is not a guarantee of runtime correctness without database verification. The earlier inactive new seed assignment and unsafe transport-error findings are corrected in current source; transport behavior is independently verified.

### Migration status

`20261029090000_actions_taken/migration.sql` is statically additive: two new enums, four new tables, indexes, restrictive foreign keys and `Ticket.version DEFAULT 0`, inside BEGIN/COMMIT. It contains no DROP, DELETE, legacy data UPDATE, existing-type conversion, password rewrite, fabricated legacy history or change to earlier migrations. Earlier Ticket statuses/timestamps/records remain stored as before.

**The migration has NOT been applied by this task.** No live migration-state query was made, so externally applied database state is not asserted. Real preservation/recovery remain unverified. Application/schema deployment must be coordinated because the generated Prisma client expects the new objects.

### Exact Issue #2 staging scope: 18 files, not staged

Tracked modifications:

- `docs/lab-04/api-spec.md`
- `docs/lab-04/tests.md`
- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/src/app.ts`
- `server/src/staff/staff.routes.ts`
- `server/tests/lab-03/staff.api.test.ts`

New files:

- `docs/lab-04/actions-backend-report.md`
- `server/prisma/migrations/20261029090000_actions_taken/migration.sql`
- `server/prisma/seed-lab4.ts`
- `server/src/actions/actions.routes.ts`
- `server/src/actions/actions.rules.ts`
- `server/src/actions/actions.service.ts`
- `server/tests/helpers/lab4-database.ts`
- `server/tests/lab-04/actions-taken.api.test.ts`
- `server/tests/lab-04/migration-recovery.test.ts`
- `server/tests/lab-04/rules.unit.test.ts`
- `server/tests/lab-04/seed.api.test.ts`

This is the scope allowlist, not approval to stage, commit or mark the Issue complete. Exclude every other modified/untracked path, including Playwright config/results, local client copies, cookies.txt, server/check-password.js, staged-files.txt and tatus. The index remains empty. SHA-256 comparison confirmed all 71 other preflight modified/untracked files were unchanged, with no added or deleted files. Only this report was edited in this turn.

Recommended next steps: user review of these findings; authorize the seed actor correction and missing tests; separately approve verified disposable database setup/execution; then assess real database/regression results before staging explicit Issue #2 paths and requesting peer review.

## 13. Authorized focused remediation (2026-10-30, Asia/Bangkok)

Work remained on `feature/lab4-actions-backend`, with HEAD/base `c58b70566e7a2c2a4ab8892e66149df2536d8abc`. Preflight status and the empty staged diff were inspected and SHA-256 fingerprints captured for all 72 existing modified/untracked files. No branch change, staging, commit, push, PR or merge occurred.

### Code correction and added coverage

- **Seed participants (BR-03/07/09/23, AC-01/03/20):** each missing-Ticket transaction now reads creator, assignee and performer metadata from current account rows before writing fixtures. Missing/inactive/ineligible accounts fail safely, with no account role/activation/password overwrite. The returned current rows supply revision/event attribution rather than stale metadata loaded before the transaction. Creator may be active IT Staff or Admin. Assignee must be active IT_STAFF. The seed performer doubles as Ticket Owner and must therefore be active IT_STAFF; API completion by an Admin remains permitted. This is a fixture role constraint derived from the existing ownership rule, not a changed product contract.
- Existing-Ticket lookup still precedes participant validation. Complete reruns preserve existing Tickets, actions, account changes and history; partial reruns skip earlier saved fixtures and refuse new work for ineligible participants. No existing data was repaired or seeded in this task.
- **Seed tests:** 13 database-independent cases cover active workers, Admin creator, inactive/missing accounts, Requester roles and ineligible Admin assignee/owner slots. Ten guarded database seed tests cover full repeatability after participant account changes, seven ineligible account scenarios without partial Ticket/action/revision writes, eligible preserved Admin attribution, and partial-fixture preservation. The latter tests were not executed.
- **Concurrent assignee role change (ACT-03/CON-01, AC-03/16):** a new real-database test races action creation with an actual Admin role-change request. It checks exact safe rejection codes and zero partial action/revision/receipt/version effects, or a coherent historical assignment followed by rejected completion after demotion. Written, not executed.
- **PATCH rollback (ACT-06, AC-07/16):** a new guarded test forces revision persistence to fail after a combined completion/reassignment PATCH. It compares exact Ticket/action state, versions, timestamps, performer/assignment/lifecycle fields, prior revisions and original replay receipts, and checks the safe 500 envelope. Written, not executed.
- **Populated recovery (MIG-02, AC-19/21; replay contribution AC-17):** the guarded test now creates two actions through real APIs, with distinct creator/assignee/performer, completion plus correction, five revisions and two persisted creation receipts. It captures exact Ticket/action versions, timestamps, FK identities and JSON snapshots before backup. Restore assertions compare every populated record, migration metadata and earlier data; verify owner current-action reads and staff history with preserved original attribution after an account rename; verify original 201 replay after subsequent edits, changed-payload conflict with no extra effects, and new writes using restored sequences. Source records must remain unchanged after all restored-database activity. The recovery test also deploys its guarded schema independently if selected without MIG-01. No part of it was executed in this task.

### Exact checks actually executed

Commands ran from `server`. Vitest used approved execution outside the Windows sandbox because its configuration loader previously failed under sandbox directory restrictions. Only the explicitly database-independent selections ran; no full test collection or database setup hooks ran.

| Command | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/rules.unit.test.ts tests/lab-01/health.test.ts --no-file-parallelism` | Exit 0; 2 files passed; **53 tests passed** (52 rules including 13 new seed-policy checks, plus 1 health), 0 failed, 0 skipped. |
| `npm.cmd test -- --run tests/lab-04/actions-taken.api.test.ts -t 'transport/authentication' --no-file-parallelism` | Exit 0; 1 file passed; **30 tests passed**, 0 failed, **39 database tests excluded/skipped** by selection. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; static TypeScript check passed for source and test files. No JavaScript/build files emitted and no test bodies or database operations executed. |
| `git diff --check` | Passed; line-ending normalization notices are not test failures. |

**Total tests actually executed: 83 passed, 0 failed.** The 10 seed and 2 migration/recovery database tests were not selected. Together with the 39 excluded action integration cases, **all 51 database-dependent cases remain unverified**. They are not counted as passing. The added tests compile, but compilation/pure policy checks do not prove real authorization, race behavior, transactional rollback, migration preservation, repeatable seeding or recovery.

### Remaining verification and scope

The source defect and specific written-coverage gaps recorded in section 12 have been addressed by these changes. Database execution remains the boundary: no connection, migration, seed, backup/restore, database-dependent test, environment-file change or real-record mutation occurred. The additive migration is unchanged and has not been applied by this task; live migration state was not queried. I4 Ticket transition/version/gate integration and broader Lab 1-3 database regression remain separate pending work.

Seven files changed in this focused remediation:

- `server/prisma/seed-lab4.ts`
- `server/tests/lab-04/rules.unit.test.ts`
- `server/tests/lab-04/seed.api.test.ts`
- `server/tests/lab-04/actions-taken.api.test.ts`
- `server/tests/lab-04/migration-recovery.test.ts`
- `docs/lab-04/tests.md`
- `docs/lab-04/actions-backend-report.md`

No schema/migration, API contract, endpoint implementation, environment file or unrelated work was edited. Business rules remain unchanged. The 18-file Issue #2 staging scope in section 12 is unchanged; nothing has been staged. SHA-256 comparison confirmed all 65 other preflight modified/untracked files were byte-identical, with no added/deleted files. Changed-file whitespace checks passed. Review of this remediation and separate authorization for verified disposable-database execution are the next steps; none of the unexecuted database tests is reported as passing.

Complete final `git status --short`:

     M docs/lab-04/api-spec.md
     M docs/lab-04/tests.md
     M playwright.config.ts
     M server/prisma/schema.prisma
     M server/prisma/seed.ts
     M server/src/app.ts
     M server/src/staff/staff.routes.ts
     M server/tests/lab-03/staff.api.test.ts
     M test-results/.last-run.json
    ?? client/client/
    ?? client/docs/
    ?? client/src/src/
    ?? cookies.txt
    ?? docs/lab-04/actions-backend-report.md
    ?? server/check-password.js
    ?? server/prisma/migrations/20261029090000_actions_taken/
    ?? server/prisma/seed-lab4.ts
    ?? server/src/actions/
    ?? server/tests/helpers/lab4-database.ts
    ?? server/tests/lab-04/
    ?? staged-files.txt
    ?? tatus
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-desktop/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-mobile/
    ?? test-results/lab-02-requester-ticket-fl-00d04-tes-resolution-and-logs-out-tablet/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-desktop/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-mobile/
    ?? test-results/lab-02-requester-ticket-fl-25eb5-results-states-responsively-tablet/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-desktop/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-mobile/
    ?? test-results/lab-03-authentication-firs-dfa3c-s-after-change-8-characters-tablet/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-desktop/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-mobile/
    ?? test-results/lab-03-authentication-vali-8535b-session-and-replayed-cookie-tablet/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-desktop/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-mobile/
    ?? test-results/lab-03-staff-queue-queue-i-209a1-flow-and-opens-staff-detail-tablet/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-desktop/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-mobile/
    ?? test-results/lab-03-staff-ticket-flow-r-837b7-c-comment-and-internal-note-tablet/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-desktop/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-mobile/
    ?? test-results/lab-03-user-administration-021e2-an-account-with-persistence-tablet/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-desktop/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-mobile/
    ?? test-results/lab-03-user-administration-7eed5--user-list-without-overflow-tablet/

## 14. Database-tool credential and version remediation (2026-10-30, Asia/Bangkok)

Work stayed exclusively on Issue #60 / I2, branch `feature/lab4-actions-backend`, HEAD/base `c58b70566e7a2c2a4ab8892e66149df2536d8abc`. Preflight inspected the complete status, empty index and current helper/recovery code. No provisioned database was used or queried. Sections 1-13 retain their historical chronology; this section supersedes earlier instructions to resolve recovery tools through PATH.

### Focused implementation

- `server/tests/helpers/lab4-database.ts`: recovery tools now receive only a guarded plain database name in `--dbname`. Passwords, username and host/port are provided through a fresh child-only libpq environment. Percent-encoded credentials are decoded once. Inherited PG settings (including service, hostaddr, options and passfile) and database-URL variables are omitted; the parent environment and original URL are not changed. No password file, credential-bearing URI argument or persistent environment setting is created. `--no-password` prevents unattended prompting. Native errors/stdout/stderr/causes are not exposed by failure messages; invalid URL construction also fails without Node's secret-bearing input field.
- `postgres18Tools()` requires an absolute process-local `LAB4_PG_BIN`; it verifies `psql`, `pg_dump` and `pg_restore` with `--version`, requires PostgreSQL 18 banners and returns absolute executable paths. There is no PATH fallback. Recovery checks these versions in its setup hook before allocating its first schema. Version processes also receive the sanitized environment.
- Supported local test-tool URL query options are `schema` (removed for libpq), `sslmode`, `connect_timeout`, and `application_name`. Other options fail safely, particularly query-string host/service/password overrides that could otherwise bypass URL target guards. Explicit username/password credentials are required. This constrains test transport configuration, not the approved application business/API contract; use the proposed plain local test URLs.
- `server/tests/lab-04/migration-recovery.test.ts`: backup, archive listing and restore use the selected tools and safe invocation helper. Archive listing has no connection credentials. The restore still includes explicit --dbname to select direct restore mode, --single-transaction, --exit-on-error, --no-owner and --no-acl, without --clean. The separate/absent-destination guards and every populated action/revision/receipt, original replay, actor-history, source-preservation and subsequent-write assertion remain intact. No assertion was weakened or replaced by a mock in the real recovery test.
- New `server/tests/lab-04/database-tools.unit.test.ts`: mocks only native execution and never creates a Prisma client, runs a real executable, or connects to a database. Twenty-two cases check absolute selection/version rejection/no fallback, decoded credentials absent from arguments, unchanged parent/URL, distinct source/target credentials, noninteractive direct-restore arguments, credential-free archive listing, inherited-settings removal, supported options/IPv6, unsafe target/options rejection and sanitized failures.
- `docs/lab-04/tests.md`: adds TOOL-01 and the new unit-test path, documents the explicit PostgreSQL 18 workflow and private process-variable configuration, and retains the database approval and evidence boundaries.

Private child environments remove command-line exposure; they are not a secret vault against the authorized local OS account or administrator inspecting process memory/environment. No user credentials were printed, and no environment files were read or changed for this remediation. Relevant primary reference: [PostgreSQL 18 libpq environment variables](https://www.postgresql.org/docs/18/libpq-envars.html).

### Checks actually executed in this remediation

Test/static commands ran from `server`; Git checks ran from the repository root.

| Command | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/database-tools.unit.test.ts --no-file-parallelism` (sandbox attempt) | Exit 1: Vitest configuration could not load because sandbox parent-directory access was denied. **No test cases executed**, not a test assertion failure or pass. |
| Same command, user-approved execution outside the sandbox | Exit 0: **1 file passed, 22 tests passed, 0 failed, 0 skipped**. Native execution is mocked throughout this suite. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0: source and tests passed static checking; no build output or test/database operations. |
| Absolute `C:\Program Files\PostgreSQL\18\bin\psql.exe --version`, `pg_dump.exe --version`, `pg_restore.exe --version` | Each exited 0 and reported **PostgreSQL 18.4**. These were version requests only, not connection, backup or restore operations. |
| `git diff --check` | Passed; only existing LF/CRLF normalization notices. |
| `git diff --no-index --check -- /dev/null server/tests/lab-04/database-tools.unit.test.ts` | Exit 1 indicates the newly added file differs from /dev/null; no whitespace errors were emitted (only an LF/CRLF notice). This is not a test result. |

**New executed test result: 22 passed, 0 failed, 0 skipped.** The historical 83 passed in section 13 were not rerun and are not presented as fresh results. **All 51 database-dependent tests remain unverified**: 39 action integration, 10 seed and 2 migration/recovery. No database-dependent collection/setup hooks, connection, provisioning, migration, seed, backup/restore or schema cleanup occurred. The additive migration was untouched and remains unapplied by this task; external/live migration state was not queried.

### Preservation, scope and remaining approval gates

Only five files changed in this remediation:

1. `server/tests/helpers/lab4-database.ts`
2. `server/tests/lab-04/migration-recovery.test.ts`
3. `server/tests/lab-04/database-tools.unit.test.ts` (new)
4. `docs/lab-04/tests.md`
5. `docs/lab-04/actions-backend-report.md`

SHA-256 comparison confirmed all **68 other existing modified/untracked files** retained their preflight contents, with none missing or added outside this five-path scope. The previously documented 18-path I2 allowlist gains only `server/tests/lab-04/database-tools.unit.test.ts`, for 19 Issue #2 files total. This is scope documentation, not authorization to stage. Nothing was staged, committed, pushed, opened as a PR or merged; no branch switch or later Issue work occurred.

Remaining blockers are operational evidence: approve a fresh isolated cluster setup; verify data directory/server/loopback-only port 55432, separate databases and dedicated-role privileges; privately set both Lab 4 URLs and LAB4_PG_BIN; separately approve the targeted database test command in tests.md section 6.1. Actual authorization/concurrency/PATCH rollback, migration preservation, repeatable seed and populated recovery results must be recorded from that future run before completion can be claimed. No current code-level blocker was established by these focused independent checks; they cannot prove real PostgreSQL behavior.

## 15. Failed database setup investigation and TEMPORARY correction (2026-10-30, Asia/Bangkok)

The user reported **3 test files failed, 2 passed; 104 tests passed, 51 skipped; 155 total**. These are user-reported results, not a new Codex run. The user also confirmed LAB4_TEST_DATABASE_URL, LAB4_RECOVERY_DATABASE_URL and LAB4_PG_BIN are all present in the existing PowerShell session. The isolated cluster and two dedicated databases were previously verified by the user; they must be preserved, not provisioned/reset again.

### Evidence and failure diagnosis

The saved `server/node_modules/.vite/vitest/results.json` identified these failed files. It contains failure flags/durations, not complete terminal errors. Full original FAIL/stack sections were requested but not supplied; the reply confirmed the three variable-presence flags. No claim is made that the unavailable full terminal output was read.

| Failed file | Setup path | Confirmed shared blocker |
|---|---|---|
| `server/tests/lab-04/actions-taken.api.test.ts` | beforeAll -> isolated schema -> database.migrate() | Replays the preserved Lab 3 migration requiring a temporary table. |
| `server/tests/lab-04/seed.api.test.ts` | beforeAll -> isolated schema -> database.migrate() | Same migration dependency, before seed test bodies can run. |
| `server/tests/lab-04/migration-recovery.test.ts` | beforeAll -> isolated schema -> database.migrate(false) | Same dependency in the pre-Lab-4 baseline, before either migration/recovery test body runs. |

A read-only inspection of the isolated cluster log `TokTickITLab4PG18_6b92090163bd44cf9f0d01538e05f4ac/postgres.log` found **three** errors: `permission denied to create temporary tables in database "toktickit_lab4_test_actions"`. Only timestamps, the guarded database name and a fixed error classification were returned; raw logs/SQL/credentials were not printed. The source dependency is [20260917_migrate_requester_to_user/migration.sql](../../server/prisma/migrations/20260917_migrate_requester_to_user/migration.sql), which executes `CREATE TEMP TABLE requester_user_mapping`.

**Correction to earlier advice:** CONNECT and CREATE are insufficient for the actual preserved migration chain. The runner also needs **TEMPORARY** on the dedicated test databases. CREATE enables schemas; it does not imply permission to create temporary tables. Earlier statements omitting TEMPORARY in the proposed provisioning guidance and permission review were incorrect. Do not rewrite the historical migration, substitute a weaker migration test, grant superuser/CREATEDB/CREATEROLE, or convert failures into skips.

The 51 skipped test bodies are consistent with failed beforeAll migration hooks: 39 action integration + 10 seed + 2 migration/recovery. They are **not passes**. The cached failed-suite flags, confirmed variables in the user's session and three PostgreSQL permission errors establish a setup failure rather than an ordinary missing-variable guard skip in that run. Codex's separate process currently has none of those three variables; that is a separate process-inheritance limitation, not evidence that they were absent from the user's failed run. Running the database suites here without those credentials would only produce unhelpful guard skips.

### Focused changes and safe checks

- `server/tests/helpers/lab4-database.ts`: recognize this specific native permission error from stdout or stderr and append a fixed TEMPORARY requirement to the otherwise sanitized failure. Do not retain/log the raw native error, output, arguments, connection URL or cause. All database selection, version checks, schema isolation and cleanup behavior are unchanged.
- `server/tests/lab-04/database-tools.unit.test.ts`: two additional mock-only checks cover both native output streams and verify the diagnostic does not expose fixture secrets or raw error details. Existing assertions and all real database tests/guards are unchanged.
- `docs/lab-04/tests.md`: correct the required privileges, document the narrow administrator GRANT and affected-first/full-suite rerun sequence using the existing private session. This report records evidence and execution limits.

| Command executed by Codex, from server unless indicated | Actual result |
|---|---|
| `npm.cmd test -- --run tests/lab-04/database-tools.unit.test.ts --no-file-parallelism` (approved execution outside sandbox) | Exit 0; **1 file passed, 24 tests passed, 0 failed, 0 skipped**. Native/database execution is mocked. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; source/tests passed static checking, no emitted build output. |
| `git diff --check` (repository root) | Passed; only LF/CRLF normalization notices. |

These 24 unit passes are fresh results; the earlier 22/83 passes and the reported 104/51 run are separate historical results and are not added together as a new full-suite result. **The 51 database test bodies remain unverified.** No database connection, privilege change, migration, seed, backup/restore or test-schema cleanup was executed by Codex in this remediation. No password, URL or existing PowerShell session variable was changed or exposed. The historical SQL and additive Lab 4 migration are unchanged; no successful application/preservation/recovery claim is made.

### Required next action and scope preservation

The current request authorizes affected-first and then complete Issue #2 testing. A further testing-approval request is not needed. Execution is blocked by the missing TEMPORARY grant and the fact that the private runner variables live in the user's existing terminal rather than Codex's process. The administrator must authenticate privately for the narrowly scoped correction documented in tests.md section 6.1:

```sql
GRANT TEMPORARY ON DATABASE toktickit_lab4_test_actions,
    toktickit_lab4_test_recovery TO toktickit_lab4_runner;
```

This grant has **not been executed by Codex**. It changes only a database privilege, not database records, ownership or elevated role flags. The user was asked to run it with the explicit PostgreSQL 18 psql path/loopback host/port and a private password prompt, then rerun the three affected files in the already-configured session and return result/error sections without secrets. After affected files pass, run `npm.cmd test -- --run tests/lab-04 tests/lab-01/health.test.ts --no-file-parallelism` in that same session; record actual outcomes and fix any newly exposed errors before claiming completion. Those database reruns are still pending at this report update.

Only four files changed in this remediation: this report, `docs/lab-04/tests.md`, `server/tests/helpers/lab4-database.ts`, and `server/tests/lab-04/database-tools.unit.test.ts`. Preflight SHA-256 comparison confirmed the other **69 existing modified/untracked files** retained their contents with none missing or newly added outside scope. Branch remains `feature/lab4-actions-backend`; the index remains empty. No staging, commit, push, PR, merge, branch switch, cleanup/reset or later-Issue work occurred.

## 16. Successful user execution and peer-review readiness (2026-10-30, Asia/Bangkok)

**Recommendation: Issue #60 / I2 Actions Taken Backend is ready for the designated friend's peer review.** No further blocking backend code defect was identified. Peer approval, required GitHub checks, any integration/release work and later-Issue requirements remain separate. Nothing is staged or committed, and no PR/merge/closure is authorized by this recommendation.

### Actual successful result and evidence attribution

The user confirmed the permission correction had already been applied and reported a successful complete Issue #2 backend-folder run: **5 test files passed, 157 tests passed, 0 failures**. Codex independently read the saved `server/node_modules/.vite/vitest/results.json`, which corroborates `failed: false` for each of the five files below. The cache does not contain test-level counts, skip counts, the original command line or full stdout; no claim is made that it does. The reported 157 passes account for the current 157-case inventory:

| File under server/tests/lab-04 | Current cases accounted for in the reported passing run |
|---|---:|
| `rules.unit.test.ts` | 52 (action rules plus seed participant policy) |
| `database-tools.unit.test.ts` | 24 (tool selection, private credentials, safe diagnostics) |
| `actions-taken.api.test.ts` | 69 (30 transport/authentication plus 39 real database cases) |
| `seed.api.test.ts` | 10 |
| `migration-recovery.test.ts` | 2 |
| **Total** | **157** |

The 51 previously unverified database cases are included in this user-reported passing run; earlier skipped bodies have not been relabelled or added to its total. The old 83/22/24/104 results remain separate historical runs. The full successful command/output was not supplied, so no exact command or independently parsed skip count is invented. Retain the existing redacted terminal output and recovery metadata for the peer/release evidence package; a rerun is not required just to repeat these results.

The five-file scope **does not include** `server/tests/lab-01/health.test.ts` or the changed `server/tests/lab-03/staff.api.test.ts`. Their source review/equivalent Admin lookup coverage and historical health results are not a new execution of those suites. Full Lab 1-3 regression remains REG-01/I6. These limits do not prevent local peer review of I2, but they prevent claiming full regression/final-main completion.

### Fresh static checks and review activity

| Check in this review | Actual result |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` from server | Exit 0; source/test static checking passed, no emitted build output. |
| `git diff --check` from repository root | Passed; LF/CRLF normalization notices only. |
| Read-only Git status/index and scoped file inventory | Feature branch/HEAD unchanged; index empty; exact scope below verified. |
| SHA-256 comparison of pre-existing modified/untracked files outside the two documentation edits | All 71 other files unchanged; none missing or added outside scope. |

No tests were rerun. No database connection, provisioning, grant, migration, seed, backup/restore or cleanup was performed by Codex in this review. Only this report and `docs/lab-04/tests.md` changed. Current code/test files therefore remain the reviewed implementation, with no code change requiring a fresh test run after the user's successful result.

### PDF and approved-contract acceptance review

Review uses the complete original 11-page `SE+Lab+4.pdf` previously read in this conversation (including its dashboard illustrations), together with the approved specification/API/UI/test contract. Earlier statements that the original PDF could not initially be located describe the initial implementation stage; it was subsequently found in Downloads and read completely. PDF obligations are distinguished from the approved student decisions; no contract requirement was weakened or changed in this review.

| PDF obligation / approved AC | I2 implementation and passing-run contribution | Boundary |
|---|---|---|
| Sections 4.3-4.4/8.3 and Part 6; AC-01-06 | Ticket-child actions, independent owner/creator/assignee/performer, required fields, active IT_STAFF assignment, authorized staff/Admin operations, owned requester read-only access, lifecycle/completion/cancellation and safe validation. ACT-01-05/08, AUTH-01 action subset and rules. | UI controls/rendering remain I3. |
| Part 7; AC-07 and backend AC-08 | Atomic immutable revisions and actor snapshots, stable createdAt/id order, version-ordered history, no revisions for rejected/no-op/replayed mutations, terminal identity/state restrictions. ACT-06/07. | Ticket events/history endpoint and Bangkok UI display remain I3/I4. |
| Sections 6.1/8.5; action AC-16/17 | Conditional action/parent versions, Serializable bounded retries, concurrent duplicates/editors/assignee changes, original-response replay and POST/PATCH rollback. CON-01 action subset, DUP-01, ACT-03/06. | Existing Ticket writes must join the version/gate protocol in I4; full action-versus-resolution concurrency is not claimed here. |
| Sections 5.1-5.2; AC-19 | Additive two enums/four tables/Ticket.version; restrictive relationships and indexes; original SQL chain replayed and prior values/relationships/attachment bytes preserved, with no fictional history. MIG-01. | Applied only in disposable test schemas in the reported run; no development/production deployment is claimed. |
| Section 5.3; AC-20 I2 contribution | Actual seed entry point repeatability, preserved accounts/work, creator/assignee/performer eligibility and current attribution, zero/one/many actions and representative statuses/priorities/ownership. SEED-01 plus seed policy checks. | Dashboard query/aging reconciliation remains I5. |
| Section 5.2; AC-21 | Separate absent-destination schema, custom backup/hash/migration metadata, populated action/revision/replay equality, application reads/history, original replay and restored-sequence writes with unchanged source. MIG-02. | Reviewer should inspect retained recovery artifacts; no automatic down migration or existing-database reset is introduced. |
| Sections 4.3/6/8.5; safe backend failure contribution | Strict fields and bounded reads; server identities; safe JSON transport errors; safe DTO/history projections; child-only backup credentials, explicit PostgreSQL 18 tools and fixed permission diagnostics. ACT/AUTH/TOOL-01. | Recoverable UI drafts, complete prior regression and final product hardening remain I3/I6. |

The four action endpoints match the API contract: GET/POST `/api/tickets/:id/actions-taken`, PATCH `/api/tickets/:id/actions-taken/:actionId`, and GET `/api/tickets/:id/actions-taken/:actionId/history`. The only existing staff API permission increment is approved Admin access to the active-staff lookup; other Ticket-write permissions are unchanged. The JSON transport clarification is documented in api-spec.md. No unrelated frontend feature or new product requirement was added.

Security/transaction review found no new must-fix defect: actor/assignee facts are rechecked transactionally, writes/history/replay receipts commit together, errors expose no native details, and raw schema identifiers are generated/guarded. The I2 migration contains no DROP/TRUNCATE/DELETE or legacy-record rewrites. Deployment still requires coordinating schema application before application code expecting the new objects, and allowing for ALTER/index locks. The TEMPORARY correction is required by an unchanged historical migration, not by a new elevated role or weakened assertion.

### Exact Issue #2 scope: 19 files

These are the seven modified tracked files and twelve new files belonging to I2. This allowlist is **not permission to stage**:

```text
docs/lab-04/actions-backend-report.md
docs/lab-04/api-spec.md
docs/lab-04/tests.md
server/prisma/schema.prisma
server/prisma/seed.ts
server/prisma/seed-lab4.ts
server/prisma/migrations/20261029090000_actions_taken/migration.sql
server/src/app.ts
server/src/actions/actions.routes.ts
server/src/actions/actions.rules.ts
server/src/actions/actions.service.ts
server/src/staff/staff.routes.ts
server/tests/helpers/lab4-database.ts
server/tests/lab-03/staff.api.test.ts
server/tests/lab-04/actions-taken.api.test.ts
server/tests/lab-04/database-tools.unit.test.ts
server/tests/lab-04/migration-recovery.test.ts
server/tests/lab-04/rules.unit.test.ts
server/tests/lab-04/seed.api.test.ts
```

Exclude all other work, particularly Playwright configuration/results, duplicate local client trees, cookies.txt, server/check-password.js, staged-files.txt and tatus. Existing unrelated work remains intact. Current branch/HEAD remain `feature/lab4-actions-backend` / `c58b70566e7a2c2a4ab8892e66149df2536d8abc`.

### Remaining review and integration gates

- Obtain the designated friend's actual review/comments/approval and retain the redacted 157-pass output and recovery evidence. No reviewer identity/approval or full console artifact is fabricated.
- The separate changed Lab 3 suite and broader regression were not part of the five-file run. Record them when the authorized regression scope is executed; no extra database run was performed in this review.
- I3 UI, I4 complete Ticket workflow/gate/events, I5 dashboards, I6 full regression/accessibility and I7 release/submission remain outside I2. Shared ACs are marked only for their I2 contribution in tests.md; no full-Lab completion/checklist is claimed.
- After explicit user authorization for the relevant Git steps, use the 19-file allowlist for a feature PR targeting `lab4-staging`, require peer approval and required checks, and merge only through the approved workflow. No staging/commit/push/PR/merge/Issue closure occurred here. PR #58's earlier merge into main and PR #59's synchronization into staging remain unchanged historical facts.
