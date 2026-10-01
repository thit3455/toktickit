# Lab 3 Requester implementation and verification

Verified 2026-10-01 on branch `feature/lab3-requester-resolution`.

## Already implemented and retained

- Session-cookie login, current-user and logout APIs; active-user/session checks.
- Ticket creation and its category, related-system, summary, description and Requested Priority validation.
- Requester list search/filter/sort/pagination and read-only ticket detail UI.
- Attachment validation, upload, metadata listing, download and soft removal with a reason. Ownership checks already used the authenticated identity.
- Public Comment and Internal Note APIs: backend author/time, owner-only Requester access, staff/administrator access, trimmed 1–10,000-character messages, append-only behavior, safe failures.
- Public Comment rendering as React text, with Internal Notes restricted to staff UI.

These features were present, but Requester integration was not complete: the selector remained, create/list/detail omitted credentials, and the list handler was incorrectly mounted at the detail path.

## Changes

- Removed Development Requester selection, Change Requester and the public selector API. Removed identity query/body fields from frontend requests; legacy attachment helper arguments are retained for call-site compatibility but never sent.
- Restored the current identity from `GET /api/auth/me`; added Logout, role-based Requester navigation and clearing of protected state. In-flight list/detail/attachment reads cannot overwrite a later view. Initial-password users cannot call normal protected APIs before changing password.
- Corrected list routing at `GET /api/tickets`, with documented `/api/tickets/my` alias, and restored the distinct detail handler. Create/list require REQUESTER. Detail permits staff/administrator access and enforces ownership for Requesters.
- Preserved existing Requester validation and attachment behavior. Accepted all Prisma ticket statuses in the list filter and improved status-aware safe feedback.
- Added nullable `Ticket.requesterResolvedAt`, through an additive migration, and owner-only `PATCH /api/tickets/:id/resolution-indication`. It records the first server timestamp, is idempotent, and never writes status. Ticket Detail shows saving/success/error feedback and the persisted indication.
- Added comment success/retry feedback, explicit draft validation and wrapping for long text.
- Preserved Zen Green styling and converted the Requester table to labelled cards below 992px.
- Migrated existing Lab 1/2 regression fixtures to authenticated sessions, retaining their functional assertions, and added Lab 3 authorization/resolution coverage.

## Verification results

| Command / check | Final result |
|---|---|
| `npm.cmd --prefix client test` | 71 passed, 0 failed, 12 files |
| `npm.cmd --prefix server test` | 96 passed, 0 failed, 10 files |
| `npx.cmd playwright test e2e/lab-02/requester-ticket-flow.spec.ts e2e/lab-03/staff-queue.spec.ts --reporter=line --workers=1` | 9 passed, 0 failed |
| `npm.cmd --prefix client run build` | Passed |
| `npm.cmd --prefix server run build` | Passed |
| `npx.cmd prisma migrate deploy` and `npx.cmd prisma generate` (server directory) | Passed |
| `git diff --check` | Passed |

The first browser run had 3 passing workflow tests and 3 failing validation tests because the assertion used the wrong existing validation wording. Correcting the selector produced the final 9/9 result. Earlier test runs during fixture migration had obsolete-selector/unauthenticated-fixture failures; none remain in the final full suites. Sandbox Vite startup restrictions required running the checks outside the sandbox.

The 9 browser checks comprise 6 real Requester workflow/validation checks and 3 existing controlled-fixture IT Staff queue checks. Profiles: desktop Chromium, iPad Mini WebKit, Pixel 7 Chromium.

Requester browser checks use actual login cookies, HTTP APIs and PostgreSQL, with temporary users/tickets cleaned up afterward. They verify creation, detail, attachment upload, safe HTML-as-text comments, resolution persistence across reload, unchanged NEW status, logout, denied post-logout access, required validation, empty/no-results and no horizontal document overflow. Server tests separately verify download/removal, tampered identities, other-owner denial, comment boundary validation, every current status remaining unchanged during resolution, role restrictions, initial-password restriction, safe failures and replayed logout cookies.

Screenshots are generated under `test-results/lab-02-requester-ticket-fl-*/` as `requester-create.png`, `requester-list.png`, `requester-detail.png` and `requester-validation.png`. Mobile detail, tablet list and desktop validation screenshots were visually inspected. All six browser checks assert overflow bounds.

## Reproducing browser verification

Use the existing PostgreSQL database with migrations applied and normal category/system seed data. From `server`, start `node --env-file=.env --import tsx src/index.ts` with `PORT=3001`. Start the client on localhost:5173 with `VITE_API_URL=http://localhost:3001`. The browser test defaults to that API URL; `E2E_API_URL` can override it and must match the client configuration. Then run the Playwright command above from the repository root. No existing account password is required or changed.

## Files changed

Follow-up verification: IT Staff detail now displays the saved Requester indication and timestamp only for the matching ticket. Tests confirm no automatic status mutation and manual RESOLVED/CLOSED updates. Active development Requesters are seeded with initial password change required, using the existing shared password screen. Existing custom passwords are preserved. The browser results above precede these focused follow-ups; the full frontend suite and build were rerun afterward, and backend tests/build passed after the staff indication tests.

Application:

- `client/src/App.tsx`
- `client/src/api.ts`
- `client/src/TicketDiscussion.tsx`
- `client/src/Requester.css` (new)
- `server/src/app.ts`
- `server/src/auth/auth.middleware.ts`
- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/prisma/migrations/20261001090000_requester_resolution_indication/migration.sql` (new)

Tests:

- `client/tests/lab-01/App.test.tsx`
- `client/tests/lab-02/AttachmentSection.test.tsx`
- `client/tests/lab-02/CreateTicket.test.tsx`
- `client/tests/lab-02/MyTickets.test.tsx`
- `client/tests/lab-02/RequesterSelection.test.tsx`
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`
- `client/tests/lab-03/StaffWorkflow.test.tsx` (session fixture and resolution indication coverage)
- `client/tests/lab-03/TicketDiscussion.test.tsx`
- `client/tests/lab-03/RequesterApi.test.tsx` (new)
- `client/tests/lab-03/RequesterResolution.test.tsx` (new)
- `server/tests/helpers/requester.ts` (new)
- `server/tests/lab-02/attachments.api.test.ts`
- `server/tests/lab-02/create-ticket.api.test.ts`
- `server/tests/lab-02/my-tickets.api.test.ts`
- `server/tests/lab-02/requesters.api.test.ts`
- `server/tests/lab-02/ticket-detail.api.test.ts`
- `server/tests/lab-03/requester.api.test.ts` (new)
- `e2e/lab-02/requester-ticket-flow.spec.ts`
- `e2e/lab-03/staff-queue.spec.ts` (session fixture only)

Documentation:

- `docs/lab-03/specification.md`
- `docs/lab-03/api-spec.md`
- `docs/lab-03/ui-spec.md`
- `docs/lab-03/tests.md`
- `docs/lab-03/requester-verification.md` (this report)

Playwright also updated generated `test-results/.last-run.json` and screenshots. Pre-existing duplicate folders, local cookies and password-debug files were not part of this change.

## Scope and limits

All requested Requester behaviors are implemented and covered by the checks above; no required Requester item is left unverified. This is not a claim that unrelated Administrator User Management or every possible device/browser combination has been independently tested. Existing ticket/attachment data was not deleted or reseeded; cleanup is restricted to newly created test fixtures. No ticket-edit feature or formal Requester resolve/close action was introduced.
