# TokTickIT

TokTickIT is an IT Service Desk application developed for CPE 334 Software Engineering. Lab 3 extends the Lab 2 Requester workflow with authenticated role-based access, IT Staff ticket operations, and Administrator user management in a responsive Zen Green UI.

## Lab 3 Features

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

Copy server/.env.example to server/.env and configure the local database and authentication settings. Do not commit real configuration or credentials.

From server, apply the existing migrations and generate the Prisma client. Seed development data when required:

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

For migration development, npm run prisma:migrate runs prisma migrate dev. To start the backend with local configuration loaded:

```powershell
node --env-file=.env --import tsx src/index.ts
```

The API defaults to http://localhost:3000. The existing npm run dev script provides watch mode; ensure the required environment configuration is loaded when using it.

## Frontend Setup

In another terminal, from the repository root:

```powershell
cd client
npm install
npm run dev
```

The frontend normally runs at http://localhost:5173 and defaults to API port 3000. If the API uses another port, configure the client API base URL to match before starting Vite. Use provisioned development accounts; credentials are intentionally not listed here.

## Tests and Builds

Run from the repository root:

```powershell
npm --prefix client test -- --run
npm --prefix server test -- --no-file-parallelism
npm --prefix client run build
npm --prefix server run build
```

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

Start PostgreSQL, the API and Vite first; Playwright does not start servers. The configured frontend URL is http://localhost:5173. Real-API browser suites default to API port 3001 and load server/.env; configure the API server and frontend API base URL consistently for that port. Alternatively, configure E2E_API_URL to match the API you already run. Use a development database, not production: these suites create and clean up disposable fixtures.

```powershell
npx playwright test --workers=1
```

Profiles are desktop Chromium, iPad Mini WebKit and Pixel 7 Chromium. Authentication, Staff ticket flow, Administrator and Requester suites use real APIs. The supplemental Staff queue suite uses mocked API responses. Generated output is under test-results/.

## Lab 3 Verification Results

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
