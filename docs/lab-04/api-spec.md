# TokTickIT Lab 4 REST API Contract

Status: **planned contract, not implemented or tested**. PDF section 6 requires exact capabilities/contracts and safe authorization/conflicts. Paths, DTOs, limits, matrices and mechanisms here are student-approved design choices (SD), not prescribed PDF routes. [specification.md](specification.md) defines FR/BR/AC and is authoritative for the action/Ticket matrices and four-condition gate; [tests.md](tests.md) maps planned verification. Existing API statements below are code inspection, not runtime proof.

## 1. Existing API inventory and approved changes

| State | Actual route(s) | Lab 4 treatment |
|---|---|---|
| Existing | `GET /api/health`, `/api/categories`, `/api/related-systems` | Preserve health/catalog shapes and behavior. |
| Existing | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout` | Preserve server cookie sessions, initial-password gate, active-user checks, bcrypt and logout/replay behavior. No auth-framework replacement. |
| Existing | `POST /api/tickets`; requester `GET /api/tickets` and `/api/tickets/my`; `GET /api/tickets/:id` | Preserve ownership, creation and existing list contracts; add documented filters/version metadata only. Retired `/api/requesters` is not restored. |
| Existing | `POST/GET /api/tickets/:id/attachments`; `GET /api/attachments/:attachmentId/download`; `DELETE /api/attachments/:attachmentId` | Preserve upload/type/size/count, metadata, ownership, safe download and removal-reason behavior. No new action-upload endpoint. |
| Existing | `GET/POST /api/tickets/:id/comments` and `/internal-notes` | Preserve public/role-restricted access and safe projections. |
| Existing | `PATCH /api/tickets/:id/resolution-indication` | Keep owner-only idempotent first timestamp; no status mutation. First actual timestamp change also advances Ticket version internally; request shape unchanged. |
| Existing, increment planned | `GET /api/staff/tickets`, `/api/staff/tickets/:id`, `/api/staff/users` | Extend to active Administrator operational use; add exact filters/detail version/allowed-transition metadata. Keep safe existing data projections. |
| Existing, increment planned | `PATCH /api/staff/tickets/:id/assign`, `/priority`, `/status` | Preserve paths; add mandatory expectedTicketVersion and Admin access, current-source matrix/gate/reason/conflict handling. This intentionally changes old unversioned mutation requests. |
| Existing | `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/password` | Preserve account restrictions/session revocation/last-active-Admin/self-deactivation safeguards. Coordinate role/activation changes with workflow transactions; do not add user deletion. |
| New, planned | `GET/POST /api/tickets/:id/actions-taken`; `PATCH /api/tickets/:id/actions-taken/:actionId` | Current action read/create/edit/assignment/lifecycle. |
| New, planned | `GET /api/tickets/:id/actions-taken/:actionId/history`; `GET /api/tickets/:id/status-history` | Staff/Admin-only immutable operational history. |
| New, planned | `GET /api/requester/dashboard`; `GET /api/staff/dashboard` | Concise owned/operational aggregates and bounded summaries; Admin reuses staff endpoint. |

Repository documents sometimes describe `/api/staff/tickets/:id/owner` and `ownerId`; current code uses `/assign` and `assignedStaffId`. The contract preserves the implemented path, not the historical discrepancy. Existing requester list parameters differ from staff queue parameters; do not rename them globally.

## 2. Authentication, authorization and security matrix

All new protected routes use existing `authenticateToken`/role enforcement and server session identity. No body/query/header can substitute requester/actor/performer identity. Inactive or must-change-password users remain blocked by existing middleware. Operational writes revalidate active actor/role and affected account facts inside transactions. Frontend visibility is not authorization.

| Capability | REQUESTER | IT_STAFF | ADMINISTRATOR |
|---|---|---|---|
| Current action list | Owned Ticket only, all statuses/shared fields | Any operational Ticket | Same |
| Create/edit/reassign/complete/cancel action | 403 | Allowed by state/validation | Same |
| Action revisions/Ticket status history | 403 | Allowed | Allowed |
| Requester dashboard | Own session identity only | 403 | 403; use operational dashboard |
| Staff dashboard/Queue/Detail/active staff lookup | 403 | Allowed | Allowed |
| Formal Ticket transitions/priority/reassignment | 403 | Allowed by matrix/version/gate | Same; explicit eligible staff for ownership |
| Advisory resolution indication | Existing owner-only behavior | Existing role denial | Existing role denial |
| Public Comments/Attachments/Internal Notes | Existing permissions, Internal Notes denied | Existing permissions | Existing permissions |
| User management | 403 | 403 | Existing safeguards |

For requester action reads, another owner's Ticket and missing Ticket both return 404. Validate nested `(ticketId, actionId)` together, so an action from another Ticket is never returned/changed. Reject forbidden role before exposing target data. Do not include password/session hashes, attachment bytes or Internal Notes in action/dashboard/history DTOs. Actions Taken content is shared with the Ticket owner; private material belongs in existing Internal Notes. Histories are staff/Admin-only by SD interpretation of the handout.

## 3. Shared request, DTO and error conventions

- Normal requests/responses are JSON; use `credentials: include` with the existing session cookie. Preserve existing configured CORS behavior.
- IDs are positive signed 32-bit integers. Versions are nonnegative safe integers (action expectedVersion >=1). Unknown/body identity/server timestamp fields are 400, not silently assigned. Do not accept arrays/objects where scalar values are required.
- Plain-text fields are trimmed and limited as specification BR-04; use consistent JavaScript UTF-16 length rules. Empty optional text normalizes to empty string. Booleans must be JSON booleans, not `"false"`.
- New instants serialize ISO-8601 UTC with milliseconds. Display timezone is returned separately. New creation/update/completion/cancellation/event timestamps are server-controlled.
- Action/history list queries: `page` positive integer default 1 (maximum 1000000), `limit` 1-100 default 20 for current actions/50 for history. Fixed chronological order, no requester-supplied actor scope. Return safe 400 for invalid/unknown list query keys. No delete/history-modification routes exist.
- Each successful current-state write returns refreshed relevant versions; subsequent UI reads fetch authoritative current data. Treat replayed creation responses as original snapshots, not guaranteed current state.

### ActionDTO

Every current action item contains exactly these business fields and safe user projections:

```json
{
  "id": 71,
  "ticketId": 42,
  "description": "Inspect the wireless driver and connection logs",
  "result": "",
  "followUpRequired": true,
  "followUpNote": "Ask the requester to test the next class session",
  "attachmentNotes": "See wifi-error.png in Ticket Attachments",
  "status": "PLANNED",
  "createdBy": { "id": 8, "name": "Staff A" },
  "assignedTo": { "id": 9, "name": "Staff B", "role": "IT_STAFF", "isActive": true },
  "performedBy": null,
  "createdAt": "2026-10-27T04:00:00.000Z",
  "updatedAt": "2026-10-27T04:00:00.000Z",
  "completedAt": null,
  "cancelledAt": null,
  "cancellationReason": null,
  "version": 1
}
```

PerformedBy becomes `{id,name}` from authenticated completing user and never derives from assignment. Inactive assignees remain readable; completion then requires reassignment. Examples throughout are illustrative fixtures, not actual stored records or verified results.

### Safe errors and status codes

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fields": { "followUpNote": "Enter a note when follow-up is required." }
  }
}
```

| Status | Codes/examples for new/changed operations | Meaning/recovery |
|---|---|---|
| 200 | Read/update success | Data uses the route's documented DTO. |
| 201 | Create success/replay | One original create; replay indicator distinguishes retry. |
| 400 | INVALID_INPUT, INVALID_ID, INVALID_QUERY, VALIDATION_ERROR, INVALID_ASSIGNEE, NO_CHANGES | Malformed JSON/unsupported fields/type/range/conditional validation or no effective mutation. For Ticket status, fresh same-status request is NO_CHANGES after version check and before matrix/conditional-reason/gate checks. Safe fields map where useful. |
| 401 | UNAUTHENTICATED, INVALID_SESSION, SESSION_EXPIRED | Existing session rules; return to authentication. |
| 403 | FORBIDDEN, ACCOUNT_INACTIVE, PASSWORD_CHANGE_REQUIRED | Role/account/initial-password restriction; no protected DTO. |
| 404 | TICKET_NOT_FOUND, ACTION_NOT_FOUND | Missing or inaccessible parent/resource; no cross-owner existence disclosure. |
| 409 | STALE_UPDATE, CONCURRENT_UPDATE, INVALID_TRANSITION, RESOLUTION_GATE_FAILED, TICKET_NOT_ACTIVE, ACTION_IMMUTABLE, IDEMPOTENCY_CONFLICT, TICKET_ALREADY_ASSIGNED | Stale Ticket status version takes precedence over same-status/no-change and transition/gate checks; fresh different unlisted transition is INVALID_TRANSITION. Retain draft; refresh then explicitly reapply; never blindly update expected version and resend. |
| 413 | INVALID_INPUT (JSON transport) | JSON body exceeds the existing parser limit of 100 KiB. Existing attachment-specific errors retain their contracts. |
| 415 | INVALID_INPUT (JSON transport) | Unsupported JSON charset or Content-Encoding; no submitted encoding value is echoed. |
| 500 | SERVER_ERROR | Generic operation-safe message, no SQL/stack/storage/credential details. |

Resolution error may include safe blocker messages using `fields.currentStatus`, e.g. `"Complete or cancel outstanding actions and clear required follow-up before resolving."` Staff detail metadata below supplies precise authorized blockers. JSON parse errors must use the safe JSON envelope on new routes rather than Express HTML stack output. Existing attachment-specific 413/415 and prior endpoint error contracts remain valid.

**Focused-remediation clarification (2026-10-29):** parser failures use the same safe `{ error: { code, message } }` envelope across `/api` routes, including existing authentication/Ticket routes. Malformed JSON is 400 INVALID_INPUT (`Supply valid JSON.`); oversized JSON is 413 INVALID_INPUT (`JSON request body is too large.`); unsupported charset/content encoding is 415 INVALID_INPUT (`JSON request encoding is not supported.`). Other unreadable bodies, including invalid compressed streams, return safe 400 INVALID_INPUT. Unexpected parser failures return generic 500 SERVER_ERROR. Transport parsing still precedes authentication; valid JSON continues through existing authentication and route validation unchanged. This documents previously unspecified size/encoding cases and preserves Express's existing HTTP statuses and size limit while replacing unsafe HTML/stack responses. It does not change action eligibility, lifecycle, ownership or any other business rule.

## 4. Current action list and creation

### GET /api/tickets/:id/actions-taken (new)

Requires authorization in section 2. Query `page=1&limit=20`. Order `createdAt ASC, id ASC`, including cancelled/completed and zero-action Tickets. Requesters can page through all items, not only a hidden subset.

200 example:

```json
{
  "data": {
    "ticketId": 42,
    "ticketVersion": 4,
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

Nonempty items are ActionDTO. Count and page use one consistent read snapshot. Preserve requested valid page even when empty; current action area distinguishes no actions from later empty page and lets user return to page 1. Opening a dashboard-linked action loads its target page if necessary to make the action visible; do not change the fixed chronological sort.

### POST /api/tickets/:id/actions-taken (new)

Staff/Admin only; Ticket must be active per BR-18. Action creator may differ from Ticket Owner; do not auto-claim Ticket. Assign only active IT_STAFF. Body allowlist:

```json
{
  "requestId": "aab37f31-89b6-4f8a-8102-a86f7d0c51cf",
  "expectedTicketVersion": 3,
  "assignedToId": 9,
  "description": "Inspect the wireless driver and connection logs",
  "result": "",
  "followUpRequired": true,
  "followUpNote": "Ask the requester to test the next class session",
  "attachmentNotes": "See wifi-error.png in Ticket Attachments"
}
```

Required: requestId UUID, expectedTicketVersion, assignedToId, description. Optional result/follow-up/note fields default as BR-04. Status always PLANNED; creator/date/server IDs are not accepted from client. Conditional Follow-up Note applies even before completion. New response 201: `{ "data": { "action": ActionDTO, "ticketVersion": 4, "replayed": false } }` (ActionDTO denotes the full object above, not a JSON literal token to send).

Deduplication: unique `(actorId, ticketId, requestId)`; normalize fields/defaults and preserve original payload/expected version. After current role/Ticket access checks, an identical replay returns original stored creation snapshot/status 201 with replayed true, including after later edits or terminal Ticket transitions. Changed payload/expected version with same key is 409 IDEMPOTENCY_CONFLICT. First successful creation increments Ticket version once and appends one CREATE revision; replay never does. UI retains the UUID on ambiguous network failures and retries the identical request, refetching current state after replay. A deliberate different create gets a fresh UUID. Concurrent duplicates must converge to one committed creation, not surface a raw unique-constraint error.

## 5. Action updates, assignment and lifecycle

### PATCH /api/tickets/:id/actions-taken/:actionId (new)

Staff/Admin only. Required `expectedVersion` and `expectedTicketVersion`; at least one actual permitted change. Allow editable fields `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `assignedToId`, plus transition `status`/`reason`. Validate resulting whole state, not only submitted fields. `reason` is accepted only for cancellation. Unknown/server/identity fields fail 400. Changing parent is forbidden.

Content edit example:

```json
{
  "expectedVersion": 1,
  "expectedTicketVersion": 4,
  "description": "Inspect driver logs and reproduce the library Wi-Fi failure",
  "assignedToId": 10
}
```

Complete example:

```json
{
  "expectedVersion": 2,
  "expectedTicketVersion": 5,
  "status": "COMPLETED",
  "result": "Updated the driver and verified stable connectivity",
  "followUpRequired": false
}
```

Cancel example:

```json
{
  "expectedVersion": 2,
  "expectedTicketVersion": 5,
  "status": "CANCELLED",
  "reason": "Duplicate planned investigation; work is recorded in another action"
}
```

Follow specification BR-05-06 transition/edit matrix. On completion, nonblank Result and active staff assignee required; performer is authenticated actor, not supplied assignedToId. Completed corrections preserve performer/completedAt; cannot reassign or transition completed items. Cancelled items are immutable. An unchanged submitted status may accompany real permitted content edits, but no-effective-change request is 400 and stale expectations still take precedence as 409 after authorization/resource validation. No new terminal-state action mutations.

Response 200: `{ "data": { "action": ActionDTO, "ticketVersion": 6 } }`, with incremented action version. Append one revision for the entire atomic mutation, operation precedence STATUS > ASSIGN > EDIT; snapshot records all changed business fields. Conditional action and parent versions prevent concurrent changes/gate races. Old-version duplicate mutation is 409 with no further effect; client can GET current action before deciding whether a retry is needed.

## 6. Immutable history reads

### GET /api/tickets/:id/actions-taken/:actionId/history (new)

Staff/Admin only; page/limit from section 3; order version ASC. Requesters receive 403, including owners. Example 200:

```json
{
  "data": {
    "ticketId": 42,
    "actionId": 71,
    "items": [
      {
        "id": 901,
        "version": 1,
        "operation": "CREATE",
        "actor": { "id": 8, "name": "Staff A", "role": "IT_STAFF" },
        "createdAt": "2026-10-27T04:00:00.000Z",
        "snapshot": {
          "ticketId": 42,
          "description": "Inspect the wireless driver and connection logs",
          "result": "",
          "followUpRequired": true,
          "followUpNote": "Ask the requester to test the next class session",
          "attachmentNotes": "See wifi-error.png in Ticket Attachments",
          "status": "PLANNED",
          "createdById": 8,
          "assignedToId": 9,
          "performedById": null,
          "createdAt": "2026-10-27T04:00:00.000Z",
          "updatedAt": "2026-10-27T04:00:00.000Z",
          "completedAt": null,
          "cancelledAt": null,
          "cancellationReason": null,
          "version": 1
        }
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
  }
}
```

Snapshot is full resulting business state with IDs/ISO times; actor name/role is captured at revision time. No credentials, internal notes, session or attachment bytes.

### GET /api/tickets/:id/status-history (new)

Same roles/pagination; order createdAt ASC, id ASC. 200 `data` contains ticketId, items, pagination. Each event:

```json
{
  "id": 301,
  "fromStatus": "RESOLVED",
  "toStatus": "REOPENED",
  "actor": { "id": 8, "name": "Staff A", "role": "IT_STAFF" },
  "reason": "Connection failure returned during the next class",
  "createdAt": "2026-10-27T04:40:00.000Z"
}
```

Empty legacy history returns items [], not invented events/error. No PATCH/DELETE history capabilities. Same-state requests and requester indication generate no Ticket status event.

## 7. Existing Ticket operations with explicit increments

### GET /api/staff/tickets/:id; GET /api/tickets/:id

Retain their existing Ticket/detail shapes and safe fields. Add `version` for current Ticket. Staff/Admin detail also adds:

```json
{
  "allowedTicketTransitions": ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  "resolutionGate": { "eligible": false, "blockers": ["ACTIVE_ACTIONS", "FOLLOW_UP_REQUIRED"] }
}
```

These properties are additive within the existing data object, not a replacement response. `allowedTicketTransitions` denotes matrix-authorized destination choices for current source/actor; a gate-required choice can be shown disabled/explained when gate.eligible is false. The UI must not enable an unavailable operation. Blocker vocabulary: OWNER_REQUIRED, OWNER_INACTIVE_OR_NOT_STAFF, COMPLETED_RESULT_REQUIRED, ACTIVE_ACTIONS, FOLLOW_UP_REQUIRED. Gate can change after read, so writes always recheck. Requester generic detail does not expose operational history or gate internals. New action/history endpoints remain separate from detail to avoid unbounded embedded collections.

### PATCH /api/staff/tickets/:id/status (existing path, changed contract)

Staff/Admin; exact matrix in specification BR-10. Required body keys expectedTicketVersion/currentStatus; reason required only for an actual permitted transition to CANCELLED or REOPENED (1-500). The following error precedence is a **proposed SD clarification**, not a PDF-mandated HTTP sequence. Example valid transition request:

```json
{ "expectedTicketVersion": 9, "currentStatus": "RESOLVED" }
```

Deterministic ordering (first failing stage wins):

1. Parse transport/JSON: malformed JSON returns 400 INVALID_INPUT without performing a write.
2. Authenticate session and authorize role: existing 401/403 rules; do not expose protected Ticket state.
3. Structural validation: positive Ticket ID; object body containing only expectedTicketVersion/currentStatus/reason; required nonnegative integer version; currentStatus in the eight-value enum; supplied reason must be a string of at most 500 trimmed UTF-16 code units. Fail with safe 400. A missing/blank reason is not yet a conditional error; an unknown enum is 400, distinct from a valid enum's invalid transition.
4. Within the transaction, revalidate actor and load authorized Ticket: 403 if actor no longer permitted, 404 if missing/inaccessible.
5. Compare expectedTicketVersion: mismatch returns 409 STALE_UPDATE, even if status is now identical, matrix edge invalid, reason missing/blank or gate would fail. Retain original client expectation through serialization retries.
6. If requested status equals current status with a fresh version, return **400 Bad Request / NO_CHANGES**. Do not evaluate matrix, conditional reason or gate and do not create an event/version change, including repeated CANCELLED/REOPENED/RESOLVED requests.
7. For a different valid enum destination outside the current source/role matrix, return **409 Conflict / INVALID_TRANSITION**, before conditional reason/gate evaluation.
8. For a permitted different transition, require nonblank reason for CANCELLED/REOPENED; reject a supplied reason for other destinations. Conditional errors return 400 VALIDATION_ERROR with safe fields.
9. Evaluate four-condition gate for entering RESOLVED or CLOSED; unmet predicate returns 409 RESOLUTION_GATE_FAILED. Apply other approved workflow rules, then conditionally write and append event atomically. A race never becomes a silent overwrite: retry with original expectations or return safe 409.

Examples, each evaluated independently against Ticket 42 at version 9/currentStatus RESOLVED:

| Request body | Response | Why |
|---|---|---|
| `{ "expectedTicketVersion": 9, "currentStatus": "RESOLVED" }` | 400 NO_CHANGES | Fresh same status; gate not evaluated even if legacy work would fail it. |
| `{ "expectedTicketVersion": 8, "currentStatus": "RESOLVED" }` | 409 STALE_UPDATE | Version checked before equality. |
| `{ "expectedTicketVersion": 9, "currentStatus": "OPEN" }` | 409 INVALID_TRANSITION | Different valid enum, unlisted RESOLVED -> OPEN edge. |
| `{ "expectedTicketVersion": 8, "currentStatus": "REOPENED" }` | 409 STALE_UPDATE | Missing conditional reason does not mask stale version. |
| `{ "expectedTicketVersion": 9, "currentStatus": "REOPENED" }` | 400 VALIDATION_ERROR | Permitted fresh different transition, missing reason. |
| `{ "expectedTicketVersion": 8, "currentStatus": "UNKNOWN" }` | 400 VALIDATION_ERROR | Invalid enum is structural and precedes version check. |

Fresh same-status error example:

```json
{ "error": { "code": "NO_CHANGES", "message": "The Ticket already has the requested status." } }
```

Stale-version error example:

```json
{ "error": { "code": "STALE_UPDATE", "message": "The Ticket changed. Refresh and review before trying again." } }
```

Invalid-transition error example:

```json
{ "error": { "code": "INVALID_TRANSITION", "message": "This Ticket status transition is not permitted." } }
```

Only a successful actual transition returns 200 preserving existing `data` Ticket object with incremented version, and appends exactly one status event. Every rejected/no-change case leaves state/history/version unchanged. Ticket cancellation atomically cancels Planned/In Progress actions and appends action revisions with the Ticket cancellation reason; completed actions/history remain. Reopening preserves old indication/actions, does not auto-clear follow-up or invent performer evidence. Legacy records stay in their existing status; a future close/resolve without evidence fails gate.

### PATCH /api/staff/tickets/:id/assign (existing path, changed contract)

Body `{ "expectedTicketVersion": 9 }` means claim as current IT_STAFF; existing conflict-on-another-owner claim remains. Explicit `{ "expectedTicketVersion": 9, "assignedStaffId": 10 }` reassigns to active IT_STAFF. Admin must supply eligible assignedStaffId because it is not implicitly an IT_STAFF owner. Same-owner explicit request with no effective change returns 400; stale request 409. Retain existing safe Ticket/assignedStaff response plus version. This ownership operation remains available on existing Tickets; it does not itself reopen/change status or rewrite history.

### PATCH /api/staff/tickets/:id/priority (existing path, changed contract)

Body `{ "expectedTicketVersion": 9, "itPriority": "URGENT" }`; enum LOW/MEDIUM/HIGH/URGENT. Retain existing data object plus version. Requested Priority is not modified. Status/assign/priority clients without required version receive 400, an approved documented compatibility change; earlier tests/clients must be updated rather than skipped. Priority/assignment do not append status events, because they are not status changes.

## 8. Dashboard DTOs and exact calculations

### Common rules

Both dashboard endpoints are new GETs with **no query parameters**: reject unsupported identity/time/window controls with 400. Authenticate/authorize, then capture one server evaluation timestamp `asOf` at the start of the response's RepeatableRead snapshot and reuse that exact instant for every query, window.end and drillDown cutoff. It is not recomputed per query or in the browser. Count full matching sets and return at most five items per list; recent order is updatedAt DESC, id DESC. No entire collections, notes, bytes or account secrets.

The seven-calendar-day Recently Resolved window is already approved; the concrete field/cutoff propagation below is a **proposed SD clarification** of PDF sections 4.6/6.2, not a new prescribed window. Define `start` as Bangkok 00:00 six calendar days before the Bangkok date of asOf, and `end=asOf`. Both endpoints are inclusive at millisecond precision. All other metrics/latest-five lists have **no lower date bound**: "Recently Updated" names an ordered row limit, not a seven-day filter. window metadata describes the existing Recently Resolved calculation; its presence on staff DTO does not add a staff date window.

| Metric/list | Exact timestamp eligibility in addition to documented identity/status filters | Boundaries |
|---|---|---|
| Requester myOpenTickets/needsMyAttention/recentTickets/attentionTickets; staff unassignedActiveTickets/myActiveTickets/activeTicketsByItPriority/recentTickets | `Ticket.createdAt <= asOf AND Ticket.updatedAt <= asOf` | No lower bound; equality on either field included; any later field excludes the record. |
| Requester recentlyResolved | Same Ticket eligibility; current RESOLVED/CLOSED; select latest RESOLVED event from all recorded resolution events by createdAt DESC, id DESC, then require `start <= event.createdAt AND event.createdAt <= asOf` | Event lower=start inclusive, upper=asOf inclusive. No lower Ticket-field bound. A future latest event excludes the Ticket; do not fall back to older qualifying event. Missing legacy event excludes only this metric. |
| Staff metrics.myActiveActions and data.myActiveActions | Same parent Ticket eligibility AND `ActionTaken.createdAt <= asOf AND ActionTaken.updatedAt <= asOf`, plus assignedToId/current-user and PLANNED/IN_PROGRESS | No lower bound; upper asOf inclusive on all four fields. |

Do not substitute requesterResolvedAt, completion or cancellation timestamps for these predicates. Exclusion is a query rule, never data deletion or date rewriting. For start `2026-10-20T17:00:00.000Z` and asOf `2026-10-27T05:00:00.000Z`, resolution events exactly at either count, while start minus 1 ms and asOf plus 1 ms do not. A latest-five/current-count Ticket older than start remains eligible if its predicates hold. Identical cutoff predicates apply before sorting/counting/list limits.

`TicketSummary` fields are exactly id, ticketNumber, summary, currentStatus, requestedPriority, itPriority, assignedStaffId, updatedAt. Action summaries have id, ticketId, ticketNumber, description, status, updatedAt. Keep text limits from existing Ticket/action rules, not arbitrary silent truncation of stored data. DrillDown objects contain `screen` and documented primitive `query` fields for the existing state-based React navigation; they are not promises that a new browser URL router exists. `screen` is myTickets, staffQueue or ticketDetail. Detail links use ticketId and optional actionId; lists have View all navigation. Backend API query strings below are actual proposed list filters, not fabricated existing client routes.

### GET /api/requester/dashboard (new)

REQUESTER only; every query fixes requesterId to session user. Example empty response (200):

```json
{
  "data": {
    "asOf": "2026-10-27T05:00:00.000Z",
    "timeZone": "Asia/Bangkok",
    "window": { "start": "2026-10-20T17:00:00.000Z", "end": "2026-10-27T05:00:00.000Z" },
    "metrics": { "myOpenTickets": 0, "needsMyAttention": 0, "recentlyResolved": 0 },
    "recentTickets": [],
    "attentionTickets": [],
    "drillDown": {
      "myOpenTickets": { "screen": "myTickets", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "page": 1 } },
      "needsMyAttention": { "screen": "myTickets", "query": { "asOf": "2026-10-27T05:00:00.000Z", "currentStatus": "WAITING_FOR_REQUESTER", "page": 1 } },
      "recentlyResolved": { "screen": "myTickets", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "RESOLVED,CLOSED", "resolvedSince": "2026-10-20T17:00:00.000Z", "resolvedUntil": "2026-10-27T05:00:00.000Z", "page": 1 } },
      "recentTickets": { "screen": "myTickets", "query": { "asOf": "2026-10-27T05:00:00.000Z", "sortBy": "updatedAt", "sortOrder": "desc", "page": 1 } }
    }
  }
}
```

Nonempty recentTickets/attentionTickets are TicketSummary arrays, each max five. Formulas: myOpenTickets = owned active set; needsMyAttention = owned WAITING_FOR_REQUESTER; attentionTickets = five such Tickets; recentlyResolved = owned current RESOLVED/CLOSED with **latest** toStatus=RESOLVED event within inclusive window. No historical event means exclusion from that metric only. recentTickets = five owned Tickets across all statuses. All counts use full matching sets, not displayed list lengths.

### GET /api/staff/dashboard (new)

IT_STAFF/ADMINISTRATOR. Same top-level asOf/timeZone/window. Exact data fields:

```json
{
  "data": {
    "asOf": "2026-10-27T05:00:00.000Z",
    "timeZone": "Asia/Bangkok",
    "window": { "start": "2026-10-20T17:00:00.000Z", "end": "2026-10-27T05:00:00.000Z" },
    "metrics": {
      "unassignedActiveTickets": 0,
      "myActiveTickets": 0,
      "myActiveActions": 0,
      "activeTicketsByItPriority": { "LOW": 0, "MEDIUM": 0, "HIGH": 0, "URGENT": 0 }
    },
    "recentTickets": [],
    "myActiveActions": [],
    "drillDown": {
      "unassignedActiveTickets": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "assigned": "false", "page": 1 } },
      "myActiveTickets": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "owner": "me", "page": 1 } },
      "activeTicketsByItPriority": {
        "LOW": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "itPriority": "LOW", "page": 1 } },
        "MEDIUM": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "itPriority": "MEDIUM", "page": 1 } },
        "HIGH": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "itPriority": "HIGH", "page": 1 } },
        "URGENT": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "statuses": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "itPriority": "URGENT", "page": 1 } }
      },
      "recentTickets": { "screen": "staffQueue", "query": { "asOf": "2026-10-27T05:00:00.000Z", "sort": "updatedAt", "order": "desc", "page": 1 } }
    }
  }
}
```

unassignedActiveTickets = active and assignedStaffId null; myActiveTickets = active and assignedStaffId current user; activeTicketsByItPriority = active grouped by IT Priority with all buckets returned. metrics.myActiveActions counts action assignedToId=current user and PLANNED/IN_PROGRESS; data.myActiveActions contains five matching ActionSummary items. Each opens its own parent Ticket/action; the count is not a misleading all-actions link. recentTickets contains five TicketSummary items across statuses. Admin reuses exact self-based formulas even when self action count is zero; no optional user counts.

### Additive list drill-down parameters

These filters are planned, not claimed already implemented. Existing single-status filters and pagination naming remain:

| List | Existing retained parameters | Additive behavior |
|---|---|---|
| GET /api/tickets or /api/tickets/my | page, pageSize (10/20/50), search, categoryId, relatedSystemId, requestedPriority, currentStatus, sortBy, sortOrder | Optional `asOf` cutoff applies Ticket.createdAt/updatedAt <= asOf. `statuses` comma-separated nonempty distinct TicketStatus values, mutually exclusive with currentStatus. Paired resolvedSince/resolvedUntil plus asOf filter latest RESOLVED event with inclusive start <= event.createdAt <= end <= asOf. Owner always session user. |
| GET /api/staff/tickets | search, status, priority (Requested Priority), itPriority, assigned, sort, order, page, limit | Optional `asOf` applies the same Ticket-field upper cutoffs; `statuses` as above mutually exclusive with status; `owner=me` maps authenticated staff/Admin ID, contradictory assigned=false rejected. Unfiltered queue still includes all statuses. |

Do not confuse requested `priority` with itPriority. Proposed list-filter validation: asOf/resolvedSince/resolvedUntil are scalar, canonical ISO-8601 UTC instants at millisecond precision; reject malformed/array values with 400 INVALID_QUERY. Capture one requestNow on the list request; supplied asOf must be <= requestNow, so a client cannot admit future records. The event-window filter requires all of resolvedSince, resolvedUntil and asOf with resolvedSince <= resolvedUntil <= asOf; equal boundaries form a valid inclusive point interval. For Recently Resolved drill-down specifically, copy the returned window.start and asOf verbatim as resolvedSince/resolvedUntil/asOf; resolvedUntil equals asOf. Select latest resolution event across all recorded events before testing the interval, never an older qualifying event. Current RESOLVED/CLOSED restriction is carried by the card's statuses filter. Normal list requests without these additive filters retain existing behavior; do not invent a global historical lower bound.

All practical count and View all links above carry the exact original asOf. Apply the same timestamp/status/owner/priority predicates before count/pagination/sort, retain cutoff/window params while paging or changing sort, and never recompute them from the browser clock or new list request. Other metric/list links supply no resolvedSince/resolvedUntil and therefore no lower date bound. Detail/action-item links open latest authorized records without claiming historical reconstruction. Live state changes between dashboard/list reads may change membership (e.g. updatedAt becomes > original asOf); that does not permit dropping the cutoff. Refresh Dashboard to obtain a new one. Query filters never substitute for authorization. These propagation/validation choices are proposed engineering clarification for review, not extra PDF windows or a time-travel reporting feature.

## 9. Transactions, versions and failure recovery

Ticket version starts 0; action version 1. New/changed operational mutations compare expected versions, increment exactly once per affected record, and touch parent updatedAt/version. Mutations that affect gate/assignment/priority must not bypass parent versioning. Advisory indication uses internal version advancement on first actual change but retains idempotent old request body. Unrelated comments/attachments retain current request shapes; they do not change gate inputs.

Serializable transactions coordinate action writes/gate/status/owner and role/activation interactions; recheck actors/assignees inside transaction. Version conflict returns 409 STALE_UPDATE; serialization failures use at most two internal retries after first attempt while retaining original expected versions, then safe 409 CONCURRENT_UPDATE. No raw Prisma code escapes. Failed conditional writes roll back histories/request receipts/parent increments; failed Ticket cancellation rolls back every child cancellation too.

UI preserves recoverable input, offers explicit refresh and user-directed reapplication, does not silently adopt fresh versions and overwrite. On lost create response retry same requestId/payload; after a replay fetch current versions. On lost PATCH response fetch current state before deciding whether to reapply; an old-version replay cannot create another effect. Auth failures clear restricted cached data; safe 404/409 explain recovery without leaking another user's existence. Test these contracts using concurrent clients, not just sequential happy paths.
