# TokTickIT

TokTickIT is an IT Service Desk application developed for CPE 334 Software Engineering.

Lab 2 implements the Requester Ticketing MVP and UI foundation.

## Lab 2 Features

The Lab 2 implementation includes:

- Development Requester selection
- Create Ticket
- Backend-generated Ticket Number
- Requested Priority
- Category and Related System selection
- My Tickets
- Requester-specific Ticket ownership
- Search, filtering, sorting and pagination
- Requester Ticket Detail
- Attachment upload
- Attachment download
- Attachment soft removal with a required reason
- Requester ownership and direct-access protection
- Responsive UI
- Automated backend, frontend and E2E testing

## Requirements

- Node.js
- npm
- PostgreSQL
- Docker (for the local PostgreSQL setup used during development)

## Frontend Setup

From the repository root:

```powershell
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Backend Setup

From the repository root:

```powershell
cd server
npm install
```

Copy `.env.example` to `.env` and configure the local PostgreSQL connection.

Start the backend:

```powershell
npm run dev
```

Backend:

```text
http://localhost:3000
```

Do not commit the real `.env` file.

## Prisma

Prisma is configured to use PostgreSQL.

Validate the Prisma schema from the `server` directory:

```powershell
npx prisma validate
```

Run migrations when required:

```powershell
npx prisma migrate dev
```

Seed the development data when required:

```powershell
npm run prisma:seed
```

## Backend Tests

From the `server` directory:

```powershell
npm test
```

Final Lab 2 verification:

```text
7 test files passed
23 tests passed
```

## Frontend Tests

From the `client` directory:

```powershell
npm test
```

Final Lab 2 verification:

```text
6 test files passed
25 tests passed
```

## Production Build

From the `client` directory:

```powershell
npm run build
```

The final production build completed successfully.

## End-to-End Testing

Playwright E2E tests are kept separately from the frontend unit/component tests.

E2E test location:

```text
e2e/lab-02/requester-ticket-flow.spec.ts
```

Run Playwright from the repository root:

```powershell
npx playwright test
```

Final Lab 2 verification:

```text
6 tests passed
```

## Lab 2 Documentation

Lab 2 documentation is stored in:

```text
docs/lab-02/
```

The documentation includes:

- `specification.md`
- `tests.md`
- `api-spec.md`
- `ui-spec.md`
- `reviewer.md`
- `ai-use.md`

## Lab 2 Evidence

Screenshot evidence is stored in:

```text
artifacts/lab-02/screenshots/
```

Evidence is organised into:

```text
artifacts/lab-02/screenshots/create-ticket/
artifacts/lab-02/screenshots/my-tickets/
artifacts/lab-02/screenshots/ticket-detail/
```

The evidence includes Create Ticket, Development Requester, My Tickets, Ticket Detail, Attachment and responsive UI verification.

## Repository Structure

```text
toktickit/
├── artifacts/
│   └── lab-02/
│       └── screenshots/
├── client/
│   ├── src/
│   └── tests/
│       └── lab-02/
├── docs/
│   └── lab-02/
├── e2e/
│   └── lab-02/
├── server/
│   ├── prisma/
│   ├── src/
│   └── tests/
│       └── lab-02/
├── playwright.config.ts
└── README.md
```

## Final Lab 2 Verification

| Verification | Result |
|---|---|
| Backend | 23/23 tests passed |
| Frontend | 25/25 tests passed |
| Production Build | Passed |
| Playwright E2E | 6/6 tests passed |
| Requester Ticket workflow | Verified |
| Ticket Detail | Verified |
| Attachment workflow | Verified |
| Responsive UI | Verified |