# Lab 4 Issue #7 - Final Integration and Submission Preparation

Prepared 2026-11-04 (Asia/Bangkok). **Ready for student review of the candidate changes; not ready for teacher submission.** Nothing is staged, committed, pushed, opened as a PR, merged or submitted.

## 1. Identity and integration

- Actual [GitHub Issue #70](https://github.com/thit3455/toktickit/issues/70): Lab 4 Issue #7 - Final Integration & Submission; still open.
- Branch: `feature/lab4-final-integration`.
- Worktree: `C:\Users\ASUS\Documents\Software eng_lab\Lab1_Starter_Scaffold\toktickit-lab4-final`.
- Base/HEAD: `91d627afa88a9cf1d6f2730b00c5b3784d134817`, latest fetched staging and still the remote staging head in the final read-only check.
- `origin/main` remains `e356e4394a878052ab14d12055bf379998da9ff0`; the final Lab 4 feature release is not on main.
- Initial inventory, recorded before I7 edits: 32 server test files, 27 client test files, 9 browser specs; no known current failing suite. Historical I6 transient/native-control/manual limits were retained.

All six feature heads are staging ancestors: I1 9abf18d399b3dd5afca292df35fad71ac7460cbb; I2 9bb4cdc6018437b657035b3d202d7f6563a90d1f; I3 f910107142f013621084064558082b96014248e9; I4 8038059708f2de800fbd1c6b05e1d7c54ae5d5b1; I5 7b821be43165107c47f0156105050f1ed2577965; I6 e1887d17fd9ac7884b9cb4e8ae2c32221b4df7a6. No merge conflict, missing dependency or staging drift was found.

[reviewer.md](reviewer.md) and [GitHub history](../../artifacts/lab-04/i7/github-history.json) record real issues #57/60/62/64/66/68, PRs #58/59/61/63/65/67/69, and APPROVED reviews by Chanya-Grace-2546. PR #58 was historically merged into main, then #59 synchronized it into staging; no history was rewritten. GitHub returned no check runs for this staging commit. Local test results are not described as GitHub CI.

## 2. Integrated application verification

| Area | Actual verification |
|---|---|
| Requester | Authentication/mandatory password change, owned dashboard/My Tickets/Create/Detail, attachments/comments/advisory indication, read-only Actions and ownership/privacy restrictions passed in full suites. |
| IT Staff | Dashboard/Queue, assignment/priority/status, Actions, resolution/closure/reopening/cancellation, saved history and private notes passed. |
| Administrator | Operational dashboard, preserved User Management safeguards, approved Queue/detail access and scoped I4 Ticket/Action operations passed; no Requester creation or implicit Staff assignment added. |
| API/model/workflow compatibility | Real API, frontend adapters and browser flows; exact version/replay/error precedence, eligibility, concurrency and rollback passed. |
| Data preservation/recovery | Both migration/recovery cases and all 10 seed cases actually executed and passed on owned schemas, including populated Action/revision/replay restore and subsequent writes. |
| Dashboard reporting | All 16 real API cases passed independent SQL reconciliation, bounds, assignee formulas, Bangkok/inclusive cutoffs and preserved drill-down filters. |
| Navigation/validation/failure states | Full component/browser suites covered loading, validation, safe failures, conflicts, retry/draft behavior and role navigation. Supplemental mocked scenarios are identified in final-testing-report.md. |

I3's initial Administrator Queue-read-only prerequisite was explicitly superseded by student-approved I4 BR-10/API section 7 operational permissions. That approved distinction remains unchanged. I7 adds no role, schema, authentication or product-policy change.

## 3. Fresh I7 test results

| Disjoint group | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Non-dashboard backend, 29 files | 722 | 0 | 0 |
| Dashboard APIs, 2 files | 16 | 0 | 0 |
| Approved performance smoke, 1 file | 1 | 0 | 0 |
| Full frontend, 27 files | 306 | 0 | 0 |
| Legacy browser | 27 | 0 | 0 |
| Actions/Workflow/Staff browser | 30 | 0 | 0 |
| Dashboard browser | 12 | 0 | 0 |
| Accessibility/responsive browser | 15 | 0 | 0 |

Totals: **739 backend / 32 files; 306 frontend / 27 files; 84 Playwright cases / 9 specs**. Browser projects each passed 28 cases, one worker, retries disabled, zero flaky results. Initial 294 database-independent backend passes overlap 739 and are not added. Historical I2-I6 counts are not reused as fresh results.

Server noEmit TypeScript, server production build, frontend TypeScript/Vite build and browser/helper TypeScript passed. Actual compiled backend entry returned health HTTP 200 without database variables; only its owned temporary process was stopped. Git diff, candidate whitespace, link/scope and credential-pattern checks passed after documentation was finalized. [Exact executed commands/results](final-testing-report.md), [complete selected output](../../artifacts/lab-04/i7/verification-summary.json) and [all browser cases](../../artifacts/lab-04/i7/browser-case-results.json).

Performance: approved 1000 Tickets/3000 Actions, 3 warmups and 20 sequential measured requests per endpoint. Requester p95 16.27ms; Staff p95 20.70ms; all 40 measured and 6 warmups HTTP 200, below the approved 2000ms smoke target. All samples remain in [performance.json](../../artifacts/lab-04/i7/performance.json); this is not production load/SLA evidence.

## 4. Accessibility and responsive evidence

Fresh automated result: 81 axe4.14.0 screen/state audits, zero violations, zero overlapping controls and zero horizontal page overflows. All 93 closed-native-select contrast measurements exceeded 4.5:1 (minimum15.426:1). Twenty-seven audits retain incomplete native-select contrast targets. Actual Tab/Enter, focus entry/return, validation and inline confirmation checks passed.

Projects: desktop Chromium1440x1000; tablet WebKit768x1024; mobile Chromium390x844; additional320x900 role-navigation smoke. The41 selected current synthetic PNGs cover required major dashboards, Action create/read-only/cancel/history, Workflow/history, error/loading/empty and representative earlier screens. Original full captures/logs remain local; selected source paths/hashes are recorded in verification-summary.json.

On 2026-11-04, agent visual review inspected six current screenshots and the original30 draft PDF pages in five contact sheets; dense text page5 and form/workflow pages18/23 were inspected at full render size. Green/white hierarchy, labels, focus, wrapped text, controls and stacked layouts were legible. Native single-line read-only values retain their normal horizontal value scrolling. This is agent visual inspection, not new student manual testing. The student's earlier I6 three-role dashboard review remains historically attributed.

No I7 human screen-reader, physical-device, OS select-popup, exhaustive zoom/high-contrast or complete WCAG certification was performed. These limits are not relabelled passes. [Full testing report](final-testing-report.md), [all81 audits](../../artifacts/lab-04/i7/accessibility-audits.json), [PDF rendering/link audit](../../artifacts/lab-04/i7/pdf-qa.json).

## 5. Approved isolation and cleanup

The student separately approved the exact new I7 plan before provisioning. Only container `toktickit-i7-a731c8e042d9`, ID `355a42f06da7f4f1b633b7f21c68a1772ac7600e5677acda9c91d6c38114d1ab`, PostgreSQL18.6 with new tmpfs storage was created. Docker assigned `127.0.0.1:59026`; existing protected ports5432/5433/55432 were refused as targets.

Only new databases toktickit_lab4_test_i4_a731c8e042d9, toktickit_lab4_test_i5_a731c8e042d9 and toktickit_lab4_test_i6_recovery_a731c8e042d9 were used. These compatibility prefixes reuse strict existing helper code, not old resources. Two restricted runners had no superuser, database/role management, replication, bypass-RLS or elevated memberships; CONNECT/CREATE/TEMPORARY were confined to corresponding new targets.

Exact container ID/owner label/loopback/tmpfs/PG18/data directory/database/role/permissions/empty state checks preceded each group. Migrations, seed fixtures and backup/restore stayed in uniquely owned schemas; recovery used the separate new target. Inherited database/libpq variables were filtered; credentials stayed in memory, private child environments and stdin, outside process arguments/logs/project environment files. PostgreSQL18.4 psql/pg_dump/pg_restore were explicitly selected and verified.

Every group returned to empty user-table state. The exact new container and tmpfs were removed after testing; final listener checks confirmed temporary5174/59026 released. No existing Docker volume/container, development database, existing55432 cluster or BankCore resource was modified by I7 verification. Earlier migration SQL, including password repair, was replayed only in fresh disposable schemas; no development migration was applied.

## 6. Unified configuration and preservation

The one existing read-only application remains **http://localhost:5173** frontend PID39468 and **http://localhost:3001** backend PID22160. Preview identity reports development PostgreSQL5433. These processes serve merged I6 source, which git diff confirms is identical to current integrated I7 product source. No independent permanent I7 application, new permanent port or unnecessary restart was introduced.

Fresh frontend/API HTTP200 and credentialed CORS5173 checks passed. Business-write/password/account protections remain in the existing preview wrapper. I7 did not log into real accounts, change sessions, reset passwords or modify existing Tickets/Actions. Normal user preview activity remains separate from isolated synthetic tests.

Final SHA-256 preservation checks matched original99 local files, I4's83 artifacts, I5's124 evidence files and all727 I6 artifact files. Prior worktree branches/HEADs were unchanged. BankCore3000/native5432 and existing5433/55432 listeners remained present. Preservation is based on controlled operations and hashes, not a claim that unrelated running applications cannot change their own data.

## 7. Defects and documentation corrections

No new application integration defect was reproduced; no product code, business rule, schema, test assertion, timeout or skip was changed. Necessary final documentation work corrected the README's Lab3-only overview, added truthful current execution notes to the approved contract, created actual reviewer/AI records and mapped requirements to current evidence.

The draft audit caught a relative AI-record PDF link, overbroad rendered BR excerpts, inefficient table columns/reflection pagination and screenshot crop positions; these were corrected. PowerShell-captured outputs were normalized from UTF-16 to UTF-8, and three trailing spaces in newly quoted review responses were removed. Final PDF/link/whitespace checks passed. These tooling/document findings are separate from application test counts; no failed test was hidden.

## 8. Teacher requirements and submission boundary

The complete 11-page teacher SE+Lab+4.pdf was read. Sections9/10/12/14 require the four contract documents, reviewer.md and ai-use.md, actual test/evidence records, prescribed screenshot folders and **exactly one concise PDF with Answer Part1 through Answer Part9 in order**. Section14 explicitly requires final-main passing output, reviewed feature/staging/main history and a final all-Done Project board.

The current32-page draft is [prepared here](../../output/pdf/toktickit-lab4-submission-draft.pdf). All nine headings are ordered; text-bound and local-link targets passed, and all pages were rendered/reviewed. It contains selected rendered contract/test/UI excerpts and eighteen readable screenshot viewport crops; full authoritative documents/original PNGs are linked. Local draft paths require the repository layout; final published links and main evidence must replace prepublication references. Student review of the draft's final presentation is still required.

[Submission checklist](submission-checklist.md) maps each teacher part, points, evidence and pending gates. [ai-use.md](ai-use.md) uses the student's confirmed ChatGPT/Codex attribution, exact versions Unrecorded, eight original instruction excerpts with Purpose/Result/Verification fields and a structured reflection draft based on the student's supplied words and recorded approvals/manual reviews. The student will review the revised reflection wording before publication. No tool, personal experience, reviewer response or model version was invented. No ZIP, video or LMS requirement is inferred.

**Not teacher-submission-ready:** I7 student/friend review and integration; separately authorized reviewed staging-to-main release; complete actual final-main tests/builds; final all-Done Project evidence; and the final PDF/reference update remain pending. No main merge is authorized/performed by this report.

## 9. Issue #70 acceptance status

| Criterion | Current status |
|---|---|
| AC1 I1-I6 integrated | Verified: exact heads, real approved PRs and latest staging ancestry. |
| AC2 required workflows together | Verified on fresh isolated I7 full suites. |
| AC3 complete backend/frontend/E2E checks | Verified on feature worktree; final-main requirement remains pending. |
| AC4 accessibility/responsive documentation | Prepared with actual automated/visual results and explicit manual limits. |
| AC5 config/setup/examples | Verified within current local scope;5173/3001/5433 preserved. |
| AC6 final documentation/evidence | Feature review package prepared; release-dependent additions pending. |
| AC7 GitHub issues/PRs/peer reviews | I1-I6 verified; I7 review and final release pending. Project status not independently accessible. |
| AC8 teacher artifacts/checklist | Draft/checklist prepared; final-main/Project/finalPDF gates prevent completion. |
| AC9 preservation/secrets | Final scope/hash/credential-pattern audit passed; index empty; existing databases excluded. |
| AC10 reviewed and integration/submission ready | Candidate ready for student/friend review; actual approval and submission completion pending. |

Full30-AC/FR/BR/test/PDF mapping is in [final-traceability.md](final-traceability.md). No GitHub acceptance checklist, issue state or Kanban status was edited.

## 10. Exact candidate file allowlist - 77 files

This is a review allowlist, not permission to stage. Eight existing tracked documents are modified;69 candidate files are new:14 documents total,21 curated evidence/manifest files,41 selected PNGs and one draft PDF. Raw local controllers, private configuration, traces, dependency/render caches, ignored log duplicates and all prior issue worktrees are excluded.

The machine-readable exact list is [candidate-files.txt](../../artifacts/lab-04/i7/candidate-files.txt); [final-scope-summary.json](../../artifacts/lab-04/i7/final-scope-summary.json) records complete git status --short, scope, environment and preservation results.

```text
README.md
artifacts/lab-04/i7/accessibility-audits.json
artifacts/lab-04/i7/accessibility-browser-output.txt
artifacts/lab-04/i7/backend-output.txt
artifacts/lab-04/i7/browser-case-results.json
artifacts/lab-04/i7/candidate-files.txt
artifacts/lab-04/i7/checks-output.txt
artifacts/lab-04/i7/client-build-output.txt
artifacts/lab-04/i7/configuration-health.json
artifacts/lab-04/i7/dashboard-api-output.txt
artifacts/lab-04/i7/dashboards-browser-output.txt
artifacts/lab-04/i7/final-scope-summary.json
artifacts/lab-04/i7/frontend-output.txt
artifacts/lab-04/i7/frontend.json
artifacts/lab-04/i7/github-history.json
artifacts/lab-04/i7/legacy-browser-output.txt
artifacts/lab-04/i7/pdf-qa.json
artifacts/lab-04/i7/performance-output.txt
artifacts/lab-04/i7/performance.json
artifacts/lab-04/i7/server-build-output.txt
artifacts/lab-04/i7/verification-summary.json
artifacts/lab-04/i7/workflow-browser-output.txt
artifacts/lab-04/screenshots/actions-taken/i7-action-cancel-dialog-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-action-cancel-dialog-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-action-cancel-dialog-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-action-editor-focus-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-action-editor-focus-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-action-editor-focus-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-action-revision-history-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-action-revision-history-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-action-revision-history-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-actions-admin-history-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-actions-admin-history-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-actions-admin-history-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-requester-detail-actions-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-requester-detail-actions-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-requester-detail-actions-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-ticket-status-history-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-ticket-status-history-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-ticket-status-history-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-editor-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-editor-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-editor-tablet.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-resolution-history-desktop.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-resolution-history-mobile.png
artifacts/lab-04/screenshots/actions-taken/i7-workflow-resolution-history-tablet.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-create-validation-mobile.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-dashboard-desktop.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-dashboard-mobile.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-dashboard-tablet.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-empty-desktop.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-loading-desktop.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-safe-error-desktop.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-safe-error-mobile.png
artifacts/lab-04/screenshots/requester-dashboard/i7-requester-safe-error-tablet.png
artifacts/lab-04/screenshots/staff-dashboard/i7-administrator-dashboard-desktop.png
artifacts/lab-04/screenshots/staff-dashboard/i7-administrator-dashboard-mobile.png
artifacts/lab-04/screenshots/staff-dashboard/i7-administrator-dashboard-tablet.png
artifacts/lab-04/screenshots/staff-dashboard/i7-administrator-users-tablet.png
artifacts/lab-04/screenshots/staff-dashboard/i7-small-mobile-administrator-mobile.png
artifacts/lab-04/screenshots/staff-dashboard/i7-staff-dashboard-desktop.png
artifacts/lab-04/screenshots/staff-dashboard/i7-staff-dashboard-mobile.png
artifacts/lab-04/screenshots/staff-dashboard/i7-staff-dashboard-tablet.png
docs/lab-04/accessibility-report.md
docs/lab-04/ai-use.md
docs/lab-04/api-spec.md
docs/lab-04/final-integration-report.md
docs/lab-04/final-testing-report.md
docs/lab-04/final-traceability.md
docs/lab-04/local-configuration.md
docs/lab-04/responsive-report.md
docs/lab-04/reviewer.md
docs/lab-04/specification.md
docs/lab-04/submission-checklist.md
docs/lab-04/tests.md
docs/lab-04/ui-spec.md
output/pdf/toktickit-lab4-submission-draft.pdf
```

## 11. Proposed PR and exact next action

After student approval only: publish this allowlisted branch, then prepare a PR from feature/lab4-final-integration to lab4-staging for the designated friend. Suggested title: **Lab 4 Issue #7 - Final Integration and Submission Preparation**. Reference #70 without prematurely claiming its final submission criteria complete.

Suggested description: Verifies the integrated I1-I6 application at staging91d627a; records739 backend,306 frontend and84 browser passes with zero failures/skips; documents81 accessibility/state audits, responsive evidence, exact SQL/performance/migration/recovery checks, actual peer history and student-confirmed AI reflection; prepares the nine-part draft and final release checklist. Product code/permissions/schema are unchanged. Final-main testing, all-Done Project evidence and the final PDF update remain release gates. Reviewer checks exact scope, source/evidence attribution, safety and remaining submission steps before approving integration.

**Next user action:** review this report, the77-file allowlist and draft PDF. If satisfied, authorize the specific I7 Git publication/PR step. No publication or main merge occurs until that separate approval; friend review precedes staging integration. I7 cannot be declared fully complete or submitted to the teacher yet.

## 12. AI-use reflection revision, 2026-11-05

At the student's request, ai-use.md now follows LLM Used; Selected Key Prompts with Prompt/Purpose/Result/Verification; and My Reflection with Specification-Agent Use, Coding-Agent Use and What I Learned. Codex is the primary tool named. Earlier student-confirmed ChatGPT planning support remains acknowledged, and historical model versions remain Unrecorded. Eight actual instruction excerpts and recorded examples are used; no new prompt, model version, personal experience or test result is invented. The reorganized reflection remains a draft for the student's wording review.

Answer Part4 now occupies pages11-14. The PDF is32 pages. All four revised pages were rendered and visually inspected; the28 other content pages match the prior reviewed PDF pixel-for-pixel when excluding page-number footers. All nine headings remain ordered, all67 draft link targets resolve under the recorded local/base-file checks, and text-bound checks found no overflow. The prior30-page PDF and original AI record were preserved in an excluded private revision folder.

This was a documentation/PDF revision only. No application tests were rerun;739 backend,306 frontend and84 browser passes retain their2026-11-04 attribution. The77-file candidate membership is unchanged. Local document/hash/scope checks were repeated; Git publication, Issue70 closure, databases and running services remain untouched. Final-main/review/Project/submission gates remain pending.
