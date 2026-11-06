# Local configuration and port audit

Finalized 2026-11-04 (Asia/Bangkok), at the student's explicit request after I6 verification. Applies to the active feature/lab4-regression-testing worktree. These settings are the shared local application contract for Issues 1-6 and future I7.

## Standard local application

| Purpose | URL / port |
|---|---|
| Frontend, Vite dev and local built preview | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Existing TokTickIT development PostgreSQL | localhost:5433, database toktickit |
| BankCore application / PostgreSQL | 3000 / 5432, unchanged |

Use one active TokTickIT worktree. Vite dev and built-preview both use strictPort, so an occupied 5173 produces an error instead of another application URL. Backend PORT remains configurable; the local default/example is 3001. Both client transports use VITE_API_URL with a 3001 local fallback. Dashboard, Actions and Workflow adapters already share the main API adapter.

Production deployments supply their own explicit PORT and build-time VITE_API_URL; an empty VITE_API_URL is supported only with an explicitly configured same-origin reverse proxy. The local read-only preview uses http://localhost:3001. It does not require a new permanent port for an issue.

## Audit and classification

Inspected all four worktrees (original I3, lifecycle I4, dashboards I5, regression I6), available I1 specification/I2 backend/I3-I5 branch references and origin/lab4-staging. Read-only git ls-remote confirmed staging at d8ba0a5184e8dc006d258b4fd1877f46aa13acf8, matching I6's base and including merged I3-I5.

The inherited source/server defaults and environment examples used 3000; the server example used database port5432. Existing preview overrides masked those inconsistencies. The original workspace's private client environment already selected3001 and its database selected5433, but its private server PORT remained3000. Those private files and all other worktrees were preserved. The approved preview reads only that existing database target and overrides PORT in its own process.

| Reference | Classification and treatment |
|---|---|
| 3000 | BankCore application; obsolete inherited TokTickIT defaults corrected. Guard tests rejecting protected ports remain. The performance dataset's 3000 actions is not a port. |
| 3001 | Shared TokTickIT backend; verified free before startup and selected without fallback. |
| 3002/3003/3004 | Historical I4/I5/I6 preview APIs. Verified obsolete Node processes stopped after the standard preview passed. Historical evidence remains unchanged. |
| 5173 | Shared application frontend and ordinary Playwright base configuration. |
| 5174 | Temporary isolated Lab4 test frontend; explicit I6/I4/I5 harness overrides remain. No permanent preview remains here. |
| 5432 | BankCore's host PostgreSQL and PostgreSQL's internal container port; correct historical/internal references preserved. TokTickIT's local example now uses5433. |
| 5433 | Existing development database, preserved; no migrations, seeds, permission changes or business writes. |
| 55432 | Existing isolated PostgreSQL cluster and historical strict harness guards, untouched. |
| 4173 | Vite's installed implicit built-preview default; explicitly pinned to5173 for local consistency. |
| Docker-assigned/API-allocated ports | Disposable test configuration, not permanent application endpoints. |

The [sanitized audit inventory](../../artifacts/lab-04/i6/port-configuration-audit.json) records every listed-number source/config/documentation/local-script reference found during the pre-change scan, with file/line/port and category. Generated raw logs, binary screenshots and dependency caches were excluded. It deliberately retains historical references and non-port numerical matches; it is not a list of values to replace globally.

## Changed configuration scope

- server/src/index.ts: backend default3001.
- client/src/api.ts and client/src/TicketDiscussion.tsx: API fallback3001, preserving explicit/empty VITE_API_URL overrides.
- client/vite.config.ts: dev and built preview5173, strictPort enabled.
- client/.env.example and server/.env.example: public local endpoints3001/5433; existing example placeholders preserved.
- README.md: shared ports, safe current test instructions and no migration/seed during a port switch.
- client/tests/lab-04/ApiConfiguration.test.tsx: six mocked transport cases covering default, deployment override and explicit same-origin mode.
- This document and I6 evidence/report/test-plan updates.

In this port follow-up, no private environment file, authentication/authorization rule, database schema, historical commit, main or lab4-staging branch was changed.

## Active read-only preview

Current Issue6 frontend PID39468 serves http://localhost:5173 from the regression/client directory. Backend PID22160 serves http://localhost:3001 from regression/server and verifies the existing development target5433 before application import.

The local-only preview wrappers keep the HTTP write deny-list and Prisma mutation guard. Only normal login/logout session handling is enabled. Account/password, Ticket, Action and other business changes are blocked before application handlers. Preview launchers/logs remain excluded under i6-local; they are not application source or part of the commit scope.

Verified obsolete Node PIDs18116 (I5 frontend5173),45036 (I6 frontend5174),28556 (I6 API3004),29808 (I5 API3003),25804 (I4 API3002) were individually identified before stopping. BankCore/database/container processes were not stopped. Do not run an older worktree alongside this one on the standard ports.

## Actual verification and manual review

- Focused transport/discussion:10 passed in2 files.
- Full frontend after configuration edits:306 passed in27 files, zero failed/skipped.
- Database-independent harness/configuration guards:44 passed in4 files, zero failed/skipped.
- Client TypeScript/Vite build and server TypeScript build: passed.
- HTTP login document and entry/source modules:200; served API modules target3001.
- Backend health:200, with credentialed CORS for http://localhost:5173.
- Five business-write probes:403 PREVIEW_READ_ONLY, before application handlers; no agent login/session creation or business mutation.
- Agent browser inspection was skipped. On2026-11-04, the student completed manual Requester, IT Staff and Administrator dashboard review and reported that the UI looks correct. This is manual evidence, not a fresh automated browser count.

The earlier I6 backend739/browser84/audit81/performance results remain attributed to their original approved isolated runs; no database-dependent suite was rerun during this configuration change. The focused10 are included in the306 frontend total. The44 guard cases overlap the original backend coverage.

Open http://localhost:5173 and refresh old tabs with Ctrl+F5. Use existing current passwords; no reset is required or performed. Review dashboards, search/filter/pagination, Ticket/Action read views, allowed histories and form drafts. Saving business/password/account changes remains blocked. The preview stays running for manual review.

## I7 integration verification, 2026-11-04

The final worktree is based on staging91d627a, which includes I6's standard-port configuration unchanged. The permanent application remains the existing read-only frontend5173/API3001, development PostgreSQL5433. Its I6 process labels identify its source worktree; git diff confirms that source equals the integrated I7 product source. No parallel permanent I7 application was created, no process switch was needed and no environment file was edited.

Fresh HTTP checks returned200 for the React document and API health, with credentialed CORS for http://localhost:5173. The compiled I7 backend also returned200 from an owned temporary health process without database variables; that process was stopped. Disposable browser/frontend5174 and allocated API/database ports remain temporary test resources. Final results and exact attribution are in [final-testing-report.md](final-testing-report.md).
