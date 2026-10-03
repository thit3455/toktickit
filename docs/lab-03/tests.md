# TokTickIT Lab 3 Test Plan

## Final recorded results and actual test paths

Source: complete pre-merge verification on 2026-10-03; exact suite counts are in [Administrator verification](admin-verification.md). The verified checkout was `lab3-staging`; the requested `feature/lab3-final-compliance` branch was absent. These are not final-main results. Part 3 test output must be collected after integration into `main`.

| Level | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Frontend | 125 | 0 | 0 |
| Backend | 163 | 0 | 0 |
| E2E | 33 | 0 | 0 |
| **Total** | **321** | **0** | **0** |

Both frontend and backend build/type checks passed. All 15 frontend suites, 13 backend suites and 5 E2E files across three device profiles passed. Initial sandbox configuration/browser-access failures were resolved by unrestricted reruns.

| Test ID / AC | Type | Expected result | Actual test paths (repository-relative) | Final recorded status |
|---|---|---|---|---|
| API-01 / AC-01 | API/E2E | Active user authenticates successfully | `server/tests/lab-03/admin.api.test.ts`; `e2e/lab-03/user-administration.spec.ts` | Passed in account lifecycle |
| API-02 / AC-01 | API/UI/E2E | Invalid credentials rejected and inactive-account feedback safe | `server/tests/lab-03/admin.api.test.ts`; `client/tests/lab-03/Login.test.tsx`; `e2e/lab-03/authentication.spec.ts` | Passed |
| API-03 / AC-02 | API/UI/E2E | Initial password requires change before protected access; confirmation validated | `server/tests/lab-03/admin.api.test.ts`; `client/tests/lab-02/RequesterSelection.test.tsx`; `e2e/lab-03/user-administration.spec.ts` | Passed |
| API-04 / AC-07 | API | Logout invalidates session, including replayed cookies | `server/tests/lab-03/requester.api.test.ts` | Passed |
| API-05 / AC-03 | API | Forged identity cannot access another Requester's tickets/attachments | `server/tests/lab-03/requester.api.test.ts` | Passed |
| API-06 / AC-04 | API/UI | Requester cannot access Internal Notes | `server/tests/lab-03/requester.api.test.ts`; `client/tests/lab-03/TicketDiscussion.test.tsx` | Passed |
| API-07 / AC-05 | API/UI | Queue queries, ownership, priority and status work with authorization | `server/tests/lab-03/staff-queue.api.test.ts`; `server/tests/lab-03/staff.api.test.ts`; `client/tests/lab-03/StaffTicketQueue.test.tsx`; `client/tests/lab-03/StaffWorkflow.test.tsx` | Passed |
| API-08 / AC-06, AC-07 | API/UI/E2E | Admin management works; unauthorized roles and logged-out requests rejected | `server/tests/lab-03/admin.api.test.ts`; `client/tests/lab-03/AdminUserManagement.test.tsx`; `e2e/lab-03/user-administration.spec.ts` | Passed |
| SAFE-01 / AC-06 | API/database | Self-deactivation and last-Admin removal rejected; Admin remains active | `server/tests/lab-03/admin-safety.api.test.ts` | Passed in isolated schema |
| REG-01 / AC-03 | API/UI/E2E | Requester workflows persist; resolution indication does not change status | `server/tests/lab-03/requester.api.test.ts`; `client/tests/lab-03/RequesterResolution.test.tsx`; `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| UI-01 / AC-05, AC-06 | Browser | Queue/Admin usable across desktop/tablet/mobile without page overflow | `e2e/lab-03/staff-queue.spec.ts`; `e2e/lab-03/user-administration.spec.ts` | Passed; Staff API mocked |
| MIG-01 / Migration, AC-01, AC-02 | Migration/API regression | Preserve Requester records, ownership and attachments; usable initial login requires password change; preserve changed passwords on rerun | `server/tests/lab-03/auth.api.test.ts` | Passed: 3 tests, isolated historical migrations and real API |
| E2E-STAFF / AC-05 | E2E | Complete real-API ownership, priority/status and notes workflow persists | `e2e/lab-03/staff-ticket-flow.spec.ts` | Passed on desktop/tablet/mobile |
| E2E-AUTH / AC-01, AC-02, AC-07 | E2E | Login, invalid/inactive feedback, password boundaries/change restriction, access after change, logout/session invalidation | `e2e/lab-03/authentication.spec.ts` | Passed: 15 checks across three devices |

Additional passing frontend suites in the 125 total: `client/tests/lab-01/App.test.tsx`, `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTickets.test.tsx`, `client/tests/lab-02/RequesterTicketDetail.test.tsx`, `client/tests/lab-02/AttachmentSection.test.tsx`, `client/tests/lab-03/RequesterApi.test.tsx`, `client/tests/lab-03/StaffQueueApi.test.tsx`, and `client/tests/lab-03/AdminApi.test.tsx`. These cover application identity, Requester form/list/detail/attachments and API adapters.

Additional passing backend suites in the 163 total: `server/tests/lab-01/health.test.ts`, `server/tests/lab-01/categories.test.ts`, `server/tests/lab-02/requesters.api.test.ts`, `server/tests/lab-02/create-ticket.api.test.ts`, `server/tests/lab-02/my-tickets.api.test.ts`, `server/tests/lab-02/ticket-detail.api.test.ts`, and `server/tests/lab-02/attachments.api.test.ts`. These preserve existing health/catalog and Requester API regression coverage.

Recorded commands:

```text
npm.cmd --prefix client test -- --run
npm.cmd --prefix server test -- --no-file-parallelism
npm.cmd exec -- playwright test --workers=1 --output=test-results/final-verification-20261003-1446
npm.cmd --prefix client run build
npm.cmd --prefix server run build
```

All five compliance gaps are resolved. MIG-01 proves migration regression. Authentication, Staff workflow, Administrator and Requester browser suites use real APIs and disposable fixtures; only supplemental `staff-queue.spec.ts` mocks responses. `authentication.spec.ts`, `staff-ticket-flow.spec.ts` and `user-administration.spec.ts` under `e2e/lab-03/` satisfy the required structure without duplicate Administrator tests. The Staff workflow covers login, queue/detail, claim/reassign, priority/status, Public Comment, Internal Note and reload persistence. The 39 reviewed screenshots and completed [visual checklist](visual-evidence.md) pass with an observation about normal single-line input viewports. Final-main output and final PDF rendering/readability remain submission steps, not unresolved application testing gaps.

## Historical focused migration repair verification

The isolated suite creates a unique PostgreSQL schema, executes actual historical migration SQL (not `db push`), inserts Lab 2 Requesters/Tickets/attachment fixtures before migration, and applies the forward password repair. Only the database connection is redirected; routes, bcrypt checks and sessions are real. The temporary schema is removed after the suite, including failed setup. Development accounts are not repair targets during this test run.

Exact new tests (all passed):

- `migrates legacy Requesters and preserves ownership and attachments when IDs change`
- `preserves existing usable credentials and inactive account state`
- `requires password change after migrated login and preserves the new password when repair reruns`

Expected and observed API results: active initial login 200, protected access before change 403 PASSWORD_CHANGE_REQUIRED, password change 200, old-password login 401, new-password login 200, ticket list/detail access 200, inactive login 403 ACCOUNT_INACTIVE. Repair reruns preserve the changed password and user record.

| Command | Result |
|---|---|
| `npm.cmd --prefix server test -- tests/lab-03/auth.api.test.ts` | 1 suite, 3 passed, 0 failed |
| `npm.cmd --prefix server test -- tests/lab-03/auth.api.test.ts tests/lab-03/requester.api.test.ts tests/lab-03/admin.api.test.ts tests/lab-02 --no-file-parallelism` | 8 suites, 100 passed, 0 failed |
| `npm.cmd --prefix client test -- --run tests/lab-02/RequesterSelection.test.tsx` | 1 suite, 7 passed, 0 failed |
| `npm.cmd --prefix server run build` | Passed, TypeScript |

Combined backend counts: auth 3, requester 23, admin 53, Lab 2 attachments 9, my-tickets 5, ticket-detail 3, create-ticket 3, requesters 1. The standalone 3 tests are included in the combined 100, not additional unique tests. No final tests were skipped. Initial execution was blocked by sandbox access; the first executable run exposed a historical Category fixture mismatch (3 tests skipped). The fixture was corrected and both subsequent runs passed.

These focused counts describe the original migration-only run. The latest complete results above supersede them: `auth.api.test.ts` now has 9 passing tests, including the 3 migration cases and 6 password boundary cases. The repair was tested in an isolated schema; application to the development database is not claimed.

## Administrator verification — 2026-10-02

See [Administrator verification](admin-verification.md) for commands, exact results, evidence and limitations. `server/tests/lab-03/admin.api.test.ts` has 53 database/API tests. `AdminUserManagement.test.tsx` and `AdminApi.test.tsx` have 43 frontend tests. `e2e/lab-03/user-administration.spec.ts` runs the real account lifecycle on desktop, tablet and mobile. Historical 2026-10-02 results were 154 backend, 114 frontend and 15 browser tests passed; zero failed. The latest complete pre-merge results at the top of this document supersede those counts. Both builds and Requester/Staff regressions pass in the latest run.

## Requester regression evidence — 2026-10-01

See [Requester verification](requester-verification.md) for implementation scope, commands, exact changed files, results and evidence. Existing Lab 1/2 Requester tests now use authenticated fixtures rather than the retired Development Requester selector. Their form, ticket, validation, search/filter/sort/pagination and attachment assertions remain exercised. Dedicated Lab 3 tests extend these with tampering, Public Comments, note denial, resolution persistence, logout replay and safe failures.

## 1. Test Strategy

Lab 3 testing validates authentication, authorization, migration, IT Staff workflow, Administrator management, UI behavior, and regression from Lab 2.

Testing levels:

- Unit Testing
- API Integration Testing
- UI Component Testing
- End-to-End Testing
- Security and Authorization Testing
- Migration Testing


## 2. Test Traceability

| Test ID | Requirement | Description |
|---|---|---|
| API-01 | AC-01 | Valid user login |
| API-02 | AC-01 | Invalid credential handling |
| API-03 | AC-02 | Initial password change requirement |
| API-04 | AC-07 | Logout invalidates access |
| API-05 | AC-03 | Requester ownership protection |
| API-06 | AC-04 | Internal Note authorization |
| API-07 | AC-05 | IT Staff ticket operations |
| API-08 | AC-06 | Administrator user management |


## 3. Authentication Tests

Test authentication features:

- Valid login
- Invalid email/password
- Inactive user login rejection
- Current user retrieval
- Logout behavior
- Session invalidation
- First login password change


Expected:

- Valid users receive authenticated access.
- Invalid users receive safe error messages.
- Passwords are never exposed.


## 4. Authorization Tests

Verify backend role protection.

Test cases:

- Requester accessing Admin APIs
- Requester accessing Internal Notes
- IT Staff accessing Admin APIs
- Unauthorized Ticket access
- Ownership validation


Expected:

Protected operations return forbidden responses.


## 5. Requester Regression Tests

Verify Lab 2 functions continue working.

Test:

- Create ticket
- View owned tickets
- Ticket detail
- Attachment access
- Public comments

Expected:

Requester identity comes from authentication, not client input.


## 6. IT Staff Tests

Verify:

- Ticket Queue retrieval
- Search
- Filtering
- Sorting
- Pagination
- Ticket ownership assignment
- IT Priority update
- Status workflow
- Public Comments
- Internal Notes


Expected:

IT Staff can manage operational ticket workflow.


## 7. Administrator Tests

Verify:

- User listing
- User search
- User creation
- Duplicate email rejection
- Role assignment
- Account activation/deactivation
- Initial password setting
- Self-deactivation prevention
- Last Administrator protection


Expected:

Only Administrators can manage users.


## 8. UI Tests

Test screens:

- Login
- Change Password
- Ticket Queue
- Ticket Detail
- User Management


Verify:

- Loading states
- Validation messages
- Error feedback
- Role navigation
- Responsive behavior


## 9. End-to-End Tests

Authentication flow:

User login → password change → application access


IT Staff flow:

Login → queue → open ticket → update ticket → add notes


Administrator flow:

Login → users → create user → update account


## 10. Definition of Testing Complete

Testing is complete when:

- All planned tests pass.
- Authorization rules are verified.
- Lab 2 regression tests remain passing.
- UI and responsive checks are completed.
- Evidence screenshots are collected.
