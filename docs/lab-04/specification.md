# TokTickIT Sprint 4 Engineering Specification

Status: student-approved design, documented before feature implementation; implementation and verification pending. Prepared 2026-10-27 (Asia/Bangkok).

Source: the complete 11-page **SE Lab 4** handout, supplied as `SE+Lab+4.pdf`. Section/page references below identify the handout, not repository implementation. **PDF** means an explicit handout obligation. **SD** means a student-approved design decision resolving choices the handout leaves open. Approval of a design is not reviewer approval, passing-test evidence, or implementation completion. FR/BR/AC IDs are local to Lab 4 and remain stable. I1-I7 are planned Issue groups, not verified GitHub issue numbers.

## 1. Sprint Goal

Complete the existing TokTickIT service-desk increment with traceable Actions Taken, backend-enforced Ticket resolution and transitions, concise role-based dashboards, and regression/accessibility hardening, while preserving earlier data, permitted workflows, session authentication, and the Zen Green application.

## 2. Stakeholder Request

Let staff plan, assign, record and review actual work under a Ticket without confusing the Ticket Owner with the person performing a particular action. Give Requesters and operational staff accurate summaries that lead to existing detail/list screens. Keep requester resolution feedback advisory and make final workflow decisions enforceable by the server.

## 3. Scope

### Included and preserved

- PDF: Actions Taken, final Ticket workflow, Requester/staff dashboards, Administrator operational access, database/API increments, complete Labs 1-3 regression, responsive accessibility, and release evidence.
- SD: action assignment/lifecycle, immutable revisions and Ticket status events, versioned writes, creation replay protection, metric formulas and date windows specified below.
- Preserve React 18/TypeScript/Vite/Bootstrap, Express/TypeScript, Prisma/PostgreSQL, cookie sessions, role middleware and Zen Green styles. Reuse existing lists, Ticket Detail, attachments and discussion; no architecture replacement.
- Preserve authenticated ticket creation, owned My Tickets search/filter/sort/pagination, detail, attachments including removal reasons, Public Comments, private Internal Notes, staff claim/reassignment and priorities, Administrator account safeguards, login/password change/logout, and advisory requester indication.
- Historical Lab 2 Development Requester selection is retired, not a feature to restore. Historical documents describe earlier stages; code inspection is not current runtime verification.

### Explicit PDF exclusions (section 4.2)

- Automatic SLA clocks, escalation engines, on-call scheduling and breach notifications.
- Email, SMS, LINE, push and other external notification services.
- Inventory consumption, spare parts, purchasing and service cost accounting.
- Time-sheet billing, payroll and detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced BI tools, custom report builders and export warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in this engineering contract.

No action deletion, separate action-file upload service, generic audit platform, or optional Administrator account-count dashboard is planned.

## 4. Functional Requirements

| ID | Requirement and provenance | Issue | AC |
|---|---|---|---|
| FR-01 | PDF sections 3/4/8.3: list/create/update multiple Actions Taken under the correct Ticket with the prescribed fields; SD field semantics below. | I2, I3 | AC-01, AC-02 |
| FR-02 | PDF Part 6: assign/reassign, edit, transition, complete/cancel actions and reject inactive assignees; SD lifecycle/identity rules. | I2, I3 | AC-03, AC-04, AC-05 |
| FR-03 | PDF sections 4.3/8.3: requester-owned read-only action visibility; staff/Admin writes enforced by backend. | I2, I3 | AC-06 |
| FR-04 | PDF Part 7: stable ordering, append-only behavior and role visibility; SD current-state plus immutable history interpretation. | I2, I4 | AC-07, AC-08 |
| FR-05 | PDF sections 4.5/8.4: all eight Ticket statuses, permitted transitions/roles and server-enforced resolution gate; SD matrices/predicate. | I4 | AC-09, AC-10, AC-11 |
| FR-06 | PDF: requester resolution indication stays advisory and never directly resolves the Ticket. | I4 | AC-12 |
| FR-07 | PDF sections 4.6/6.2/8.2: backend Requester dashboard is owned, concise, useful and connected to detail/list views. | I5 | AC-13, AC-15 |
| FR-08 | PDF sections 8.1/Part 5: operational metrics, current-user actions, recent or urgent Tickets, accurate counts and feedback; SD Admin reuse. | I5 | AC-14, AC-15 |
| FR-09 | PDF sections 6.1/8.5: safe stale/concurrent updates, duplicate requests and preserved recoverable form input; SD versions/replay protocol. | I2, I4, I5, I6 | AC-16, AC-17, AC-18 |
| FR-10 | PDF section 5: preserve all earlier data, define legacy behavior, test additive migration and recovery, and seed repeatedly without resetting work. | I2 | AC-19, AC-20, AC-21 |
| FR-11 | PDF sections 6/8.5: preserve approved earlier APIs/health and all permitted authentication, requester, staff and Admin workflows, except explicit approved increments. | I6 | AC-22 |
| FR-12 | PDF sections 7/8: coherent Zen Green shell, active Dashboard navigation, responsive/accessibility, explicit feedback and final polish. | I3, I5, I6 | AC-18, AC-23, AC-24, AC-25 |
| FR-13 | PDF sections 9/10/12/13: numbered contract, AC traceability, complete test categories/files, database justifications and measurable Product DoD. | I1, I6 | AC-26, AC-27 |
| FR-14 | PDF sections 11/14: Issues/Kanban, feature PR peer review, staging/main integration and truthful final-main evidence. | I1, I7 | AC-28 |
| FR-15 | PDF section 14: current README, review/AI-use records, required screenshots and exactly one PDF in nine-part order. | I6, I7 | AC-29, AC-30 |

## 5. Business Rules

### Actions Taken and authorization

- **BR-01 (PDF mandatory):** Each Action Taken belongs to exactly one Ticket; one Ticket may contain many actions.
- **BR-02 (PDF mandatory):** The primary Ticket Owner coordinates the Ticket; a different IT Staff member may perform and record an Action Taken. Creating/completing an action does not change Ticket ownership.
- **BR-03 (SD):** Creator is immutable authenticated `createdById`. Assignee `assignedToId` must be an active `IT_STAFF` at create/reassign/completion. Performer `performedById` is null until completion, then immutable authenticated completing IT Staff/Admin user, possibly different from creator/assignee. Administrator may act but is not an eligible IT_STAFF assignee solely by being an Admin. Deactivated/role-changed historical users remain referenced; pending work must be reassigned before completion.
- **BR-04 (PDF field concepts; SD limits/timing):** Required trimmed Action Description is 1-2000 characters; Result is 0-2000 and nonblank on completion; `followUpRequired` is a strict boolean default false; Follow-up Note is 0-2000 and nonblank when the flag is true; Attachment Notes are optional text up to 2000. Count limits as JavaScript UTF-16 code units in client/server. A cancellation/reopening reason is trimmed 1-500. Attachment Notes reference existing Ticket files/images without adding uploads. Render text, not HTML.
- **BR-05 (SD):** Action statuses are `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; create as PLANNED. Transitions are the table below. No deletion/restoration API. Completion requires a valid assignee and Result. Cancellation requires a reason, not a Result or an active assignee.
- **BR-06 (SD):** On an active Ticket, staff/Admin may edit description/Result/follow-up/attachment notes on non-cancelled actions; reassign only Planned/In Progress actions. Completed actions allow content corrections with a still-nonblank Result, but not changing creator/performer/assignee/status/completion time. Cancelled actions are immutable. Adding/editing actions on Resolved/Closed requires reopening; Cancelled Tickets stay terminal. A completed action may retain pending follow-up, which blocks Ticket resolution; staff explicitly clear the flag after follow-up, preserving its earlier revision.
- **BR-07 (PDF roles/ownership; SD history visibility):** Requesters see all current action items, including cancelled ones, only on owned Tickets; they never create/change actions. Shared fields include Result, Follow-up Note and Attachment Notes. Staff/Admin have all operational Ticket access, not only assigned Tickets. Revisions/status-event history is staff/Admin-only. Internal Notes remain separate/private. Anonymous, inactive and must-change-password users retain existing restrictions. Every nested lookup checks Ticket/action pairing; inaccessible resources return 404 without existence disclosure.
- **BR-08 (SD interpretation of PDF append-only):** Current action state is editable only through BR-06. Each successful create/edit/assignment/status change appends one immutable revision with version, authenticated actor, server timestamp and resulting action snapshot. Each real Ticket status transition appends an immutable status event with old/new status, actor/time/reason. No event/revision edit/delete endpoint. Failed/no-op/replayed requests append nothing. Cancellation-generated child changes append their own revisions in the same transaction.
- **BR-09 (SD):** Action Date/Time means immutable server creation time, not an editable/backdated performed date. Keep separate server update/completion/cancellation times; UTC instants at millisecond precision, Bangkok display with timezone. Order actions by `createdAt ASC, id ASC`, revisions by version ASC, Ticket events by `createdAt ASC, id ASC`. Editing does not move action creation order. History actor name/role snapshots preserve the recorded attribution after account changes, without copying credentials.

| Current action status | Permitted next status | Additional condition |
|---|---|---|
| PLANNED | IN_PROGRESS | Valid active IT Staff assignee |
| PLANNED or IN_PROGRESS | COMPLETED | Valid assignee; nonblank Result; authenticated performer captured |
| PLANNED or IN_PROGRESS | CANCELLED | Nonblank cancellation reason |
| COMPLETED or CANCELLED | None | Corrections only as BR-06; new work uses a new action |

### Ticket workflow and resolution

- **BR-10 (PDF statuses; SD transitions and proposed response clarification):** Preserve `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`. New Tickets remain NEW. Only active authenticated IT Staff/Admin perform the transitions below. After transport parsing, authentication/role checks and structural field validation, load/revalidate the authorized Ticket transactionally, then compare expectedTicketVersion. A mismatch returns 409 STALE_UPDATE, including when the requested status now equals current status. With a fresh version, requesting the existing status returns 400 NO_CHANGES before transition, conditional-reason or resolution-gate evaluation. A different valid enum destination outside the matrix returns 409 INVALID_TRANSITION. Only a permitted different destination proceeds to conditional reason validation (400) and gate checks (409), then conditional write/event commit. Unknown status enums, invalid IDs/versions, unknown fields and malformed supplied reason types/overlength are structural 400 errors before the version check. Missing/blank required reason and reason supplied for an inapplicable destination are checked after the matrix; see exact precedence/examples in api-spec.md. Failed/same-state requests create no history or version change. These HTTP distinctions are proposed SD clarification, not PDF-prescribed status codes.
- **BR-11 (SD gate implementing PDF obligation):** Before entering RESOLVED, require **all four**: (1) assigned Ticket Owner is active IT_STAFF, (2) at least one COMPLETED action has nonblank Result, (3) no PLANNED/IN_PROGRESS actions exist, (4) no non-cancelled action requires follow-up. Cancelled actions neither satisfy completion nor block resolution. Check atomically with transition. Recheck this gate for RESOLVED -> CLOSED. No requester indication or owner-only acting-user restriction is added.
- **BR-12 (SD):** Ticket cancellation requires reason and atomically cancels Planned/In Progress actions, retaining completed actions and all history. Reopening requires reason, preserves actions and dated requester indication, and does not silently reset follow-up. Old completed work can satisfy the gate after staff review; no new-action-per-reopen rule is invented. CANCELLED is terminal. Legacy Resolved Tickets without gate evidence must reopen, record work and resolve before closure.
- **BR-13 (PDF):** Authenticated owner-only Problem Appears Resolved remains idempotent/advisory; preserve the first server indication timestamp and never change Ticket status. On reopening, display its date as historical, not fresh confirmation. Existing endpoint body/ownership behavior remains unchanged.

| Current Ticket status | Allowed destinations (SD) |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

### Versions, duplicate requests and failures

- **BR-14 (SD):** Ticket version starts at 0; action version starts at 1. Workflow/assignment/priority changes require expected Ticket version; action create requires expected Ticket version, edits require expected action and Ticket versions. Conditional updates plus a transaction prevent lost writes; action mutations advance/check the parent Ticket version and timestamp, so resolution cannot race past action work. All gate-relevant mutation paths must participate. Existing requester indication keeps its request shape but advances parent version on its first actual change. Preserve existing comment/attachment request shapes; they do not change gate inputs.
- **BR-15 (SD):** Recheck actor, assignee and gate facts transactionally. Use Serializable isolation for cross-record workflow writes and account activation/role interactions; at most two internal serialization retries after the first attempt, retaining original client expectations. A stale version or exhausted retry returns safe 409. Current state/history commit together. Do not refresh the version and silently overwrite. UI retains input and offers refresh then explicit reapply.
- **BR-16 (SD):** Action creation includes a UUID requestId, uniquely scoped to actor+Ticket. Persist normalized original business payload, original expected version and creation response atomically. After current authorization, exact replay returns original 201 snapshot with `replayed: true`; different request with that key returns 409. Replay precedes current version/lifecycle checks because it makes no new write; UI refetches current state. A replay remains safe after edits or response loss. Conditional action/Ticket versions reject repeated mutations without duplicate revisions; no-effective-change bodies return 400. Busy buttons complement, not replace, server checks. Preserve earlier ticket/attachment safe duplicate handling and verify it; do not silently redesign prior APIs.
- **BR-17 (PDF safe behavior; SD envelope/codes):** New/changed APIs use `{ data }` and `{ error: { code, message, fields? } }`: 400 malformed/validation/no-effective-change, 401 session, 403 role/account/password-change restriction, 404 missing/inaccessible, 409 stale/invalid transition/gate/idempotency conflict, 500 safe generic failure. Never expose SQL, storage paths, stack traces, password hashes or sessions. Preserve prior endpoint-specific response conventions unless explicitly changed in [api-spec.md](api-spec.md).

### Dashboard calculations (SD choices satisfying PDF sections 4.6/6.2/8)

- **BR-18 (approved window; proposed cutoff clarification):** Active Ticket set is NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED. Capture one server evaluation instant `asOf` for each dashboard response at the start of its consistent read snapshot; reuse it for every count, list and drill-down. Only Recently Resolved uses the approved seven-calendar-day window: start is Bangkok 00:00 six calendar days before the Bangkok date of asOf, end is asOf, both inclusive. Return ISO UTC boundaries and `timeZone: Asia/Bangkok`. Example asOf `2026-10-27T05:00:00.000Z` gives start `2026-10-20T17:00:00.000Z`. Latest-five/recently-updated lists and other current counts have **no lower date bound**; do not invent seven-day filters for them. Dashboard routes accept no client clock/timezone/identity controls; list drill-downs accept the returned cutoff as a filter, not a historical snapshot capability.
- **BR-19:** Every Requester query includes authenticated requesterId; ignore no forged identity: reject identity query parameters on new dashboard routes. Requester metrics/lists and operational metrics are defined in the table below. Administrator reuses staff dashboard; optional account counts are omitted. My Active Actions means assigned to current user and PLANNED/IN_PROGRESS, irrespective of creator/performer/Ticket Owner.
- **BR-20 (proposed precise cutoff predicates):** A Ticket is eligible for every dashboard count/list only if `Ticket.createdAt <= asOf AND Ticket.updatedAt <= asOf`; an active action additionally requires its own `createdAt <= asOf AND updatedAt <= asOf` and an eligible parent Ticket. Exact equality is included; either timestamp later than asOf excludes that record, without changing stored data. Completion/cancellation/advisory timestamps are not substituted for these fields. For Recently Resolved, select the latest RESOLVED event across all recorded resolution events by `(createdAt DESC, id DESC)`, then require `window.start <= event.createdAt <= asOf`, eligible Ticket and current RESOLVED/CLOSED. A future latest event excludes the Ticket from this metric; never fall back to an older in-window event. Missing legacy resolution time is not guessed. Counts cover full matching sets; recent/attention/action lists have at most five summaries each sorted `updatedAt DESC, id DESC`. Zero counts are 0 and empty lists []; no full collections or bytes. This is the concrete future-record policy proposed to clarify the approved contract, not an additional PDF date-window requirement.
- **BR-21 (proposed drill-down clarification):** Each practical count/list drill-down carries the original `asOf` plus identical status/owner/priority predicates to its paginated list. Recently Resolved also carries `resolvedSince=window.start` and `resolvedUntil=asOf`; both boundaries are inclusive and resolvedUntil must equal asOf for this dashboard link. Other metric/list links carry no lower date bound. Existing unfiltered lists do not acquire a new global date filter: apply these predicates when the additive asOf filter is supplied. Detail/action links still open current authorized records. Reads remain live current-state queries with retained cutoff predicates, not time travel: updates after asOf can exclude a row and status/ownership changes can change results; refreshing Dashboard obtains a new cutoff. Retain filters while paging/sorting; do not replace cutoff with the browser/list request clock. Recent updates use Ticket.updatedAt, also touched by new action writes; no claim that every historical comment/attachment changed it.

| Metric/list group | Date field predicates in addition to role/status/ownership filters | Lower / upper bounds |
|---|---|---|
| Requester My Open Tickets, Needs My Attention, attentionTickets, recentTickets; staff/Admin Unassigned Active Tickets, My Active Tickets, Active Tickets by IT Priority, recentTickets | Ticket.createdAt <= asOf AND Ticket.updatedAt <= asOf | No lower bound; upper asOf inclusive on both fields. Latest-five is a row limit/order, not a date window. |
| Requester Recently Resolved | Eligible Ticket as above, current RESOLVED/CLOSED, latest RESOLVED event selected as BR-20 | No lower bound on Ticket fields; event interval [Bangkok window.start, asOf], both inclusive. |
| Staff/Admin My Active Actions count/list | Eligible parent Ticket and ActionTaken.createdAt <= asOf AND ActionTaken.updatedAt <= asOf | No lower bound; upper asOf inclusive on each parent/action field. |

Boundary examples: an event exactly at window.start or asOf counts; one millisecond before start or after asOf does not. A current-count/latest-five record older than the seven-day window still qualifies if its non-date predicates and upper cutoffs hold. A record with creation at/before cutoff but update one millisecond after cutoff is excluded from both count/list and matching drill-down.

| Role | Metric/list key and label | Exact predicate/destination meaning |
|---|---|---|
| Requester | myOpenTickets / My Open Tickets | Owned active Tickets -> My Tickets active status set |
| Requester | needsMyAttention / Needs My Attention | Owned WAITING_FOR_REQUESTER -> My Tickets same status; attentionTickets list gives five recent matches |
| Requester | recentlyResolved / Recently Resolved | Owned current RESOLVED/CLOSED with latest RESOLVED event in BR-18 window -> exact status/event-window filter |
| Requester | recentTickets / Recently Updated | Five owned Tickets across statuses -> Detail; View all sorts My Tickets updatedAt descending |
| Staff/Admin | unassignedActiveTickets / Unassigned Active Tickets | Active, assignedStaffId null -> Queue same predicates |
| Staff/Admin | myActiveTickets / My Active Tickets | Active, assignedStaffId current user -> Queue same predicates |
| Staff/Admin | myActiveActions / My Active Actions | assignedToId current user, action PLANNED/IN_PROGRESS -> each parent Detail action anchor; count is labelled summary, not a misleading all-actions link |
| Staff/Admin | activeTicketsByItPriority / Active Tickets by IT Priority | Active Tickets grouped LOW/MEDIUM/HIGH/URGENT including zero buckets -> Queue same status+priority |
| Staff/Admin | recentTickets / Recently Updated Tickets | Five accessible Tickets -> Detail; View all sorts Queue updatedAt descending |

### Preservation, seed and delivery

- **BR-22 (PDF preservation; SD legacy policy):** Additive migration only; preserve all previous Users, Tickets, ownership, categories, systems, attachment bytes/removal metadata, comments, notes, sessions and timestamps. Do not fabricate historical actions/status events or rewrite existing passwords/statuses. Existing statuses remain valid even if they would fail a new future transition; legacy zero-action Tickets show an empty action area and enter current dashboard counts normally. Gate applies to future resolution/closure attempts.
- **BR-23 (PDF seed obligations; SD implementation):** Stable unique Lab 4 seed identities and upsert/create-only behavior never reset existing work/passwords. Demonstrate all eight statuses, four IT priorities and requested priorities, assigned/unassigned, zero/one/many actions, distinct creator/assignee/performer, inactive-assignee rejection, pending follow-up, and users/scenarios with zero/non-zero metrics. Seed newly created current-window examples once, without moving old dates on rerun; after they age out, recent metrics may be zero. Fixed-clock tests supply deterministic window cases.
- **BR-24 (PDF recovery; SD method):** Document and test validated backup/restore into a separate disposable database, plus forward repair where suitable; no destructive automatic down migration. Record source migration level, backup verification, restored row/relationship/content checks, application readability and destination safety before any restore. Do not overwrite the working development database as a test.
- **BR-25 (PDF/earlier UI):** Responsive desktop >=992px, tablet 768-991px, mobile <768px; associated labels, visible keyboard focus, non-color status cues, usable forms/dialogs, no clipping/overlap/page overflow. Preserve the application shell and all permitted earlier screens. Distinguish all feedback states listed in [ui-spec.md](ui-spec.md); remove unfinished controls, broken links and console errors only after identifying their cause.
- **BR-26 (PDF engineering):** Contract precedes main feature implementation; tests planned before/alongside coding and developed using Test DD/TDD. Feature branches -> reviewed PRs -> lab4-staging -> reviewed release -> main; integration checks on staging then final required tests on main. Existing Kanban statuses must be confirmed, not invented. All sprint Issues Done at final submission; record actual reviewer identity/links/comments/responses/approvals and real AI use, not templates presented as evidence.
- **BR-27 (PDF submission):** Exactly one concise PDF with working links, readable screenshots and Answer Part 1 through Answer Part 9 in exact order. Final repository/main is source of truth; earlier passing claims are not fresh verification. Record exact final commit, commands, environment and failed/skipped counts honestly.

## 6. UI Specification Summary

[ui-spec.md](ui-spec.md) defines the existing shell extended with Dashboard for each role; staff/Admin retain Queue/Detail and Admin retains User Management; Requesters retain My Tickets/Create Ticket. Reuse Bootstrap and existing green tokens, cards/tables/mobile records, badges, forms and error patterns.

Actions Taken appears within existing Ticket Detail with list/create/view/edit/assignment/complete/cancel modes, shared requester read-only view and staff-only history. Ticket controls list only permitted destinations and show gate/conflict reasons. Dashboard cards have labels/counts and exact practical drill-downs; lists link to Detail. Recoverable failures preserve drafts. Screenshots cover desktop/tablet/mobile, workflow, modes and states, not just attractive happy paths.

## 7. Data Changes

Planned design only; schema/migrations/seed are not changed by this documentation task.

| Concept | Planned fields/constraints/indexes |
|---|---|
| Ticket | Add Int version default 0; retain existing IDs/statuses/FKs/timestamps. Existing assignment and priority writes participate in version checks. |
| ActionTaken | Int id; immutable Ticket FK; creator User FK; active-staff assignee User FK; nullable performer User FK; description/Result/follow-up/attachment notes; ActionStatus enum; version default 1; created/updated/completed/cancelled timestamps; nullable cancellationReason. Index (ticketId, createdAt, id), (assignedToId, status, updatedAt, id), (ticketId, status). No user/Ticket deletion through product APIs; use restrictive parent/actor FKs to protect new history. |
| ActionTakenRevision | Int id; action FK; version; operation CREATE/EDIT/ASSIGN/STATUS; actor User FK and name/role snapshot; server createdAt; JSON resulting business-state snapshot. Unique (actionId, version); no mutable credential fields. |
| TicketStatusEvent | Int id; Ticket FK; old/new TicketStatus; actor User FK and name/role snapshot; nullable reason; server createdAt. Index (ticketId, createdAt, id), (ticketId, toStatus, createdAt). No invented pre-migration events. |
| ActionCreateRequest | actor/Ticket/requestId unique; normalized request plus original expected version, stored initial response and action FK; createdAt. Persist transactionally; no scheduled expiration service in this lab. Only actor-authorized replay. |

Use native PostgreSQL timestamp-with-time-zone at millisecond precision for new instant columns; serialize UTC. Do not alter earlier column types/timestamps globally. Validate legacy timezone assumptions in migration fixtures. Normalized state JSON stores ISO date strings, not binary files. Add query-driven indexes; verify with representative performance-smoke rather than assume indexes guarantee speed.

Database decision justifications:

1. **Editable state + immutable revisions/events (SD):** supports required editing and append-only evidence without reconstructing every read from events or adding a generic audit platform.
2. **Version checks + parent transaction (SD):** integer comparisons avoid timestamp precision ambiguity and coordinate action changes with the cross-record gate; a naked read-then-write would allow lost updates.
3. **Separate actor/assignee/performer FKs (SD):** prevents Ticket ownership and planned assignment being mistaken for evidence of who completed work.

Migration/backfill: take and validate backup later; apply repository migrations to an isolated pre-Lab-4 fixture, then the additive increment. No action/event backfill; initialize versions only. Compare prior records, relationship ownership, inactive state, valid password hashes, attachments and timestamps byte-for-byte/value-for-value. Retain prior migration files unchanged. Recovery rehearsal and seed expectations follow BR-22-24 and [tests.md](tests.md).

## 8. API Contract

[api-spec.md](api-spec.md) is authoritative for exact planned paths, methods, bodies, DTOs, statuses, examples, role matrix, version/replay behavior and drill-down queries. Existing auth/catalog/ticket/discussion/attachment/Admin paths retain their behavior unless explicitly listed as an approved increment.

New capabilities: Ticket-nested action list/create/update/history; Ticket status history; Requester dashboard; staff/Admin dashboard. Changed existing staff operations retain `/assign`, `/status`, `/priority` paths but gain version/transition safeguards and approved Admin operational access. Old documentation's `/owner` is not the current implementation path. Current requester list is mounted on both `/api/tickets` and `/api/tickets/my`; no retired identity selector is restored. No feature endpoint is claimed to exist merely because it is specified here.

## 9. Acceptance Criteria

All criteria are **Planned**, with test rows in [tests.md](tests.md). These are student-authored observable criteria covering PDF obligations and approved SD choices, not the PDF's example IDs copied as a complete test set.

| ID | Observable acceptance criterion | FR | Issue |
|---|---|---|---|
| AC-01 | Given permitted staff/Admin and valid input, one action is created on the URL Ticket with immutable authenticated creator, active staff assignee and no false performer; Ticket ownership remains unchanged. | FR-01 | I2 |
| AC-02 | Given invalid required/conditional/length/type/server-controlled fields, creation/edit/completion is rejected with field-safe feedback and no partial writes. | FR-01 | I2, I3 |
| AC-03 | Given another active staff member, assignment/reassignment succeeds; inactive/non-staff assignees fail and role/deactivation races do not bypass validation. | FR-02 | I2 |
| AC-04 | Every action source/destination follows the table; completion requires Result/valid assignee and captures actual actor; cancellation requires reason and keeps history. | FR-02 | I2, I3 |
| AC-05 | Permitted content corrections create revisions; terminal lifecycle/identity/reassignment restrictions and Ticket-state locks reject prohibited edits. | FR-02 | I2, I3 |
| AC-06 | Owners read all shared current actions; other Requesters cannot read them or histories; every requester/anonymous action write fails; active staff/Admin have approved access. | FR-03 | I2, I3 |
| AC-07 | Successful mutations append exactly the required immutable revisions/events atomically; failed/no-op/replayed writes append none and previous snapshots stay unchanged. | FR-04 | I2, I4 |
| AC-08 | Actions/history remain deterministically ordered with timestamp ties and after edits; creator/performed timestamps are server-controlled and display Bangkok dates correctly. | FR-04 | I3, I4 |
| AC-09 | Every Ticket source/destination/role matches the eight-status matrix. After structural validation, stale version returns 409 STALE_UPDATE even for same status; fresh same status returns 400 NO_CHANGES before conditional reason/gate checks; fresh different unlisted transition returns 409 INVALID_TRANSITION. No rejection changes state/history/version, and UI refreshes permitted controls/summary after success. | FR-05 | I4 |
| AC-10 | Resolve/close succeeds only with all four gate conditions; zero/all-cancelled/pending/follow-up/inactive-owner cases fail through direct API as well as UI. | FR-05 | I4 |
| AC-11 | Cancellation atomically cancels outstanding actions/revisions; reopen preserves evidence/reasons/old indication; legacy statuses are retained but future transitions enforce gate. | FR-05 | I4 |
| AC-12 | Owned requester indication remains idempotent, never changes any Ticket status and is shown as dated historical feedback after reopen. | FR-06 | I4, I6 |
| AC-13 | Requester metrics/recent/attention lists equal independent owned-data queries; another user's data or forged identity cannot enter response. | FR-07 | I5 |
| AC-14 | Staff/Admin metrics equal authoritative queries including all zero priority buckets; My Active Actions uses current assignee, not creator/performer/owner. | FR-08 | I5 |
| AC-15 | One response asOf is reused throughout; BR-18-21 predicates include exact endpoints and exclude one-millisecond-outside/future-created/future-updated/latest-future-resolution cases. Current counts/latest-five lists have no lower date bound. Bounded lists and paginated drill-downs preserve original asOf and identical inclusive event-window/status/owner/priority predicates, including after paging; live changes are explained without claiming time travel. | FR-07, FR-08 | I5 |
| AC-16 | Two competing editors/gate-sensitive writes cannot silently overwrite; one coherent outcome commits, conflicts are safe, versions/history agree and drafts survive. Ticket-status check precedence remains deterministic when stale version coincides with same status, invalid transition, missing conditional reason or gate failure; structural errors retain their earlier 400 precedence. | FR-09 | I2, I4 |
| AC-17 | Duplicate action create with same UUID/payload replays once, changed-payload reuse conflicts, retries of updates create no duplicate effects/history. | FR-09 | I2 |
| AC-18 | Loading/validation/success/empty/no-results/forbidden/conflict/not-found/network/500/malformed-response states are distinct and safe; recoverable input remains; restricted data is removed on auth failure. | FR-09, FR-12 | I3, I5, I6 |
| AC-19 | Migrating representative earlier records preserves identities, ownership, attachment bytes/removal metadata, comments/notes, users/sessions and times; no fictional history is added. | FR-10 | I2 |
| AC-20 | Seeding twice preserves existing changes and yields stable zero/one/many-action, status/priority/ownership and zero/non-zero metric scenarios. | FR-10 | I2, I5 |
| AC-21 | A documented isolated restore/recovery rehearsal recovers the intended migration level, relationships/content and usable application data without touching development schema. | FR-10 | I2 |
| AC-22 | Full earlier unit/API/UI/E2E regressions preserve approved auth, catalog/health, requester, attachments, discussion/privacy, staff and Admin safeguards with documented Lab 4 contract updates only. | FR-11 | I6 |
| AC-23 | All major new screens/modes work on desktop/tablet/mobile without clipping, overlap or page overflow; badges, fields, private/shared sections and active navigation remain coherent Zen Green. | FR-12 | I6 |
| AC-24 | Keyboard alone reaches/operates all controls with visible focus; labels, errors, status text and confirmations are accessible without color-only meaning or focus traps. | FR-12 | I6 |
| AC-25 | Representative end-to-end workflows have no unexplained console errors, broken links, placeholders or unfinished controls; required state demonstrations are captured/readable. | FR-12 | I6 |
| AC-26 | All numbered FR/BR/PDF requirements have Issue ownership/AC/planned verification, all ACs have tests, and required documents/files/categories are accounted for before implementation. | FR-13 | I1 |
| AC-27 | Dashboard performance-smoke is measured on documented fixture/setup with bounded payloads; proposed target and any approved adjustments are recorded without inventing a pass. | FR-13 | I6 |
| AC-28 | Real Issue/PR/peer-review/staging/main history and final-main test/build output identify actual commits and all Issues Done; no historical evidence is relabelled. | FR-14 | I7 |
| AC-29 | README setup/seed/migration/test/demo, reviewer identity/comments/responses/approvals, and AI-use LLM/6-10 prompts/My Reflection are current, linked and truthful. | FR-15 | I7 |
| AC-30 | Exactly one final PDF has nine exact ordered headings, required rendered records, working links and readable desktop/tablet/mobile screenshots/checklists. | FR-15 | I7 |

## 10. Definition of Done

This is a future Product-completion checklist, **not a completed-work claim**.

- [ ] Four contract documents reviewed before main implementation PRs complete; numbered decisions and two database justifications agree across model/API/UI/tests.
- [ ] FR-01-15, BR-01-27 and AC-01-30 are implemented/verified with no unassigned handout requirement; required test files exist and expected results map to actual files.
- [ ] Every required unit, API/integration, UI component/style, authorization, workflow, migration/recovery/regression, responsive/accessibility, performance-smoke and E2E verification completed; no required failing/skipped test is hidden.
- [ ] Complete frontend/backend/E2E output and both builds recorded on final main with commit, commands, setup, counts and limitations; historical Lab 3 results are not a baseline pass.
- [ ] Fresh evidence shows all four resolution conditions, transition matrices, independent performers, shared/private visibility, immutable history, stale/replay handling and exact dashboard/query reconciliation.
- [ ] Migration, repeatable seed and isolated recovery evidence preserves earlier data; README documents actual setup/seed/migrate/test/demo procedures.
- [ ] Every major Lab 4 screen has desktop/tablet/mobile visual/accessibility checks and readable screenshots; focus, validation, modes, feedback and overflow checked; no unexplained console errors/unfinished controls.
- [ ] Feature PRs reviewed with responses/approvals, integrated through lab4-staging, then reviewed release into main; sprint Kanban Issues all Done.
- [ ] Minimum final docs include these four files plus real `reviewer.md` and `ai-use.md`; latter records LLM, 6-10 selected prompts and My Reflection. These two records are future I7 deliverables, not created by I1.
- [ ] One final submission PDF passes the ordered evidence audit below; repository/final main remains source of truth.

### Required final submission order (PDF section 14, 60 points)

| Exact heading | Points | Evidence required; all pending until actually collected |
|---|---:|---|
| Answer Part 1 | 10 | Git Use with Engineering Workflow: feature -> lab4-staging -> main history; Project/Kanban all Done; rendered reviewer.md identity, PR links, comments/responses/approvals; README/.gitignore; directory tree. |
| Answer Part 2 | 5 | Spec DD: linked/rendered specification with numbered requirements/rules, action/transition/gate rules, calculations, ACs, migration decisions, Product DoD and specification-before-implementation evidence. |
| Answer Part 3 | 10 | Test DD and Traceability: linked/rendered tests.md, planned tests/AC mapping/actual paths/final statuses, complete required passing unit/API-integration/UI/authorization/workflow/regression/E2E output from main. |
| Answer Part 4 | 5 | AI Use with Reflection: rendered ai-use.md naming actual LLM, 6-10 selected key prompts and brief My Reflection on specification-agent/coding-agent use. |
| Answer Part 5 | 5 | Working IT Staff Dashboard UI: approved metrics, current-user actions, recent/urgent Tickets, accurate query-reconciled counts, drill-down, loading/empty/forbidden/safe-failure/responsive evidence. |
| Answer Part 6 | 10 | Working Actions Taken UI: list/create/assign/edit/status/complete/cancel; validation/inactive-assignee/roles/safe-failure/responsive evidence; different actions on one Ticket. |
| Answer Part 7 | 5 | Working Ticket Workflow: permitted transitions, stable ordering, append-only behavior and role visibility. |
| Answer Part 8 | 5 | Working Requester Dashboard and Final Regression UI: owned metrics, recent/attention Tickets, drill-down/security and representative auth/My Tickets/Detail/Attachments/Public Comments/staff/Internal Notes/Admin regressions. |
| Answer Part 9 | 5 | Zen Green UI, Responsive, Accessibility, and Final Polish: rendered ui-spec.md; desktop/tablet/mobile screenshots of all major Lab 4 screens; completed checklist for consistency/cards/actions/editable/read-only/validation/focus/clipping/overlap/overflow. |

## 11. Assumptions and Decisions

### Provenance and differences from the handout

Student approval in the attached Issue #1 request accepts the preceding decision report as design, not PDF law. PDF examples do not fully define the lifecycle/assignee, resolution predicate, append-only target, performer timing, ordering or metric formulas. BR-03-06/08-12/14-24 make those choices explicit: completion-time performer, four action states, four-condition gate, versioned history, server creation time, assigned-user actions, seven-day Bangkok metrics, legacy exclusion from unknown recent-resolution times and forward recovery. The PDF requires the capabilities, not these exact schemas/limits/routes/formulas. No additional statuses, uploads, notifications or reporting system are inferred from the dashboard mockups.

The follow-up ambiguity-resolution request proposes explicit cutoff fields/drill-down asOf propagation and Ticket-status validation precedence in BR-10/18/20/21 for student review. It retains the approved seven-day Recently Resolved window and adds no date windows to other metrics/lists. These exact mechanisms/HTTP responses are engineering decisions, not quoted PDF rules; no cutoff/response-order choice is left implicit. Performance setup/target and the operational confirmations below remain outstanding as already documented.

### Seven-Issue ownership and handout coverage

Every row maps a complete handout obligation group to a planned Issue, observable AC and planned test IDs (defined in tests.md). Cross-cutting implementation can contribute without duplicating the primary owner.

| PDF source / requirement group | Primary Issue | AC | Verification IDs |
|---|---|---|---|
| Sections 1-3, 4.1, 9: contract before implementation; original interpretation; FR/BR/AC; exact eleven sections; scope/assumptions; model/API/UI/regression/DoD | I1 Sprint 4 Specification & Test Plan | AC-26 | DOC-01 |
| 4.2: explicit exclusions and no unapproved features | I1 | AC-26 | DOC-01 |
| 4.3/4.4/8.3/Part 6: relationship, independent staff, shared fields, identity/assignment/lifecycle/validation/inactive rejection/roles | I2 Actions Taken Backend | AC-01-07 | UNIT-01, ACT-01-08, AUTH-01 |
| 8.3/Part 6: list/create/view/edit/assign/complete/cancel/requester read-only UI | I3 Actions Taken UI | AC-02, AC-04-06, AC-18 | UI-01, UI-02, E2E-01 |
| 4.5/6.1/8.4/Part 7: eight statuses, matrix/gate/advisory indication, ordering/append-only/visibility, concurrency | I4 Ticket Workflow & Resolution | AC-07-12, AC-16 | WF-01-07, CON-01, UI-03, E2E-02 |
| 5.1: fields/types/FKs/indexes/time/version and two database justifications | I2 | AC-19, AC-26 | MIG-01, DOC-01 |
| 5.2: preserved data/legacy/backfill and tested migration/recovery | I2 | AC-19, AC-21 | MIG-01, MIG-02 |
| 5.3: repeatable realistic status/priority/ownership/zero-one-many-action/zero-nonzero seed | I2 | AC-20 | SEED-01 |
| 6: action/history API contract, validation/auth/safe statuses and prior API continuity | I1 (contract), I2 (action API), I6 (continuity) | AC-01-06, AC-18, AC-22, AC-26 | ACT-01-08, AUTH-01, FAIL-01, REG-01, DOC-01 |
| 4.6/6.2/8.1-2/Parts 5,8: Requester/staff/Admin dashboards, authoritative exact concise calculations/drill-down/date/empty/current-user actions | I5 Role-Based Dashboards | AC-13-15 | DASH-01-05, UI-04, UI-05, E2E-03 |
| 7/8.5-6: coherent shell/navigation/status/private/shared/forms/states/duplicates/drafts/responsive/accessibility/remove broken UI; preserve all earlier screens | I6 Regression, Accessibility & UI Polish | AC-17-18, AC-22-25 | DUP-01, FAIL-01, REG-01, STYLE-01, RESP-01, A11Y-01, POLISH-01 |
| 10/12: Test DD/TDD, all categories/minimum test files/AC traceability/performance | I1 (plan), I6 (execution completeness) | AC-26-27 | DOC-01, PERF-01; full table in tests.md |
| 11/13/Part 1: Issues before code, inherited Kanban/agent rules, staged PR review, Product DoD | I1 (plan), I7 Final Documentation & Release (evidence) | AC-26, AC-28 | DOC-01, REL-01 |
| 8.5/12/14: README, .gitignore/tree, six final docs, reviewer, AI LLM/6-10 prompts/reflection, final-main tests, all nine submission parts | I7 | AC-28-30 | REL-01, DOC-02, SUB-01 |
| 12/Part 9: required screenshot directories; all major screens desktop/tablet/mobile and completed visual/accessibility checklist | I6 | AC-23-25, AC-30 | RESP-01, A11Y-01, POLISH-01, SUB-01 |

### Existing source anchors and remaining operational questions

Reviewed: `../lab-02/` and `../lab-03/` specifications/UI/API/test/reviewer/AI records; `../../server/prisma/schema.prisma`, migrations/seed; `../../server/src/app.ts`, auth middleware, staff/Admin/discussion routes; `../../client/src/App.tsx`, API adapters and queue; Vitest/Playwright configuration. Code currently has no action/dashboard increment. Staff status route checks a destination allowlist only; assignment already uses conditional claim; Admin shows Serializable/P2034 handling. Historical Lab 3 results/README/reviewer chronology disagree in places and are not reused as fresh results.

No product-policy decision remains silently open. Before implementation/release, confirm actual Issue numbers/Kanban status names, peer reviewer, disposition of existing uncommitted/untracked files, disposable DB/backup destination, and documented performance setup. Performance target remains explicitly proposed (tests.md), subject to measurement/review. Lab 4 defers agent/branch/accessibility details to earlier labs; do not claim the original Lab 2/3 handouts were re-read when only repository records were available. No branches/Issues/PRs/reviewer approvals are created or claimed by these documents.
