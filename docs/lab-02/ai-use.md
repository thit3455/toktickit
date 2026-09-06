# Lab 2 AI Use Record

## AI Tool Used

ChatGPT was used as a supporting AI tool during Lab 2.

I used AI mainly to help me understand errors, review implementation steps, improve test code, and compare my implementation with the Lab 2 requirements.

I did not rely on AI output without checking it. I ran the code, tests, browser workflows, and Git/GitHub process myself and corrected problems based on the actual results.

---

## Selected Prompts

### Prompt 1

> Read the Lab 2 PDF with me and explain what I have to do step by step.

### How I used the response

I used the explanation to understand the required workflow, including specification, feature branches, pull requests, testing, evidence collection, and final submission requirements.

---

### Prompt 2

> My GET /api/requesters test expects 200 but I get 404. What should I check?

### How I used the response

I checked the Express routes and implemented the Development Requester endpoint required for Lab 2. I then reran the API test to verify the implementation.

---

### Prompt 3

> My Prisma database cannot connect on localhost. How can I check PostgreSQL and the correct port?

### How I used the response

I used the suggested commands to investigate the PostgreSQL service, Docker containers, and port configuration. I verified that the Lab 2 PostgreSQL database was using port 5433.

---

### Prompt 4

> Can you help me write tests for My Tickets so each requester only sees their own tickets?

### How I used the response

I used the response as guidance for requester ownership, search, filters, sorting, and pagination tests. I ran the tests and corrected the implementation until they passed.

---

### Prompt 5

> The attachment API tests are failing with 404. What routes are missing?

### How I used the response

I reviewed the missing attachment functionality and implemented routes for listing attachments, downloading an active attachment, and soft-removing an attachment with a reason.

The tests were then rerun using the RED to GREEN TDD process.

---

### Prompt 6

> Can you make the whole AttachmentSection.test.tsx file?

### How I used the response

I replaced the incomplete test file with a frontend React Testing Library test suite.

I then corrected failures involving the Upload Attachment action, removal confirmation, removal reason, and invalid file validation until all four Attachment Section tests passed.

---

### Prompt 7

> The frontend tests pass, but the real attachment data uses fileName, fileSize and uploadedAt. How should I connect this to the UI?

### How I used the response

I added an attachment mapping function in `client/src/api.ts`.

The mapping converts the backend response fields:

- `fileName` → `originalName`
- `fileSize` → `sizeBytes`
- `uploadedAt` → `createdAt`

I then reran the frontend tests and production build.

---

### Prompt 8

> Playwright fails when desktop, tablet and mobile write the same screenshot file. How do I fix it?

### How I used the response

I changed the screenshot filename to include the Playwright project name.

For example:

```ts
path: `artifacts/lab-02/screenshots/create-ticket/home-${testInfo.project.name}.png`