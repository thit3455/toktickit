# IT Staff verification — 2026-09-26

## Latest review verification (2026-09-29)

The final IT Staff review branch passes 32 client tests and 50 server tests with `npm.cmd run test:staff` in each directory. Both production builds pass. These checks include ownership reassignment, active staff validation, persistence and stale claim handling. The earlier results below document intermediate checks; the complete legacy suites were not rerun for this push and their previously reported failures remain disclosed.

## Earlier results

The authenticated API integration suite passes all 7 tests. It creates two separate IT Staff accounts and two Requesters, logs each in using the real login endpoint, and cleans up its users, sessions, ticket, category, system, messages and attachment afterwards. Existing account passwords are not changed.

Verified for each staff account:

- View the ticket queue and open ticket details.
- Claim a ticket, with the authenticated staff ID saved as the assignee.
- Update IT priority to LOW, MEDIUM, HIGH and URGENT, checking database persistence.
- Update status to OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED and CLOSED, checking database persistence.

Also verified:

- Unauthenticated access is rejected; Requesters cannot use staff queue, detail or mutation APIs.
- Invalid priorities, statuses and ticket IDs are rejected; missing tickets return 404.
- Public comments are visible to the owning Requester; other Requesters cannot read or post them.
- Internal notes can be posted by one staff account and read by another. Requester reads and writes are forbidden.
- Staff can upload, list and download a PDF on another user's ticket. An unrelated Requester cannot download it.
- Attachment removal requires authentication, even if a requester ID is supplied in the query string.

Three discussion component tests pass: staff comment/note submission with session cookies, Requester-only public discussion, and failed submission preserving the draft with visible feedback.

Follow-up review: four additional App-level staff UI tests pass. They cover two staff login identities opening the queue/detail and invoking claim, priority and status actions, visible claim failure feedback, and staff attachment upload without a Development Requester selection. These UI tests mock API responses; the separate API suite uses real logins and database fixtures.

The complete client suite reproduces 25 failures in six Lab 1/2 files. Those tests expect the Development Requester screen without logging in, while the application displays `TokTickIT Login`. They fail before reaching the staff controls. The existing Requester tests were not changed or disabled.

Both server and client production builds pass.

## Changes

Added public comment and internal note controls and protected discussion APIs. Enabled staff attachment upload/list/download and corrected missing session cookies in attachment requests. Added visible success/error feedback and busy buttons for staff actions. Removed session-cookie debug logging.

## Reproduce

From `server`: `npm.cmd test -- tests/lab-03/staff.api.test.ts`

From `client`: `npm.cmd test -- tests/lab-03/TicketDiscussion.test.tsx`

For all focused staff checks, run `npm.cmd run test:staff` in each of `client` and `server`. Expected results: 7 client tests and 7 server tests pass. The normal `npm.cmd test` command still includes the legacy tests.

Run `npm.cmd run build` in each directory. The integration test requires the configured PostgreSQL database with current migrations applied.

## Limits and outstanding regression work

The pre-existing Lab 2 API suite still uses unauthenticated requests. Its baseline run has 3 passing tests, 3 failing tests and 17 skipped tests because protected ticket requests return 401. Those legacy tests need migration to authenticated fixtures; authentication was not weakened to make them pass.

This verification uses real API/database integration tests and isolated UI component tests. It does not include manual browser login, responsive screenshots or a complete browser end-to-end run. Status tests verify the currently implemented allowed values, not a transition matrix; the current API does not enforce a transition matrix.
