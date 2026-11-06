# Lab 4 AI Use Record

Updated 2026-11-06 (Asia/Bangkok). Part 4 submission draft for my review.

## AI Tools Used

I used **ChatGPT (OpenAI)** to help me understand the Lab requirements, specifications, acceptance criteria, GitHub workflow and testing procedures.

I used **Codex (OpenAI)** for specification review, implementation, debugging, automated testing, integration verification and documentation preparation.

**Exact model versions:** Unrecorded. I have not inferred historical model names from the tool currently running. Both tools were confirmed in the information I supplied for this record.

I reviewed proposed decisions and the application myself. Codex ran many of the automated checks; I do not describe all agent-executed checks as commands that I personally ran.

---

## Selected Prompts

These eight entries use verbatim excerpts from my actual Lab 4 conversation. Surrounding instructions are omitted, not reconstructed. Where an entry has two quotations, both excerpts come from the same request. The responses are summarized below; they are not quoted as original AI output.

Verification references point to existing implementation reports, tests and saved evidence. This documentation update does not claim a new application test run.

### Prompt 1: Specification review

> Read `docs/lab-04/actions-backend-report.md` and the approved Lab 4 specification, API specification, and test plan before changing anything.

### How I used the response

I used the review to keep the Actions Taken backend work aligned with the approved requirements and existing seven-issue plan. Codex compared the implementation, API contract and test plan before proposing changes.

**Verification:** The approved documents and [requirements-to-evidence checklist](final-traceability.md) provide the references for reviewing the implementation. I am reviewing the final submission draft against the teacher's requirements.

---

### Prompt 2: Seed eligibility and test design

> Validate the eligibility of creator, assignee, and performer accounts before creating new actions.

> Add focused tests for concurrent assignee role changes and PATCH rollback when revision persistence fails.

### How I used the response

I used this request to correct seed eligibility and strengthen tests for failures that ordinary success cases would miss. Codex added eligibility checks without changing existing account roles or activation settings, and added concurrency and rollback coverage.

**Verification:** The [Actions backend report](actions-backend-report.md) records the changes, earlier unverified database cases and later results. The [final testing report](final-testing-report.md) records the isolated seed, concurrency and transaction verification.

---

### Prompt 3: Protect recovery credentials

> Prevent database passwords from appearing in `pg_dump` or `pg_restore` process command-line arguments.

### How I used the response

I used this request to fix a security problem in the recovery test setup. Codex changed credential handling to use a filtered process-local environment and documented explicit PostgreSQL 18 tool selection.

**Verification:** Database-tools unit tests check process arguments and environments. The [final testing report](final-testing-report.md) records the actual migration and recovery runs, including populated Actions, revisions, replay records and subsequent writes.

---

### Prompt 4: Clarify implementation permissions

> Allow Administrators to perform only the Ticket transitions, assignment changes, and priority updates explicitly authorized by those requirements.

> Preserve Requester ownership and privacy restrictions.

### How I used the response

I approved this clarification for Issue #4 using BR-10 and API section 7. Codex aligned backend authorization and frontend Ticket Workflow controls with that scope. This later approval superseded Issue #3's limited Administrator Ticket queue-read prerequisite; it did not authorize unrestricted operations.

**Verification:** The [Ticket Workflow report](ticket-workflow-report.md) records the decision and role/privacy checks. The [Actions UI report](actions-ui-report.md) retains the earlier scope so the two approvals are not confused.

---

### Prompt 5: Dashboard calculations

> Use one server-generated asOf timestamp for consistent dashboard calculations and drill-downs.

### How I used the response

I used this clarification to make dashboard counts and drill-down filters consistent. Codex implemented the shared cutoff, inclusive creation/update rules and the seven-calendar-day Bangkok-time window only for Recently Resolved.

**Verification:** The [dashboard report](dashboards-report.md) records boundary tests, API checks, independent SQL comparisons and browser drill-down verification. The final execution evidence is linked from the [final testing report](final-testing-report.md).

---

### Prompt 6: One local application configuration

> Keep temporary isolated test ports separate from permanent application ports.

### How I used the response

I used this instruction to keep one TokTickIT application configuration instead of a permanent port for every issue. Codex standardized frontend 5173, backend 3001 and development PostgreSQL 5433 while keeping disposable test infrastructure separate.

**Verification:** The [local configuration record](local-configuration.md) documents the port audit and health/CORS checks. Isolated test targets were verified before test writes; development and BankCore targets were excluded from those tests.

---

### Prompt 7: Accessibility and responsive verification

> Check keyboard navigation, visible focus, form labels, accessible names, error messages, dialog behavior, color contrast, and desktop/tablet/mobile layouts.

### How I used the response

I used this request to guide integration checks beyond feature success cases. Codex ran automated accessibility and browser checks, inspected selected screenshots and recorded the limits of the evidence. I also completed my manual review of the three role dashboards.

**Verification:** The [accessibility report](accessibility-report.md), [responsive report](responsive-report.md) and [final testing report](final-testing-report.md) distinguish automated results, agent visual inspection and my reported manual review. They do not claim unperformed human screen-reader or physical-device testing.

---

### Prompt 8: Evidence and submission preparation

> Only describe deliverables as mandatory if confirmed by the teacher's PDF or actual Issue #7 acceptance criteria.

### How I used the response

I used this instruction to keep the final documentation tied to the teacher's requirements. Codex prepared the implementation summary, traceability checklist, testing report, review references and draft PDF. Historical, skipped and unexecuted checks were kept separate from actual passing results.

**Verification:** The [submission checklist](submission-checklist.md) and [final integration report](final-integration-report.md) identify the evidence and outstanding review/release gates. Preparing a local draft does not mean that publication, final-main verification or teacher submission has happened.

---

## My Reflection

### Specification-Agent Use

I used ChatGPT and Codex to help me understand the Lab 4 requirements and organize acceptance criteria and the test plan. I checked proposed decisions before approving them. For example, I approved the Administrator permission clarification and dashboard timestamp rules. AI helped me organize the work, but the teacher's requirements and approved specifications still guided my decisions.

### Coding-Agent Use

Codex helped me implement the frontend and backend, debug errors, run tests and prepare documentation. I manually reviewed the Requester, IT Staff and Administrator dashboards.

One practical limitation was that Codex could not inherit the database variables from my PowerShell session. Database checks in that environment had to remain unverified until they were actually run with a verified, approved test setup. I learned that a skipped test must not be counted as passed.

### What I Learned

I learned that AI-generated results should not be accepted without checking them. I still needed to review the requirements, inspect the application, check test results, and make decisions about the project. I think AI is a useful assistant, but I am responsible for verifying the final work.

I will review this reflection and the rendered submission before approving publication. Passing automated tests does not replace my friend's peer review.

---

## Record Limits

The prompts come from the conversation available for this record. Exact historical model versions were not recorded; I would need a verifiable tool/session record before adding them.

Results in the linked reports keep their original dates and execution scope. This Markdown update does not rerun tests or regenerate the existing draft PDF.
