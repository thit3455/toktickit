# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 follows Test-Driven Development and Test-Driven Design principles. Testing was performed against the approved specification and implemented features.

Testing coverage includes:

- API/integration testing
- UI component testing
- Build verification
- Visual verification checklist

The completed tests cover:

- Requester selection and context
- Ticket creation
- My Tickets listing
- Ticket detail access control
- Attachment upload validation
- Error handling
- Ownership protection
- Empty and invalid states

---

# 2. Final Test Results

## 2.1 Backend API / Integration Tests

### Command

```powershell
cd server
npm test
```

### Result

```
Test Files  7 passed (7)
Tests       18 passed (18)
```

### Passed Test Files

| Test ID | Requirement | Test File | Result |
|---|---|---|---|
| API-01 | Create Ticket successfully | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-02 | Ticket Detail ownership protection | `server/tests/lab-02/ticket-detail.api.test.ts` | Passed |
| API-03 | My Tickets search, filter, sort and pagination | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| API-04 | Attachment upload validation | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| API-05 | Attachment lifecycle validation | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| API-06 | Requester retrieval | `server/tests/lab-02/requesters.api.test.ts` | Passed |
| API-07 | Existing Lab 1 category and health tests | `server/tests/lab-01/categories.test.ts` | Passed |
| API-08 | Existing Lab 1 health test | `server/tests/lab-01/health.test.ts` | Passed |

---

## 2.2 Frontend UI Component Tests

### Command

```powershell
cd client
npm test
```

### Result

```
Test Files  4 passed (4)
Tests       18 passed (18)
```

### Passed Test Files

| Test ID | Requirement | Test File | Result |
|---|---|---|---|
| UI-01 | Requester selection and switching | `client/tests/lab-02/RequesterSelection.test.tsx` | Passed |
| UI-02 | Create Ticket form validation and states | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| UI-03 | My Tickets display and states | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| UI-04 | Existing application rendering | `client/tests/lab-01/App.test.tsx` | Passed |

---

## 2.3 Production Build Verification

### Command

```powershell
npm run build
```

### Result

```
Successful Vite production build
```

Status:

✅ Passed

---

# 3. Acceptance Criterion Traceability

| Acceptance Criterion | Verified By |
|---|---|
| AC-01 Ticket creation | API-01, UI-02 |
| AC-02 Requester context | UI-01 |
| AC-03 Ticket detail ownership | API-02 |
| AC-04 Validation messages | UI-02 |
| AC-05 Requester ticket visibility | UI-01, UI-03 |
| AC-06 Search, filter, sort and pagination | API-03, UI-03 |
| AC-07 Empty and no-result states | UI-03 |
| AC-08 Attachment upload | API-04 |
| AC-09 Attachment validation | API-04 |
| AC-10 Attachment download | API-05 |
| AC-11 Attachment removal lifecycle | API-05 |
| AC-12 Attachment access control | API-05 |
| AC-13 Ticket creation failure handling | UI-02 |
| AC-14 Visual layout requirements | Visual verification checklist |
| AC-15 Control and style requirements | Visual verification checklist |

---

# 4. Responsive and Visual Verification Checklist

Visual verification will be performed using:

- Desktop viewport: `>= 992px`
- Tablet viewport: `768px - 991px`
- Mobile viewport: `< 768px`

Checklist:

- [ ] No clipped labels
- [ ] No overlapping validation messages
- [ ] No hidden buttons
- [ ] No unintended horizontal scrolling
- [ ] Editable and read-only fields are visually different
- [ ] Required fields and validation messages are visible
- [ ] Button hierarchy is clear
- [ ] Loading/busy states are clear
- [ ] Priority and status displays are consistent
- [ ] Search, filters and pagination remain usable
- [ ] Attachment filenames remain readable
- [ ] Keyboard focus remains visible

---

# 5. Screenshot Evidence

Screenshots are stored under:

```text
artifacts/lab-02/screenshots/
```

Structure:

```text
artifacts/
└── lab-02/
    └── screenshots/
        ├── create-ticket/
        ├── my-tickets/
        └── ticket-detail/
```

---

# 6. Final Testing Summary

| Area | Result |
|---|---|
| Backend API Tests | Passed |
| Frontend UI Tests | Passed |
| Production Build | Passed |
| Database Migration Status | Passed |
| Visual Evidence Collection | In Progress |