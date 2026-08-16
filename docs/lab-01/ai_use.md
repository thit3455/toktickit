# Lab 1 — AI Use and Reflection

**LLM/agent used:** ChatGPT (OpenAI)

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Read the TokTickIT Lab 1 PDF and explain the requirements, four Issues, dependencies, Git workflow, and tests step by step. | I used the explanation to plan the implementation order and checked each step against the teacher's lab sheet. |
| 2 | Help me solve the PostgreSQL connection problem and connect Prisma to the Lab 1 database without changing the teacher's starter structure. | I followed the troubleshooting steps, used a Docker PostgreSQL container, updated only my local `.env`, and verified the Prisma database connection. |
| 3 | Check Issue 1 against the teacher's acceptance criteria and tell me what is still missing. | I verified the frontend, backend, Bootstrap, PostgreSQL/Prisma connection, testing tools, `.gitignore`, `.env.example`, and README before completing the Issue. |
| 4 | Help me implement Issue 2 health check exactly according to the teacher's requirements. | I implemented `GET /api/health`, connected the React Check System button to the real API, tested Online/Offline behavior, and ran the Supertest test. |
| 5 | Help me implement the Prisma Category model, migration, and idempotent seed for Issue 3. | I created the required Category model, ran the migration, seeded the four required categories, ran the seed twice, and confirmed there were no duplicates. |
| 6 | Follow the teacher PDF and help me complete Issue 4 correctly without adding unnecessary debugging or extra features. | I implemented `GET /api/categories`, updated `checkSystem()`, displayed API-returned categories in React, and added loading and error states. |
| 7 | Help me complete the teacher-provided Supertest and Vitest TODO tests for Issue 4. | I completed the category API test and frontend success/error tests, then ran the server and client test suites until all tests passed. |
| 8 | Check my GitHub PR and Project workflow against the teacher's instructions. | I used the result to verify the feature branch, `lab1-staging` PR target, Development Issue link, PR Review status, peer review, comment response, and reviewer merge workflow. |
| 9 | Help me review my partner's Pull Request against the acceptance criteria and GitHub workflow. | I reviewed the Files Changed and identified a missing Issue link under Development, then asked my partner to correct it before merging. |
| 10 | Read the Lab 1 submission requirements carefully and guide me step by step so I do not miss marks in the final PDF. | I used the checklist to prepare `tests.md`, `reviewer.md`, `ai_use.md`, test evidence, Git workflow evidence, and app demo screenshots. |

## Reflection

My prompts became more specific during the lab. At first, I asked broad questions, but later I included the exact Issue number, file, acceptance criteria, and teacher constraints, which produced more focused and useful results.

I did not accept every AI suggestion automatically. I checked the answers against the official Lab 1 PDF and corrected the workflow when necessary, especially the requirement that feature Pull Requests target `lab1-staging` and are linked to their corresponding Issues under Development.