# TokTickIT

TokTickIT is the integrated CPE 334 IT Service Desk application. Lab 4 adds shared Actions Taken, immutable operational history, server-enforced Ticket lifecycle and resolution, and role-based dashboards while preserving the Lab 2-3 authentication, Requester, Staff and Administrator workflows.

## Current local application ports

Use one active TokTickIT worktree for the integrated Lab 4 application and future I7: frontend http://localhost:5173, backend http://localhost:3001, development PostgreSQL localhost:5433. BankCore retains application 3000 and PostgreSQL 5432. Local Vite development and built-preview commands fail if 5173 is occupied; they do not silently select another port. [Configuration audit and safe preview](docs/lab-04/local-configuration.md) distinguishes permanent settings, isolated tests and historical evidence. Existing private environment files are never overwritten by this setup.

## Lab 4 integrated features and evidence

- Requester Dashboard: owned Open, Needs Attention and Recently Resolved metrics; bounded recent/attention lists; exact filtered drill-downs. Requesters retain My Tickets, Create Ticket, shared Detail/Actions, attachments, Public Comments and advisory resolution indication.
- Staff/Administrator Dashboard: authoritative priority/ownership/current-assignee metrics and bounded recent/action lists. Administrators retain User Management; approved I4 operational Ticket permissions supersede I3's earlier Queue-read-only prerequisite without granting unrestricted unrelated writes.
- Actions Taken: independent creator/assignee/performer, active-staff eligibility, create/edit/assign/start/complete/cancel, safe replay/version conflicts and immutable revisions. Requester visibility stays owner-only/read-only; operational history and Internal Notes remain private.
- Ticket Workflow: eight-status matrix, four-condition resolve/close gate, cancellation cascade, reopening reasons and append-only status events.
- Dashboards reuse one server asOf, inclusive creation/update cutoffs and Bangkok time. Only Recently Resolved has the seven-calendar-day window.

[Final integration report](docs/lab-04/final-integration-report.md), [fresh test results](docs/lab-04/final-testing-report.md), [requirements/evidence mapping](docs/lab-04/final-traceability.md), [peer reviews](docs/lab-04/reviewer.md), [AI use](docs/lab-04/ai-use.md) and [submission checklist](docs/lab-04/submission-checklist.md) distinguish feature-branch verification from pending final-main/release evidence. The teacher requires one nine-part PDF; no teacher submission or main merge is implied by this worktree.

## Preserved Lab 3 Features

- Email/password authentication, session-based access and logout, and required initial-password change before normal application access.
- REQUESTER, IT_STAFF, and ADMINISTRATOR roles with server-side authorization; hidden frontend controls are not the security boundary.
- Requester ticket creation, owned-ticket lists/details, generated ticket numbers, categories, related systems, search/filter/sort/pagination, and attachment upload/download/soft removal with a required reason.
- Requested Priority and separate IT Priority for operational prioritization.
- IT Staff queue and detail, claim of unassigned tickets, reassignment to active IT Staff, IT Priority and status updates.
- Public Comments and restricted Internal Notes. Requesters cannot access Internal Notes.
- Requester Problem Appears Resolved indication and timestamp, visible to IT Staff without automatically changing ticket status.
- Administrator user listing/search/filter/sort/pagination, creation, editing, activation state, and setting an initial password requiring change at next login. Self-deactivation and removal of the last active Administrator are protected.
- Responsive desktop/tablet/mobile tables, forms, badges, actions, and feedback.

The Lab 2 Development Requester selector is retired. Current user identity comes from authentication.

## Requirements

- A current Node.js release supporting process.loadEnvFile (Node.js 22 recommended)
- npm and PostgreSQL
- Docker only if used to host local PostgreSQL

## Backend Setup

From the repository root:

```powershell
cd server
npm install
```

For a new installation only, create server/.env from server/.env.example if it does not already exist, then configure the approved database and authentication settings privately. Preserve existing environment files. Do not commit or display real configuration or credentials.

The existing approved read-only preview requires no migrations or seeds. Fresh database initialization is a separate operation requiring an explicitly approved target; the commands below are not part of a port switch or manual preview. From server, apply existing migrations and generate the Prisma client only for that approved initialization:

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

For migration development, npm run prisma:migrate runs prisma migrate dev. To start the backend with local configuration loaded:

```powershell
$env:PORT = "3001"
node --env-file=.env --import tsx src/index.ts
```

The API defaults to http://localhost:3001. The existing npm run dev script provides watch mode; ensure the required environment configuration is loaded when using it.

## Frontend Setup

In another terminal, from the repository root:

```powershell
cd client
npm install
npm run dev
```

The frontend normally runs at http://localhost:5173 and defaults to API port 3001. If the API uses another port, configure the client API base URL to match before starting Vite. Use provisioned development accounts; credentials are intentionally not listed here.

## Tests and Builds

Run from the repository root:

```powershell
npm --prefix client test -- --run
npm --prefix client run build
npm --prefix server run build
```

Database-backed server tests require the separately approved disposable setup and [I6 guarded execution instructions](docs/lab-04/regression-report.md); do not point them at the development database or the read-only manual preview.

The frontend build runs TypeScript checking and Vite production compilation; the backend build runs TypeScript compilation. Root npm test is a placeholder, so use the client/server commands above.

Test locations:

- Backend/API: server/tests/lab-03/, including auth.api.test.ts for isolated migration regression and password-boundary coverage, plus Administrator, safety, Requester and Staff suites.
- Frontend component/API-adapter: client/tests/lab-03/.
- Earlier regression coverage: client/tests/lab-01/, client/tests/lab-02/, server/tests/lab-01/, server/tests/lab-02/.
- Lab 3 browser tests: e2e/lab-03/authentication.spec.ts, e2e/lab-03/staff-ticket-flow.spec.ts, e2e/lab-03/user-administration.spec.ts, and e2e/lab-03/staff-queue.spec.ts.
- Requester browser regression: e2e/lab-02/requester-ticket-flow.spec.ts.

### Playwright

Install root dependencies and browser engines from the repository root:

```powershell
npm install
npx playwright install chromium webkit
```

The regular playwright.config.ts retains the standard frontend URL http://localhost:5173. Current Lab 4 database-backed verification uses explicit guarded fixture servers, playwright.i6.config.ts, a separate test frontend on 5174 and allocated API ports. Follow the [I6 commands and private configuration requirements](docs/lab-04/regression-report.md); do not run database-backed tests against the running development preview or load development .env files for fixtures.

The profiles remain desktop Chromium, iPad Mini WebKit and Pixel 7 Chromium. Real API and supplemental mocked coverage are identified in the I6 report. Historical Lab 3 results below remain attributed to their original runs.

## Safe Lab 4 demo and seed behavior

The existing development preview is read-only for business data; normal login/logout remains available. Use current account credentials privately. Do not reset accounts to demonstrate the UI. Mandatory first-login password change must finish before normal role navigation; the old temporary password must stop working afterward.

For an explicitly approved **fresh database only**, the setup seed includes create-only Lab 4 examples. It never repairs existing account roles, activation or passwords to make fixtures eligible. If an existing seed participant is ineligible, inspect that account-specific condition; do not force-update users or reset the database. Seed repeatability, actor eligibility, additive migration preservation and populated recovery are tested in disposable schemas. Do not run blanket migrations, seeds or restore against an existing development/production database as a demo or port switch.

In the read-only preview, inspect each role's Dashboard, metric drill-down, list filters, Ticket Detail, Actions and permitted history. To demonstrate saved mutations, use the separately approved disposable test environment: Staff records/assigns/completes work; resolution requires an active Staff owner, completed Result, no active work and no pending follow-up; reopen requires a reason; cancellation retains history and cancels outstanding work. Requesters see only owned shared data; Staff/Admin operational access does not grant requester impersonation. The automated fixture servers create only synthetic accounts/Tickets in their owned schemas and clean them afterward.

For a new final-main verification after review, follow [final testing commands and guards](docs/lab-04/final-testing-report.md). Rebuild and rerun against the actual main commit; do not relabel earlier feature results as main results. No new permanent port is required for I7.

## Historical Lab 3 Verification Results

| Verification | Result and verification scope |
|---|---|
| Frontend unit/component tests | Previously recorded: 15 test files passed; 125/125 tests passed; not asserted as a final-main run |
| Backend/API tests | Final main: 13 test files passed; 163/163 tests passed |
| Full Playwright E2E | Final main: 33/33 passed |
| Combined tests | Previously recorded: 321 passed, 0 failed, 0 skipped; not a final-main aggregate |
| Frontend production build | Final main: Passed |
| Backend TypeScript build | Final main: Passed |
| Responsive UI | Final main: manually verified across desktop/tablet/mobile |

Final verification on `main` has been completed, as confirmed by the project author, for the backend/API tests, full Playwright suite, both builds, and manual responsive UI review listed above. The 125 frontend tests and 321 combined total remain previously recorded evidence from [Test results](docs/lab-03/tests.md) and [Administrator verification](docs/lab-03/admin-verification.md); they are not claimed as exact final-main counts. See also [Visual evidence](docs/lab-03/visual-evidence.md) for the recorded screenshot review. Final PDF screenshot readability must still be checked when rendering the submission.

## Lab 3 Documentation

Current documentation is in docs/lab-03/:

- [specification.md](docs/lab-03/specification.md)
- [tests.md](docs/lab-03/tests.md)
- [ui-spec.md](docs/lab-03/ui-spec.md)
- [api-spec.md](docs/lab-03/api-spec.md)
- [reviewer.md](docs/lab-03/reviewer.md)
- [ai-use.md](docs/lab-03/ai-use.md)
- [admin-verification.md](docs/lab-03/admin-verification.md)
- [it-staff-verification.md](docs/lab-03/it-staff-verification.md)
- [requester-verification.md](docs/lab-03/requester-verification.md)
- [ticket-queue-verification.md](docs/lab-03/ticket-queue-verification.md)
- [visual-evidence.md](docs/lab-03/visual-evidence.md)

## Screenshot Evidence

Submitted screenshots are in artifacts/lab-03/screenshots/, grouped into authentication/, requester/, staff-queue/, staff-ticket-detail/, and user-management/. The visual evidence document records capture sources, responsive review and limitations. Long values can exceed native single-line input viewports without truncating stored data; this is recorded as PASS with observation.

Historical Lab 2 documentation and screenshots remain in docs/lab-02/ and artifacts/lab-02/screenshots/. They describe the earlier development stage, not current authentication or role behavior.

## Repository Structure

```text
toktickit/
|-- artifacts/
|   |-- lab-02/screenshots/        Historical evidence
|   `-- lab-03/screenshots/
|       |-- authentication/
|       |-- requester/
|       |-- staff-queue/
|       |-- staff-ticket-detail/
|       `-- user-management/
|-- client/
|   |-- src/
|   |-- tests/
|   |   |-- lab-01/
|   |   |-- lab-02/
|   |   `-- lab-03/
|   `-- package.json
|-- docs/
|   |-- lab-02/
|   `-- lab-03/
|-- e2e/
|   |-- lab-02/
|   `-- lab-03/
|-- server/
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   |-- src/
|   |-- tests/
|   |   |-- helpers/
|   |   |-- lab-01/
|   |   |-- lab-02/
|   |   `-- lab-03/
|   `-- package.json
|-- playwright.config.ts
|-- package.json
`-- README.md
```

The tree shows principal source, test, documentation and evidence paths; generated output and local configuration are omitted.
