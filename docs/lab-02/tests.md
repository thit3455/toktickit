# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 uses Test-Driven Development and Test-Driven Design. Tests are planned from the approved specification before implementation. Coverage includes unit, API/integration, UI component, UI style, responsive, and end-to-end testing.

Tests cover happy paths, invalid input, ownership, failures, loading and empty states, responsive behavior, Attachment lifecycle, and multi-Requester behavior.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-01 | Ticket Number generation | Unique valid Ticket Number returned | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| API-01 | API | AC-01 | Create valid Ticket | 201; Ticket saved; Ticket Number returned | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-02 | API | AC-03 | Cross-Requester Ticket access | Other Requester's Ticket is not returned | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-03 | API | AC-06 | Search, filter, sort and pagination | Correct owned Ticket results and metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-04 | API | AC-08, AC-09 | Attachment validation/upload | Valid file accepted; invalid files rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-05 | API | AC-10, AC-11, AC-12 | Download and soft removal | Active file downloads; removed file blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| UI-01 | UI | AC-02, AC-05 | Requester selection/switching | Correct Requester context is displayed/reloaded | `client/src/lab-02-tests/RequesterSelection.test.tsx` | Planned |
| UI-02 | UI | AC-04 | Invalid Create Ticket form | Field-level messages; invalid API request not sent | `client/src/lab-02-tests/CreateTicket.test.tsx` | Planned |
| UI-03 | UI | AC-07 | Empty and no-results states | Correct message/state appears | `client/src/lab-02-tests/MyTickets.test.tsx` | Planned |
| UI-04 | UI | AC-13 | Ticket creation API failure | Safe error shown; entered values preserved | `client/src/lab-02-tests/CreateTicket.test.tsx` | Planned |
| UI-05 | UI | AC-08, AC-09, AC-11 | Attachment UI states | Upload, invalid and removed states display correctly | `client/src/lab-02-tests/AttachmentSection.test.tsx` | Planned |
| STYLE-01 | UI Style | AC-14, AC-15 | Zen Green styles and control states | Required classes, labels, focus and validation styles present | `client/src/lab-02-tests/ui-style.test.tsx` | Planned |
| RESP-01 | Responsive | AC-14 | Desktop/tablet/mobile layouts | No clipping, overlap or horizontal page scroll | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-05, AC-06 | Complete Requester Ticket flow | Create Ticket and find it in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-03, AC-08, AC-10, AC-11, AC-12 | Ticket Detail and Attachment lifecycle | Ownership enforced; upload/download/remove work correctly | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Planned Test(s) |
|---|---|
| AC-01 | UNIT-01, API-01, E2E-01 |
| AC-02 | UI-01 |
| AC-03 | API-02, E2E-02 |
| AC-04 | UI-02 |
| AC-05 | UI-01, E2E-01 |
| AC-06 | API-03, E2E-01 |
| AC-07 | UI-03 |
| AC-08 | API-04, UI-05, E2E-02 |
| AC-09 | API-04, UI-05 |
| AC-10 | API-05, E2E-02 |
| AC-11 | API-05, UI-05, E2E-02 |
| AC-12 | API-05, E2E-02 |
| AC-13 | UI-04 |
| AC-14 | STYLE-01, RESP-01 |
| AC-15 | STYLE-01 |

---

## 4. Responsive and Visual Checklist

Screenshots will be checked at:

- Desktop: `>= 992px`
- Tablet: `768–991px`
- Mobile: `< 768px`

Checklist:

- no clipped labels;
- no overlapping validation messages;
- no hidden buttons;
- no unintended horizontal scrolling;
- editable and read-only fields are visually different;
- required asterisks and validation messages are visible;
- button hierarchy and busy states are clear;
- priority/status badges are consistent;
- search, filters and pagination remain usable;
- Attachment filenames remain readable;
- keyboard focus remains visible.

Screenshot evidence will be stored under:

```text
artifacts/lab-02/screenshots/
├── create-ticket/
├── my-tickets/
└── ticket-detail/