# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a responsive Requester-facing TokTickIT MVP where a selected Development Requester can create IT support tickets, view and find their own tickets, open Ticket Detail, and manage permitted attachments. The Development Requester selector is for Lab 2 testing only; real authentication is excluded until Lab 3.

## 2. Stakeholder Request Interpretation

The system must provide a professional Requester ticketing experience. A Requester selects a temporary testing identity, creates a ticket with category, related system, requested priority, summary, description and optional attachments, then receives an official backend-generated Ticket Number. The Requester can later search, filter, sort and page through only their own tickets, view Ticket Detail and manage permitted attachments.

## 3. Scope

### Included
- Development Requester Selection and switching
- Create Ticket
- My Tickets
- Requester Ticket Detail
- Ticket ownership protection
- Search, filtering, sorting and pagination
- Attachment upload, metadata, download and soft removal
- Loading, validation, empty, no-results and failure states
- Responsive Zen Green UI

### Excluded
- Real authentication, passwords, sessions and tokens
- IT Staff workflow and IT Priority changes
- Public Comments, Internal Notes and Actions Taken
- Ticket status changes after the initial `New` status
- Administrator functions

## 4. Functional Requirements

- **FR-01:** Load active Development Requesters and allow one to be selected or changed.
- **FR-02:** Create a Ticket for the selected Requester using Category, Related System, Requested Priority, Summary and Description.
- **FR-03:** Generate the official Ticket Number on the backend after successful creation.
- **FR-04:** Display only Tickets belonging to the selected Requester in My Tickets.
- **FR-05:** Support ticket search, filtering, sorting and pagination.
- **FR-06:** Allow an owned Ticket to be opened in read-only Ticket Detail.
- **FR-07:** Allow permitted Attachments to be uploaded to an owned Ticket.
- **FR-08:** Allow active owned Attachments to be downloaded.
- **FR-09:** Allow owned Attachments to be soft-removed.
- **FR-10:** Reject direct access to Tickets or Attachments belonging to another Requester.
- **FR-11:** Provide loading, validation, success, empty, no-results and safe API-failure states.
- **FR-12:** Support desktop, tablet and mobile layouts.

## 5. Business Rules

- **BR-01:** The backend generates a unique official Ticket Number.
- **BR-02:** Every new Ticket begins with Current Status `New`.
- **BR-03:** The Development Requester selector is a testing mechanism, not authentication.
- **BR-04:** Only active Requesters appear in the selector.
- **BR-05:** Requester-specific screens require a selected Requester; changing Requester reloads requester-specific data.
- **BR-06:** Backend ownership checks prevent one Requester from accessing another Requester's Ticket or Attachment.
- **BR-07:** Ticket Number, Ticket Date and Requester are system-controlled/read-only values.
- **BR-08:** Category, Related System, Requested Priority, Summary and Description are required.
- **BR-09:** For this implementation, Summary is trimmed and limited to 5–120 characters; Description is trimmed and limited to 10–2000 characters. Validation is enforced in both frontend and backend.
- **BR-10:** Requested Priority uses `LOW`, `MEDIUM`, or `HIGH`.
- **BR-11:** Submit is disabled while creation is processing to prevent duplicate submission. If creation fails, entered values remain in the form.
- **BR-12:** My Tickets operates only on the selected Requester's data and supports stable server-side search, filters, sorting and pagination.
- **BR-13:** No owned Tickets produces an empty state; search/filter with no matches produces a no-results state.
- **BR-14:** Allowed Attachment types are JPG/JPEG, PNG, WEBP and PDF.
- **BR-15:** Maximum Attachment size is 5 MB per file and maximum active Attachments is five per Ticket.
- **BR-16:** Attachment removal is soft removal. Removed metadata remains visible, but the file cannot be previewed or downloaded.
- **BR-17:** Soft removal requires confirmation and a removal reason.
- **BR-18:** Files use a server-generated safe storage name while preserving the original filename as metadata.
- **BR-19:** If Ticket creation succeeds but an Attachment upload fails, the Ticket remains saved and the failed upload is reported to the user.
- **BR-20:** The selected Development Requester is stored as temporary client testing context and can later be replaced by authenticated identity in Lab 3.

## 6. UI Specification Summary

The application follows the Zen Green Theme:

- Primary green: `#006B3C`
- Secondary green: `#0B7A46`
- Pale green: `#EAF6EF`
- Page background: `#F5F7F6`
- White cards/surfaces with subtle borders

Main screens are Development Requester Selection, Create Ticket, My Tickets and Requester Ticket Detail.

Required fields use visible labels and asterisks; validation appears beside the relevant field. Read-only and editable fields are visually different. Buttons have clear text, visible keyboard focus and busy/disabled states.

Responsive rules:
- Desktop: `>= 992px`
- Tablet: `768–991px`
- Mobile: `< 768px`
- No clipping, overlap or unintended horizontal page scrolling.

Full details are defined in `docs/lab-02/ui-spec.md`.

## 7. Data Changes

PostgreSQL/Prisma will support:

- **RequesterUser:** id, name, email, isActive, timestamps
- **Ticket:** id, ticketNumber, requesterId, categoryId, relatedSystemId, summary, description, requestedPriority, currentStatus, createdAt, updatedAt
- **Attachment:** id, ticketId, originalName, storedName, mimeType, sizeBytes, removedAt, removalReason, timestamps
- Existing **Category** model will be reused/extended as required.
- **RelatedSystem:** id, name, isActive

Relationships:
- RequesterUser 1 → many Tickets
- Category 1 → many Tickets
- RelatedSystem 1 → many Tickets
- Ticket 1 → many Attachments

`ticketNumber` is unique. Foreign keys and indexes will support ownership lookup, filtering and sorting.

Seed data is idempotent and includes four required Categories, at least six Related Systems, at least four active Requesters and at least one inactive Requester.

## 8. API Contract

Planned REST capabilities:

- `GET /api/requesters` – active Development Requesters
- `GET /api/categories` – active Categories
- `GET /api/related-systems` – active Related Systems
- `POST /api/tickets` – create Ticket
- `GET /api/tickets` – owned paginated/searchable/filterable/sortable Ticket list
- `GET /api/tickets/:id` – owned Ticket Detail
- `POST /api/tickets/:id/attachments` – upload Attachment
- `GET /api/tickets/:id/attachments` – Attachment metadata
- `GET /api/attachments/:id/download` – download active Attachment
- `DELETE /api/attachments/:id` – soft-remove Attachment with removal reason

Responses use appropriate statuses such as `200`, `201`, `400`, `403/404`, `409`, `413`, `415` and `500`, with safe error messages.

Complete request/response shapes, query parameters and error behavior are defined in `docs/lab-02/api-spec.md`.

## 9. Acceptance Criteria

- **AC-01:** Given valid Ticket data, when submitted, then one Ticket is saved and its official Ticket Number is displayed.
- **AC-02:** Given no Requester is selected, when a requester-specific screen is opened, then Requester Selection is shown.
- **AC-03:** Given Requester B is selected, when Requester A's Ticket is requested, then its data is not returned.
- **AC-04:** Given invalid required data, when Submit is attempted, then field-level validation is shown and no Ticket is created.
- **AC-05:** Given Requester A changes to Requester B, then My Tickets reloads with only Requester B's Tickets.
- **AC-06:** Given owned Tickets exist, search, filters, sorting and pagination return the expected owned results.
- **AC-07:** Given there are no owned Tickets or no matching results, the correct empty/no-results state is shown.
- **AC-08:** Given a valid permitted Attachment, when uploaded, then its metadata is displayed.
- **AC-09:** Given an unsupported, oversized or sixth active Attachment, when upload is attempted, then it is rejected.
- **AC-10:** Given an active owned Attachment, when downloaded, then the file is returned.
- **AC-11:** Given an owned Attachment is removed with confirmation and reason, then it is soft-removed and metadata remains visible.
- **AC-12:** Given a removed Attachment, when download/preview is attempted, then the file is not returned.
- **AC-13:** Given an API failure during Ticket creation, then a safe error is displayed and entered values are preserved.
- **AC-14:** Given desktop, tablet and mobile viewports, then required controls remain usable with no clipping, overlap or unintended horizontal scrolling.
- **AC-15:** Given keyboard navigation, interactive controls remain accessible with visible focus.

Every Acceptance Criterion will map to at least one planned test in `tests.md`.

## 10. Definition of Done

Lab 2 is complete when:

- approved Lab 2 scope is implemented;
- all Acceptance Criteria have test evidence;
- unit, API/integration, UI, responsive and E2E tests pass;
- no required test is skipped or disabled;
- database, API and UI match the approved specifications;
- ownership and Attachment rules work correctly;
- desktop, tablet and mobile visual checks pass;
- required documentation is current;
- peer review is completed;
- feature branches are merged through `lab2-staging`;
- integration tests pass before the release PR to `main`;
- final required tests pass on `main`.

## 11. Assumptions and Decisions

- `LOW`, `MEDIUM` and `HIGH` are the Requested Priority values chosen for this implementation.
- Summary length is 5–120 characters and Description length is 10–2000 characters.
- Search/filter/sort/pagination are performed server-side.
- Development Requester identity is temporary testing context only.
- Attachment soft-removal keeps metadata for traceability.