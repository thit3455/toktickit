# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 follows Test-Driven Development (TDD) principles.

Testing was performed against the approved Lab 2 specification and acceptance criteria.

Testing coverage includes:

- Backend API and integration testing
- Frontend UI component testing
- Production build verification
- End-to-end testing
- Responsive testing
- Visual evidence verification

The completed tests verify:

- Development Requester selection and context
- Ticket creation workflow
- My Tickets listing
- Search, filtering, sorting and pagination
- Requester ownership isolation
- Ticket Detail access control
- Attachment upload and validation
- Attachment download
- Attachment soft removal with a required reason
- Retention of removed attachment metadata
- Prevention of access to another Requester's Ticket or Attachment
- Invalid input and error handling
- Responsive layouts

---

# 2. Final Test Results

## 2.1 Backend API / Integration Tests

### Command

```powershell
cd server
npm test