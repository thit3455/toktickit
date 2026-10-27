# TokTickIT Lab 4 UI Specification

Status: **planned UI contract; not implemented, visually verified or screenshot-captured**. PDF sections 7/8/14 require coherence, states, accessibility and responsive evidence. Concrete cards, field limits, modes and lifecycle choices below are approved student decisions (SD). Use [specification.md](specification.md) for numbered rules/matrices and [api-spec.md](api-spec.md) for exact request/DTO/version behavior. [tests.md](tests.md) contains planned checks; no unchecked checklist item is a pass.

## 1. Existing design language and shell

Extend the current React/Bootstrap application, not a new unrelated interface. Reuse `client/src/App.tsx`, `StaffTicketQueue.tsx`, `AdminUserManagement.tsx`, `TicketDiscussion.tsx`, API adapters, `Requester.css`, `StaffTicketQueue.css`, `AdminUserManagement.css` and `ZenTables.css` conventions. Keep existing authentication/password-change boundaries and permitted Requester/staff/Admin screens. The retired Development Requester selector does not return.

Preserve existing Zen Green palette: primary #006B3C, secondary #0B7A46, pale green #EAF6EF, background #F5F7F6, white cards, subtle borders and existing spacing/button hierarchy. Use clear heading levels, textual labels, safe wrapped long values and existing badges. Status/priority meaning must remain readable as text, not color alone. Differentiate shared Actions Taken/Public Comments from private Internal Notes. No private data belongs in an action form that the requester will read.

After authentication/password change, show current name/role and Logout; Dashboard is the proposed role-appropriate landing page. Preserve navigation destinations:

| Role | Navigation |
|---|---|
| Requester | Dashboard, My Tickets, Create Ticket, owned Ticket Detail via list/dashboard |
| IT Staff | Dashboard, IT Staff Queue, Ticket Detail via queue/dashboard |
| Administrator | Dashboard (operational reuse), IT Staff Queue/Detail, User Management |

Each page has one clear active navigation item with visible style and programmatic current-page indication. Use correct role-specific nav accessible name, not an inherited requester label on staff pages. Preserve authentication refresh/logout cache clearing. Admin operational controls are an approved extension; user-management safeguards remain unchanged. Adding Dashboard never removes existing detail/list access.

## 2. Dashboard layout and navigation

Use concise existing-style metric cards with label/value, and a small number of bounded recent-item sections. Cards are not whole tables disguised as dashboards. Each practical count has an accessible drill-down action naming the destination/filter; avoid clickable divs. Use text such as "View Tickets waiting for you", not identical unnamed icons. Display refresh state and last updated time/timezone; zero is a valid count, never replace it with a spinner or fabricated value.

Desktop uses wrapping cards with a recent-list area; tablet reduces columns; mobile stacks cards/lists and wraps actions. Reuse existing button/card/table feedback conventions. Provide Refresh to fetch a new authoritative snapshot; it does not silently overwrite any Ticket/action editor draft. Backend counts determine values; frontend does not recompute from its five displayed rows. Labels/window explanation match specification BR-18-21 exactly.

Proposed timestamp clarification: show the single server response `asOf` as the evaluation/last-updated time and copy it unchanged into every practical list drill-down. Do not calculate a separate cutoff in the browser or regenerate it when paging/sorting. Ticket metrics/lists require both Ticket.createdAt and updatedAt <= asOf; My Active Actions also requires parent eligibility and action.createdAt/updatedAt <= asOf. Equality is included and a timestamp later than cutoff is excluded. Only Recently Resolved uses the approved seven-calendar-day event interval [Bangkok midnight six calendar days before asOf, asOf], both endpoints inclusive; its link copies start/end/asOf verbatim. Other current counts/latest-five lists have no lower date bound: do not label them "last seven days" or hide older eligible records. This is student-design clarification, not a newly prescribed PDF window.

Linked lists remain live current-state views with retained date predicates, not reconstructed historical snapshots. A later update/status/ownership change may change membership (an updatedAt after the original cutoff is excluded); explain this without silently dropping the cutoff. Refresh Dashboard obtains a new asOf. Detail/action links open latest authorized records rather than time-travel versions. Keep original filters/cutoff visible in list context and offer ordinary clear filters to return to unfiltered behavior.

### Requester Dashboard

- Cards: My Open Tickets, Needs My Attention, Recently Resolved.
- Lists: Recently Updated and Tickets Needing Your Attention, at most five each. Show Ticket Number, summary, textual status and updated time; open owned Ticket Detail.
- Cards/list View all open My Tickets with exact server-provided drill-down filters/sorting and page reset to 1. Preserve relevant filter state in existing React navigation; do not invent a browser router.
- Recently Resolved states the Bangkok seven-calendar-day window with inclusive start/end; only the latest recorded RESOLVED event is tested against it. A future latest event does not fall back to an older one; legacy Tickets without resolution history are not guessed to be recent. Existing resolved/closed work remains available through My Tickets; other cards/recent lists have no lower date bound.
- No requester/actor selector or arbitrary user query. No Internal Notes, history or staff mutation controls. An empty dashboard says there are no matching owned Tickets and keeps Create Ticket/My Tickets available.

### IT Staff Dashboard

- Cards: Unassigned Active Tickets, My Active Tickets, My Active Actions, plus textual LOW/MEDIUM/HIGH/URGENT count breakdown for active Tickets.
- Lists: Recently Updated Tickets and My Active Actions, at most five each. Recent Tickets open Detail; View all opens Queue with matching updated sort. Priority/ownership cards open exact Queue filters.
- My Active Actions means assigned to authenticated user and Planned/In Progress, not created/performed by them or owned Ticket. Show Ticket Number, action description, status and updated time. Each item opens parent Detail, loads the target action's chronological page if needed and moves focus to that action. The total count may exceed five; label "Showing up to 5" and do not suggest a nonexistent all-actions screen. Count is a summary, not a misleading broad link.
- Do not add SLA clocks, notifications, reports, cost charts or editable dashboard metrics.

### Administrator Dashboard

Reuse staff cards/lists and exact API scope, retain User Management navigation. Current-user formulas remain literal; My Active Actions may be zero because new assignments require IT_STAFF. No optional account-count cards are planned. Admin can enter staff operational Ticket Detail and act with its authenticated identity, without being automatically made an eligible IT Staff owner/assignee.

## 3. Actions Taken in existing Ticket Detail

Place a clearly labelled **Actions Taken** section alongside existing Ticket information, attachments and discussion. Do not replace Public Comments or Internal Notes. Preserve their existing ownership/privacy. Staff/Admin see list and permitted operations; Requester sees every current action item for the owned Ticket, including cancelled actions, via pagination and read-only content.

### List and read-only view

Use table at suitable desktop width and labelled stacked records on narrow screens. Columns/record labels: Action Date/Time, Action Description, Result, Created by, Assigned to, Performed by, Status, Follow-Up Required?, Follow-up Note, Attachment Notes and allowed operations. Long Result/notes may be in expanded view rather than force a wide table, but remain discoverable/keyboard accessible. Show cancellation reason/time for cancelled actions and completion time for completed actions.

- Action Date/Time is server creation time; separately label completion/update time. Display Bangkok timezone consistently.
- Before completion, Performed by reads "Not yet completed"; do not substitute assignee/creator. After completion show actual authenticated completing user.
- Show Yes/No text for follow-up, not a colored dot. Attachment Notes are plain text references, not active uploads or automatic links to arbitrary user input.
- Stable order is createdAt ASC, id ASC; edit does not jump a record. Respect server pagination, show total/page controls and keep all statuses discoverable.
- Empty zero-action Ticket: "No Actions Taken recorded yet." Staff may create when Ticket active; Requester sees no create prompt/control. Empty legacy history is explained without suggesting data loss.

### Create mode (staff/Admin)

Use existing labelled form/card patterns in the Detail section. Editable fields: Description*, Assigned to*, optional Result, Follow-Up Required? boolean, conditional Follow-up Note*, optional Attachment Notes. Show length guidance and field errors directly below relevant controls; limits are specification BR-04.

Created by, creation time, Ticket Number/parent, status and performer are server-controlled/read-only, with performer pending until completion. Load active IT Staff options from existing `/api/staff/users` with approved Admin access. Do not allow selecting inactive/non-staff accounts or a free-text performer. Empty/failed staff options produce explicit feedback and retry; backend still rejects inactive races.

Create sends PLANNED behavior and a stable UUID requestId; disable repeated save while busy. On ambiguous network failure retain draft and same UUID/payload for safe retry. A deliberate different request uses a fresh UUID. After success/refetched replay, update parent versions/list/summary, focus success/created action and clear only the successful form. If submission fails validation/conflict/network, preserve recoverable entered values.

### View/edit/assignment modes

View shows all readable fields with read-only styling; Edit exposes only allowed fields for current state/Ticket. Reassignment is available only Planned/In Progress and uses active staff list; completed actor/assignee/time remain immutable. Completed content corrections require nonblank Result and append history. Cancelled action and terminal Ticket show explanatory read-only state; Resolved/Closed Ticket must be reopened before action changes. Do not hide existing shared content just because writes are blocked.

Save includes expected action/Ticket versions. Cancel edit restores the loaded values without sending a request. Do not silently discard a draft on recoverable request failure or overwrite it during a background refresh. Conflict feedback offers Refresh current record, then explicit reapplication after the user compares saved state; never silently replace versions and resubmit. Permissions/versions come from current server state, not stale local role assumptions.

### Start, complete and cancel

- Start: Planned -> In Progress; assignee must still be valid.
- Complete: Planned/In Progress -> Completed; show Result* and follow-up fields; clearly state actual performer will be signed-in user. Completion with follow-up still true is allowed but blocks Ticket resolution until explicitly addressed.
- Cancel action: inline labelled confirmation panel with required reason; Cancel confirmation returns focus to initiating control; confirm appends immutable cancellation evidence. No delete button.
- No lifecycle controls for Completed/Cancelled; permitted completed content correction is separate from lifecycle transition.
- When assignee was deactivated, show name/inactive state and explain reassignment before completion; allow cancellation with reason even if assignee inactive.

Use an inline panel rather than introduce a new modal library. If implementation uses existing modal/native confirmation instead, keyboard focus, accessible title, reason input and return focus must satisfy the same checks.

### History view (staff/Admin only)

Show chronological immutable revision/version and Ticket status-event sections accessible from Detail; each displays date, actor and meaningful changed-state information/reason. No Edit/Delete history controls. Shared action list and private operational history are distinctly labelled. Capture history before/after a permitted edit to demonstrate append-only behavior, without exposing it to requester endpoints/UI.

## 4. Ticket workflow and resolution feedback

Preserve original Ticket fields as read-only for Requesters; staff/Admin operational controls retain ownership, IT Priority and Status. Use the exact eight statuses and matrices in specification BR-10-12, not a broad destination dropdown. Server detail supplies matrix-authorized destinations and resolution blockers; a gate-dependent resolve/close choice is disabled with textual reasons when ineligible. Backend remains authoritative and rechecks after any stale screen.

Cancellation/reopening prompts require labelled reason (1-500). Cancellation explains that outstanding actions will be cancelled and retained. Reopening preserves prior action history and the dated requester indication. Do not automatically change status on Public Comment or requester indication.

Resolution feedback identifies each unmet predicate safely: active Ticket Owner; completed action with Result; no active actions; no pending non-cancelled follow-up. Guide staff to relevant section without implying a requester can resolve formally. When gate satisfied, submit expectedTicketVersion. Success refetches Ticket summary, versions, history and allowed controls. Conflict preserves any reason/draft and asks for explicit refresh/review. Keep existing requester Problem Appears Resolved action owner-only, idempotent and clearly advisory; after reopen its old timestamp is labelled historical.

Ticket-status response clarification (proposed SD, not PDF HTTP rules): avoid enabling Save for an unchanged destination, but handle a bypassed/repeated fresh-version same-status request as 400 NO_CHANGES: "The Ticket already has the requested status." It is neither a success nor a stale conflict, creates no history/version change and needs no gate/conditional-reason evaluation. A structurally valid stale request is 409 STALE_UPDATE even if its requested status now matches; a fresh different unlisted transition is 409 INVALID_TRANSITION. Preserve drafts and use explicit refresh/review for either conflict, without changing version and blindly resending. Structural errors are 400 before version checking; after authorization/resource/version/equality/matrix checks, a permitted transition's missing reason is field validation and unmet gate is 409. Follow the exact API precedence/examples, not a frontend-only duplicate rule.

## 5. Consistent state/feedback contract

| State | Required visible behavior |
|---|---|
| Loading | Named loading status for dashboard/list/staff options/history; no fake zero counts; disable only dependent actions; prevent stale-response overwrite. |
| Validation | Readable field message below associated control, required marker/text, error summary where useful, focus first invalid field; keep values. |
| Ticket status: no effective change | Fresh-version same-status 400 NO_CHANGES is informational validation, not success/conflict; no history/version change, no automatic retry. |
| Success | Announced status, authoritative list/summary/version refresh, focus preserved/returned sensibly. |
| Empty | Genuine zero/[] explanation; role-appropriate next action; legacy zero actions is valid. |
| No results | Explain filters rather than imply no Tickets exist; offer clear filters to existing list. |
| Forbidden / initial password required | Safe explanation or existing change-password flow; remove restricted data/controls; do not retain another role's cached content. |
| Expired session / logged out | Existing login flow and cache clearing; no protected mutation/data remains visible. |
| Conflict | Explain another change/current-state rule, retain draft, explicit refresh/review/reapply; never silent overwrite or blind retry with new version. |
| Not found / inaccessible | Generic unavailable Ticket/action; return to permitted list, no ownership disclosure. |
| Network / safe API failure | Safe retry guidance, no raw server details, preserve important input; creation retries reuse original UUID/payload. |

Dashboard loading/empty/forbidden/failure and action/workflow states require actual evidence later; a screenshot of a spinner alone does not verify recovery. All statuses have text and safe role-appropriate explanations.

## 6. Responsive and accessibility behavior

Preserve Lab 2/3 desktop >=992px, tablet 768-991px, mobile <768px intent; existing Queue may adapt its table earlier at 1200px and need not be globally rewritten. Use local scoped CSS so new components do not regress Admin/requester views. Long Ticket summaries, action notes, names and attachment filenames wrap; controls stack with sufficient spacing. No horizontal page scrolling, clipped labels or overlapping errors. Any expandable record has an accessible name and keyboard operation.

Use semantic headings/nav/forms/tables or labelled records. Every input/select/checkbox has an associated visible label; required fields have text/asterisk and native/ARIA semantics as appropriate; messages use linked descriptions and invalid state. Native buttons/links operate by keyboard. Focus remains visible; opening editor/confirmation focuses meaningful heading/control and closing restores trigger. Success uses status announcement; errors are readable alerts, without repeatedly stealing focus. Text badges distinguish status/priority/private content without color alone; icon-only controls require accessible names. Verify keyboard behavior manually as well as DOM assertions. No unsupported accessibility-conformance claim is made by this plan.

## 7. Screenshot evidence plan

Required folders (PDF section 12), not created/captured in I1:

```text
artifacts/lab-04/screenshots/staff-dashboard/
artifacts/lab-04/screenshots/requester-dashboard/
artifacts/lab-04/screenshots/actions-taken/
```

Capture desktop/tablet/mobile for all major Lab 4 screens, including Admin dashboard reuse, actions list/create/edit/read-only states and workflow controls/history. Workflow evidence can live in actions-taken/ with clear `ticket-workflow-*` names; no invented required fourth folder. Suggested filenames are `staff-dashboard-desktop.png`, `requester-dashboard-tablet.png`, `actions-create-mobile.png`, `actions-requester-desktop.png`, `ticket-workflow-history-tablet.png`. Use distinct descriptive filenames per state/device.

Include count/query reconciliation and current-user actions (Answer Part 5), multiple actions/assignment/completion/cancellation/validation/inactive rejection (6), transitions/order/history/privacy (7), owned dashboard/drill-down/earlier regression (8), and visual/keyboard/error/empty/conflict states (9). Some behavior needs paired screenshots plus test output, not a fabricated static screen. Record actual viewport/browser/capture source and reviewed state in the future evidence record. Existing Playwright desktop/iPad Mini/Pixel 7 profiles provide the starting device setup. Do not expose real passwords, cookies or DB connection strings in screenshots/logs.

Screenshots must remain readable when placed in the single final PDF without extreme zoom. Test the final rendered pages and working links; repository images alone do not establish submission readability. Preserve exact Answer Part 1 through Answer Part 9 order from specification.md; Part 9 includes rendered ui-spec.md and the completed checklist below.

## 8. Visual/accessibility completion checklist

All items are **Not run**; complete only after actual review and link each result to evidence/commit. These are future release checks, not completed evidence.

- [ ] All roles have correct Dashboard navigation, active indication, permitted existing screens and logout behavior.
- [ ] Zen Green tokens, headings, card/table/button hierarchy and spacing match existing app.
- [ ] Backend metrics, single asOf, inclusive resolution-window endpoints, future-record exclusion and original drill-down cutoffs agree with selected database queries; no lower window added to other current/latest-five lists.
- [ ] Current-user actions use assignee filter and bounded links to the correct parent action.
- [ ] Requester dashboard/actions remain owner-only and read-only; notes/history privacy intact.
- [ ] All Actions Taken list/create/view/edit/assign/start/complete/cancel modes work on three sizes.
- [ ] Creator/assignee/performer and creation/completion times are clearly distinguished.
- [ ] Completed corrections/history and stable ordering are demonstrable; no history mutation controls.
- [ ] Ticket destinations/gate/reasons/refreshed summary and historical advisory indication are clear; fresh same-status 400 NO_CHANGES is distinct from stale/invalid-transition 409 and causes no success claim.
- [ ] Required markers, conditional Follow-up Note, Result and reason validation are placed beside fields.
- [ ] Editable/read-only fields and private/shared content differ by readable labels, not color alone.
- [ ] Loading, success, zero/no-results, forbidden, not-found, conflict and safe-failure states are verified.
- [ ] Recoverable drafts survive failures; repeated click/network retry creates no duplicate effects.
- [ ] Keyboard reaches/operates every control with visible focus and logical return focus.
- [ ] Labels, semantic names, status/error announcements and confirmation controls are accessible.
- [ ] Desktop/tablet/mobile long values do not clip, overlap or cause horizontal page overflow.
- [ ] Earlier auth/My Tickets/Detail/Attachments/Comments/staff/Notes/Admin screens remain usable.
- [ ] No unexplained console errors, broken links, placeholders, unfinished/duplicate active controls.
- [ ] Screenshots are actual current captures, named/grouped correctly, reviewed and readable in final PDF.
- [ ] Rendered UI spec and completed checklist are included in Answer Part 9 with working links.
