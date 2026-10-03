# Lab 3 AI Use Record

## AI Model Details

- Tool/provider: ChatGPT AI assistant and coding agent
- Specification support model/version: OpenAI ChatGPT (used for requirement analysis, PDF interpretation, planning, and review)
- Coding support model/version: Coding agent integrated with AI assistance (used for implementation guidance, code review, testing support, and documentation preparation)
- Development period: Lab 3 implementation period
- Assistance scope:
  - Analysing Lab 3 requirements and acceptance criteria
  - Planning database, API, frontend, and testing tasks
  - Reviewing implementation approaches
  - Supporting debugging and error analysis
  - Reviewing automated test coverage
  - Preparing technical documentation

AI assistance was used as a development support tool. All generated suggestions and changes were reviewed against the Lab 3 PDF requirements, existing project structure, and automated test results before acceptance.

---

## Key Development Prompts

| # | Development Area | Key Prompt Used |
|---|---|---|
| 1 | Requirement analysis and specification | Review the Lab 3 PDF requirements and identify the required features, acceptance criteria, and implementation tasks. |
| 2 | Database and authentication | Analyse the existing authentication system and help implement the required Lab 3 database and user access requirements while preserving existing functionality. |
| 3 | IT Staff queue | Implement and review the IT Staff ticket queue requirements including search, filtering, sorting, pagination, ownership and workflow actions. |
| 4 | Ticket workflow management | Review ticket claim, reassignment, priority updates, status transitions, comments, and internal notes requirements. |
| 5 | Requester workflow | Implement and verify Requester features including ticket ownership protection, comments, attachments, and resolution indication. |
| 6 | Administrator User Management | Implement Administrator User Management according to the Lab 3 PDF including user listing, searching, filtering, creating users, editing accounts, and password reset functions. |
| 7 | Security and authorization testing | Verify Administrator security rules including forbidden access, self-deactivation prevention, and last active Administrator protection. |
| 8 | Final verification and submission preparation | Review automated test results, E2E coverage, responsive behaviour, documentation requirements, and final Lab 3 submission readiness. |

---

## My Reflection

During Lab 3 development, AI assistance was mainly used for understanding requirements, planning implementation steps, reviewing code changes, and improving testing coverage.

For the specification stage, I used AI to analyse the Lab 3 PDF and break the requirements into smaller development tasks. I compared the suggestions with the official requirements and adjusted the implementation plan when necessary.

During the coding stage, AI helped explain technical approaches, identify possible issues, and suggest solutions. However, I reviewed the generated changes manually and verified that the implementation matched the required behaviour. Automated tests were used as the main confirmation that features worked correctly.

For testing, AI helped organise test coverage for API, UI, security, regression, and end-to-end scenarios. The final verification included frontend tests, backend tests, and browser-based E2E tests.

One important lesson learned was that AI can improve development speed and help with problem solving, but it cannot replace understanding the requirements. Careful review against the PDF specification, testing results, and project structure was necessary to ensure the final implementation was correct.

AI assistance also helped me understand the importance of documentation, security validation, and maintaining existing features when adding new functionality.

---

## Verification References

The following documents provide supporting evidence for the completed Lab 3 implementation:

- `docs/lab-03/admin-verification.md`
- `docs/lab-03/requester-verification.md`
- `docs/lab-03/tests.md`

These documents contain implementation verification details and pre-merge feature validation results. Latest verified totals are 125 frontend, 163 backend and 33 E2E tests passed (321 total, 0 failed, 0 skipped), with both builds passing. Migration regression, dedicated authentication E2E, real-API Staff E2E, required E2E structure and responsive evidence are now covered. See `docs/lab-03/visual-evidence.md` for the screenshot review and normal single-line input observation. This is not final-main verification: Part 3 output must be collected after the final merge. No new reviewer approval is implied by automated passing results.
