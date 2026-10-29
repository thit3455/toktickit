# TokTickIT Lab 4 Test Plan and Traceability

Status: **Planned before implementation**. No tests, builds, migrations, seed or recovery commands were executed for Issue #1. Test paths below are planned deliverables unless explicitly identified as existing. Every Final value is Planned; no historical result is a Lab 4 pass. Source: SE Lab 4 sections 10/12/14 and the student-approved choices in [specification.md](specification.md).

## 1. Strategy and execution boundaries

Use the existing Vitest Node/Supertest/Prisma backend, Vitest/jsdom/React Testing Library frontend and Playwright browser setup. Keep real session middleware/roles and real database constraints for integration tests. Mock network timing/failures only for controlled UI tests; the three required Lab 4 E2E suites use real APIs and disposable fixtures. Unit-test pure lifecycle/gate/metric boundary helpers without pretending unit results prove authorization or transactions.

Apply Test DD/TDD: write/review expected behavior before or alongside implementation, exercise a meaningful failing case, implement, and refactor without weakening the contract. Do not replace integration security tests with hidden-button assertions. Existing tests asserting pre-Lab-4 destination-only status behavior or Admin-forbidden operational routes must be deliberately updated to the approved contract, not skipped.

Future database work must use an explicitly identified disposable database/schema with an isolation guard. The migration suite replays actual prior SQL, creates realistic earlier records, applies the future additive migration and compares preserved values. Recovery uses a separate restored database, not the working development schema. Fixture cleanup targets only identifiers allocated by that test. Never run these suites as a supposedly read-only check against the user's database.

## 2. Required and supplementary planned files

| Kind / owner | Planned file |
|---|---|
| Required API, I2 | `server/tests/lab-04/actions-taken.api.test.ts` |
| Required API, I4 | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| Required API, I5 | `server/tests/lab-04/requester-dashboard.api.test.ts` |
| Required API, I5 | `server/tests/lab-04/staff-dashboard.api.test.ts` |
| Required frontend, I3 | `client/tests/lab-04/ActionsTaken.test.tsx` |
| Required frontend, I4 | `client/tests/lab-04/TicketWorkflow.test.tsx` |
| Required frontend, I5 | `client/tests/lab-04/StaffDashboard.test.tsx` |
| Required frontend, I5 | `client/tests/lab-04/RequesterDashboard.test.tsx` |
| Required E2E, I3/I6 | `e2e/lab-04/actions-taken-flow.spec.ts` |
| Required E2E, I4/I6 | `e2e/lab-04/ticket-resolution.spec.ts` |
| Required E2E, I5/I6 | `e2e/lab-04/dashboards.spec.ts` |
| Supplementary unit, I2/I4/I5 | `server/tests/lab-04/rules.unit.test.ts` |
| Supplementary migration/recovery, I2 | `server/tests/lab-04/migration-recovery.test.ts` |
| Supplementary seed, I2 | `server/tests/lab-04/seed.api.test.ts` |
| Supplementary performance, I6 | `server/tests/lab-04/dashboard-performance.test.ts` |
| Supplementary responsive/accessibility/polish, I6 | `e2e/lab-04/accessibility-responsive.spec.ts` |

These files are not created by this documentation task. The frontend parent directory follows current repository conventions; the PDF fixes the filenames but leaves its parent adaptable. I6 owns completeness across feature-owned files. Documentation, review and final PDF checks below are manual audits with no invented automated file.

## 3. Planned verification table

Requirement IDs refer to specification.md; abbreviated Issue owners are defined there. Every row includes positive and negative boundaries where stated. Test IDs are stable and do not imply a fixed number of executable assertions.

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | FR-01-05; BR-01-13; AC-01-05, AC-09-10 | Tables of action/Ticket transitions, conditional fields and all four gate predicates; include every single failing predicate and terminal status. | Only specified transitions/valid fields/gate succeed; cancelled actions excluded from gate; no extra rule such as requester confirmation. | `server/tests/lab-04/rules.unit.test.ts` | Planned |
| ACT-01 | API/integration | FR-01; BR-01-03; AC-01 | Create on one of two Tickets with distinct Ticket Owner, creator, assignee; staff and Admin actors. | 201; one correct parent; PLANNED/version 1; session creator; null performer; ownership unchanged. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-02 | API/validation | BR-04; AC-02 | Missing/blank/overlength/wrong-type fields, Unicode length boundaries, conditional follow-up, invalid IDs, unknown/server fields, malformed JSON. | Safe 400/field errors; no action/version/history partial writes; plain-text rendering contract. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-03 | API/authorization | BR-02-03; AC-03 | Assignment/reassignment to active/inactive/non-staff/nonexistent users; assignee deactivation/role-change race. | Active IT_STAFF only; coherent serialized outcome; previous history remains after deactivation. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-04 | Action workflow/API | BR-05-06; AC-04 | Every action status pair; direct Planned completion; blank Result; cancellation reason; completing actor differs from assignee. | Matrix enforced; automatic actual performer; nonblank completion Result; cancelled record retained. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-05 | API/workflow | BR-06; AC-05 | Content correction after completion, forbidden identity/reassignment/status edits; cancelled immutability; terminal-Ticket action edits. | Allowed correction appends revision without changing performer/time; prohibited writes rejected; reopen required. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-06 | API/history | BR-08; AC-07 | Create/edit/assign/status snapshots, safe actor projections, no-op/replay/failure and forced transaction failure. | One correct revision per actual mutation, immutable older snapshots, no orphan history/partial state/credentials. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-07 | API/ordering | BR-09; AC-08 | Equal creation times, multiple actions, edits, revision ordering and forged timestamps. | createdAt/id order stable; revisions by version; server times immutable; no reordering after edit. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-08 | API/authorization | BR-07; AC-06 | Requester owner/non-owner access to all current action statuses, nested action from another Ticket, requester action/history writes and reads. | Owner sees shared items; no requester writes/history; cross-owner/mismatched resources return safe 404. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTH-01 | Authorization/API | FR-03; BR-07; AC-01, AC-06 | Full route-role matrix: logged out, expired/replayed session, inactive, must-change-password, Requester, IT_STAFF, ADMINISTRATOR. | Existing session gates hold; operational Admin access intentional; no identity query/body bypass or secret leakage. | Four required `server/tests/lab-04/*.api.test.ts` files, especially `actions-taken.api.test.ts` | Planned |
| WF-01 | Ticket workflow/API | BR-10, BR-17; AC-09, AC-16 | All 8x8 Ticket status combinations/roles; malformed fields/enum/version; fresh same status including RESOLVED/CANCELLED/REOPENED without conditional reason; stale same status; stale invalid transition/missing reason/gate failure; fresh permitted transition missing reason; UI metadata. | Deterministic precedence: transport parse -> auth/role -> structural 400 -> authorized resource -> stale 409 -> fresh same-status 400 NO_CHANGES -> different invalid transition 409 -> conditional reason 400 -> gate 409 -> write. No rejected request changes state/history/version; exact valid edges alone succeed. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-02 | Workflow/gate/API | BR-11; AC-10 | Zero actions, only cancelled, one/many completed, blank legacy Result, active actions, pending follow-up, inactive/missing/non-staff owner. | Resolve/close only with all four predicates; direct forged client cannot bypass; failed attempt has no event. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-03 | Workflow/integration | BR-12; AC-11 | Cancellation reason; outstanding action cancellation; completed preservation; forced mid-transaction error. | Ticket/child statuses/revisions commit together or none; reason retained; CANCELLED terminal. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-04 | Workflow/integration | BR-12; AC-11 | Resolve/close/reopen, legacy closed/resolved no actions, missing reopening reason, later action creation. | Existing states retained; future gate enforced; reopen allows work and preserves history/indication. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-05 | Regression/API | BR-13; AC-12 | Owned indication across all eight statuses, repeat, forged timestamp/status, non-owner, later reopen. | First server timestamp unchanged, no status transition/event; authorization retained; historical display data available. | `server/tests/lab-04/ticket-workflow.api.test.ts`; existing `server/tests/lab-03/requester.api.test.ts` | Planned |
| WF-06 | History/authorization | BR-08-09; AC-07-08 | Event ordering with timestamp ties; from/to/reason/actor; account rename; staff/Admin history and requester denial. | Stable append-only safe event projections; attribution snapshot preserved; no requester history leakage. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-07 | API/compatibility | FR-11; BR-14; AC-09, AC-16, AC-22 | Existing `/assign`, `/priority`, `/status` version contracts; no-version requests; Admin explicit-assignee claim; stale reassignment. | Documented approved increments only; versions required; Admin never implicitly assigned as IT_STAFF; prior unrelated APIs unchanged. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| CON-01 | Concurrent integration | BR-10, BR-14-15; AC-16 | Two editors; action creation/completion versus resolve/cancel; assignee/owner deactivation; retry exhaustion; first client changes Ticket to second client's requested status before second client's stale request. | No lost write or gate-violating resolve; versions/state/history agree; original expectations retained; stale same-status remains 409 STALE_UPDATE, never 400 NO_CHANGES or a success; safe 409 after bounded retry. | `server/tests/lab-04/actions-taken.api.test.ts`; `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| DUP-01 | API/retry integration | BR-16; AC-17 | Same-key same-payload sequential/concurrent creation; lost response; reuse after later edit; changed payload/key/actor/Ticket; duplicate update/no-op. | Single creation/revision; authorized exact replay original 201 snapshot/replayed true; mismatch 409; no duplicate updates/history. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| DASH-01 | Dashboard API/calculation | BR-18-21; AC-13 | Two Requesters with different active/waiting/resolved/recent data and counts >5; forged identity; independent expected SQL/Prisma predicates. | Only authenticated owner's exact metrics/attention/recent summaries; full counts, bounded lists. | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-02 | Dashboard API/calculation | BR-18-21; AC-14 | Assigned/unassigned, all priorities/statuses, creator/assignee/performer differences, zero buckets, Admin reuse. | Exact operational metrics; My Active Actions uses assignee; safe Admin zero when no eligible assignments. | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| DASH-03 | Unit/API boundaries | BR-18, BR-20-21; AC-15 | Fixed asOf at Bangkok midnight/UTC rollover; resolution at start-1 ms/start/start+1 ms/asOf-1 ms/asOf/asOf+1 ms; parent/action createdAt and updatedAt independently equal/beyond cutoff; latest future resolution event versus older valid one; records older than window; ties/reopened/legacy/empty cases. | Both event endpoints and all creation/update upper cutoffs inclusive; future parent/action/latest-event cases excluded without older-event fallback; one seven-day resolution window only; no lower date bound on current counts/latest-five; stable order and zero/[]. | `server/tests/lab-04/rules.unit.test.ts`; both required dashboard API files | Planned |
| DASH-04 | Drill-down/API | BR-21; AC-15 | With unchanged data, apply every returned asOf/status/priority/owner/event-window filter to paginated My Tickets/Queue; exact endpoint rows; keep params across paging/sort; reject malformed/future asOf and invalid/missing/reversed window; test equal start=end and later live mutations. | Dashboard counts equal matching list totals at fixed data; original inclusive cutoff/window retained verbatim, not browser/list clock; equal interval valid; no new lower bound for other links; updated-after-cutoff row can disappear on live read without dropping cutoff or promising time travel. | Both required dashboard API files | Planned |
| DASH-05 | API/contract/security | FR-07-08; AC-13-15, AC-18 | DTO shape, one evaluation asOf per response/snapshot despite advancing test clock; window.end and every list drillDown asOf equality; no dashboard query identities/time controls, no attachment content/notes/secrets, bounded payload and forbidden/failure states. | One exact server instant reused, Recently Resolved end equals asOf and start follows Bangkok calendar; list links preserve cutoff; no new staff date window or unauthorized data. | Both required dashboard API files | Planned |
| UI-01 | UI component | FR-01-02; AC-02, AC-04-05 | Action list/create/view/edit/assign/complete/cancel; required markers, conditional note, Result, cancellation reason; display actual performer. | Correct modes and fields; valid requests; disabled/busy controls; draft preserved; no identity editing. | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI component/authorization | FR-03-04; AC-06-08 | Requester all-item read-only view, staff history, terminal actions, tied creation times and Bangkok display. | No requester write/history controls; shared cancelled items visible; stable accessible timestamps/order. | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI component/workflow | FR-05-06; AC-09-12, AC-16 | Allowed destinations, reason/gate feedback, fresh same-status 400 NO_CHANGES versus stale/invalid-transition 409, summary refresh, old requester indication after reopen. | No-op is not success or a stale conflict; 409 retains draft and asks refresh/review; no blind resend or success event; gate/advisory feedback correct. | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-04 | UI component/dashboard | FR-08; AC-14-15 | Staff/Admin cards/current-user actions/recent Tickets/navigation, original asOf retained across clicks/paging/sort despite browser clock advance, zero/error states. | Correct labels, <=5 summaries, unchanged server cutoff, no invented seven-day recent-Ticket/action filter, active indication. | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-05 | UI component/dashboard | FR-07; AC-13, AC-15 | Requester cards/attention/recent list, empty/legacy explanation, copied inclusive resolution boundaries/asOf versus current-count links without lower bound, page reset and owned identity. | Server filters retained verbatim; counts/summaries not recomputed or cutoffs regenerated; useful owned links without duplicating My Tickets. | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| FAIL-01 | API/UI safe failure | FR-09/12; AC-16, AC-18 | Pending/400/401/403/404/409/500/network/invalid JSON; stale drafts; session changes while data is visible; rapid repeat clicks. | Distinct safe feedback; no leaked SQL/credentials; input retained for recoverable cases; restricted data cleared; no silent overwrite. | All four required frontend files and action/workflow API files | Planned |
| MIG-01 | Migration/regression | FR-10; BR-22; AC-19 | Actual pre-Lab-4 SQL -> new additive migration; Users/sessions/Tickets/ownership/catalogs/attachment bytes/removals/comments/notes/times/passwords. | Earlier values/relationships preserved; default versions only; zero action/history backfill; legacy detail/dashboard works. | `server/tests/lab-04/migration-recovery.test.ts` | Planned |
| MIG-02 | Recovery/integration + manual procedure | BR-24; AC-21 | Backup metadata/integrity; restore into distinct guarded disposable DB; compare migration level/data/relationships and read via app API. | Recoverable verified data; no development restore/reset; documented source/target/steps and failure diagnosis. | `server/tests/lab-04/migration-recovery.test.ts`; manual review of recovery record | Planned |
| SEED-01 | Seed/integration | BR-23; AC-20 | Two seed runs with edited intervening user/ticket/action; all status/priority/ownership/action-count/metric scenarios; time aging. | Stable unique identities/counts; no password/work reset; realistic zero/non-zero metrics; no automatic old-date refresh. | `server/tests/lab-04/seed.api.test.ts` | Planned |
| REG-01 | Complete earlier regression | FR-11; AC-22 | Labs 1-3 health/catalog, session/password/logout, owner isolation, creation/lists/detail, attachment rules, comments/private notes, staff and Admin safety. | Earlier approved behaviors pass except explicitly documented Lab 4 matrix/version/Admin increments; no skipped incompatible tests. | Existing `server/tests/lab-01/`, `lab-02/`, `lab-03/`; `client/tests/lab-01/`, `lab-02/`, `lab-03/`; `e2e/lab-02/`, `e2e/lab-03/` | Planned |
| STYLE-01 | UI style | FR-12; BR-25; AC-23 | Existing Zen Green tokens, badge text, editable/read-only/private/shared cues, inline validation, shell and card consistency. | Reused conventions; non-color cues; no unrelated redesign. | Four required frontend files; visual review in `e2e/lab-04/accessibility-responsive.spec.ts` | Planned |
| RESP-01 | Responsive/visual | FR-12; AC-23, AC-25, AC-30 | Every major Lab 4 screen/mode on desktop/tablet/mobile, long names/notes, errors and empty states. | No clipped labels, inaccessible buttons, overlap or page overflow; readable screenshots in required folders. | `e2e/lab-04/accessibility-responsive.spec.ts`; manual visual review | Planned |
| A11Y-01 | Accessibility | FR-12; AC-24 | Keyboard-only navigation, focus after edit/error/refresh, associated labels, live feedback, non-color status, cancellation confirmation/dialog focus. | All controls operable with visible focus/semantic names; no focus trap/lost focus; responsive access retained. | `e2e/lab-04/accessibility-responsive.spec.ts`; required frontend files; manual keyboard review | Planned |
| POLISH-01 | Product hardening | FR-12; AC-25 | Console/page errors, navigation links, placeholder/unfinished/duplicate UI; representative earlier screens. | No unexplained errors/broken links/unfinished controls; existing local files not mistaken for active UI merely by filename. | `e2e/lab-04/accessibility-responsive.spec.ts`; manual audit | Planned |
| PERF-01 | Performance-smoke | FR-13; AC-27 | Representative dashboard queries and bounded DTOs under documented fixture/setup, after warm-up. | Measure proposed target below; no threshold/pass asserted before execution. | `server/tests/lab-04/dashboard-performance.test.ts` | Planned |
| E2E-01 | End-to-end | FR-01-04/09; AC-01-08, AC-17-18 | Real staff/Admin create/assign/reassign/edit/complete/cancel with different actors; requester read-only, inactive rejection, reload persistence. | Integrated lifecycle and shared/private rules persist; duplicates/history correct; run all configured device projects. | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | End-to-end | FR-05-06/09; AC-09-12, AC-16 | Real Ticket create/work/gate-block/follow-up/resolve/close/reopen/cancel; concurrent second client; history and advisory indication. | Correct complete lifecycle, safe conflict and append-only evidence after reload on all device projects. | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | End-to-end/dashboard | FR-07-08; AC-13-15, AC-18 | Real Requester/staff/Admin dashboards; independent fixture counts; attention/current-user lists; drill-down and ownership. | Correct metrics/role navigation/filters and persistence across all device projects. | `e2e/lab-04/dashboards.spec.ts` | Planned |
| DOC-01 | Manual contract/traceability audit | FR-13; AC-26 | Exact spec sections; FR/BR/PDF -> Issue/AC/test; two DB decisions; exclusions; mandatory doc/test filenames; planned-before-code evidence. | No orphan AC, missing category or invented completion; four docs agree and are reviewed before coding. | Not applicable - manual document audit | Planned |
| REL-01 | Manual release audit | FR-14; AC-28 | Actual Issues/Kanban/reviewer/PR/staging/main history; final commit and full test/build output. | Real feature -> lab4-staging -> main evidence; all Issues Done; no pre-merge claim as final-main pass. | Not applicable - GitHub/Git/evidence review | Planned |
| DOC-02 | Manual documentation audit | FR-15; AC-29 | README setup/seed/migration/test/demo, .gitignore/tree, reviewer comments/responses/approvals, AI LLM/6-10 prompts/My Reflection. | Current accurate working links/records; no fabricated identity, model version, screenshot or approval. | Not applicable - manual documentation review | Planned |
| SUB-01 | Manual PDF/evidence audit | FR-15; AC-30 | Exactly one concise PDF; exact nine headings/order; required rendered docs, screenshots, query checks and final-main output. | Readable without extreme zoom; links work; checklist complete; final main remains source of truth. | Not applicable - rendered PDF/link inspection | Planned |

## 4. AC-to-test cross-check

| AC | At least one planned verification |
|---|---|
| AC-01 | ACT-01, AUTH-01, E2E-01 |
| AC-02 | ACT-02, UI-01 |
| AC-03 | ACT-03, E2E-01 |
| AC-04 | ACT-04, UI-01, E2E-01 |
| AC-05 | ACT-05, UI-01 |
| AC-06 | ACT-08, AUTH-01, UI-02 |
| AC-07 | ACT-06, WF-06, E2E-01 |
| AC-08 | ACT-07, WF-06, UI-02 |
| AC-09 | WF-01, WF-07, UI-03, E2E-02 |
| AC-10 | WF-02, E2E-02 |
| AC-11 | WF-03, WF-04, E2E-02 |
| AC-12 | WF-05, UI-03, E2E-02 |
| AC-13 | DASH-01, DASH-05, UI-05, E2E-03 |
| AC-14 | DASH-02, UI-04, E2E-03 |
| AC-15 | DASH-03, DASH-04, UI-04, UI-05, E2E-03 |
| AC-16 | CON-01, WF-07, FAIL-01, E2E-02 |
| AC-17 | DUP-01, E2E-01 |
| AC-18 | FAIL-01, UI-01, UI-04, UI-05 |
| AC-19 | MIG-01 |
| AC-20 | SEED-01 |
| AC-21 | MIG-02 |
| AC-22 | REG-01, WF-07 |
| AC-23 | STYLE-01, RESP-01 |
| AC-24 | A11Y-01 |
| AC-25 | POLISH-01, RESP-01 |
| AC-26 | DOC-01 |
| AC-27 | PERF-01 |
| AC-28 | REL-01 |
| AC-29 | DOC-02 |
| AC-30 | SUB-01, RESP-01 |

This is planned coverage, not executed coverage. When implementation splits a test row, retain its mapping and record the exact new file(s).

### Clarification cases retained in the plan

AC-15 is strengthened without adding a new date window: only Recently Resolved has [Bangkok midnight six calendar days before asOf, asOf], both inclusive. Current counts/latest-five lists have no lower bound. DASH-03 varies each Ticket/action createdAt and updatedAt independently, tests future parent exclusion from My Active Actions, and selects the latest resolution event before interval testing. DASH-04 compares totals against unchanged fixtures using the same cutoff, then separately demonstrates permitted live-state changes. DASH-05 verifies one response instant even when test time advances between query calls. These exact cutoff predicates/propagation are proposed student clarification, not PDF-mandated timestamp fields.

AC-09/AC-16 are strengthened for Ticket-status response precedence: malformed supplied enum/type/version produces structural 400; after authorized lookup, stale version wins over equality/transition/conditional reason/gate as 409 STALE_UPDATE. Fresh same status is proposed 400 NO_CHANGES (including legacy RESOLVED failing gate and CANCELLED with no reason), different unlisted transition is 409 INVALID_TRANSITION; only fresh permitted different transitions proceed to conditional reason and gate checks. WF-01 asserts error codes and unchanged state/history/version, not merely HTTP class. No test has been run for these changes; all Final values remain Planned.

## 5. Performance-smoke proposal

**Proposed target, requiring documented setup, measurement and review:** with 1000 representative Tickets and 3000 actions in a disposable local PostgreSQL dataset, after three warm-up requests, each dashboard endpoint should have p95 server/API round-trip <=2 seconds over 20 sequential authenticated requests, no unexplained failures and all list bounds respected. This is a lab smoke target, not an SLA, load-testing product feature or PDF-prescribed threshold. Record machine/Node/PostgreSQL versions, fixture distribution, API/database placement, query indexes, timing method and results. Review any threshold adjustment explicitly; never tune fixtures or omit slow samples to manufacture a pass.

## 6. Future execution and evidence protocol

The following are documented future commands, **not executed for I1**:

```powershell
npm --prefix client test -- --run
npm --prefix server test -- --no-file-parallelism
npx playwright test --workers=1
npm --prefix client run build
npm --prefix server run build
```

Root npm test is currently a placeholder. Vitest frontend includes `tests/**/*.test.tsx`; backend includes `tests/**/*.test.ts`. Playwright profiles are desktop Chromium, iPad Mini WebKit and Pixel 7 Chromium. Playwright does not start servers. API/frontend/database must be explicitly configured; client defaults to API :3000 whereas existing real-API E2E defaults to :3001 and loads server/.env. Align API URL/frontend API setting/E2E_API_URL against the approved disposable DB before any run. Do not copy real environment credentials into evidence.

Run meaningful feature checks first, then staging integration, then the complete required suites/builds on final main. Record commit SHA, branch, date/time/timezone, configuration, actual filenames, pass/fail/skip counts and full output location. Fix failures without weakening ACs. Update Final values only from real results. Existing Lab 3 docs/README/reviewer contain different chronology claims; neither their 321 aggregate nor earlier screenshots/approvals count as a new run.

Manual UI review is not replaced by successful component assertions. Use the unchecked visual/accessibility checklist in [ui-spec.md](ui-spec.md), record the real reviewed screenshots, and verify readable rendering in the final PDF. Current screenshot directories and reviewer/AI records are future deliverables, not files produced by this plan.

## 7. Release/submission checks

Preserve the exact Answer Part 1 through Answer Part 9 order in [specification.md section 10](specification.md#10-definition-of-done). I7 must verify commit-history/Kanban/reviewer/README/tree evidence (Part 1); prior specification chronology (2); planned/actual tests and full final-main output (3); real LLM/6-10 prompts/My Reflection (4); query-reconciled staff dashboard/current-user actions (5); full action lifecycle (6); ordered immutable workflow/roles (7); owned Requester dashboard and earlier regression (8); rendered UI spec, all major screens on three sizes and completed checklist (9). No unchecked item is a pass.
