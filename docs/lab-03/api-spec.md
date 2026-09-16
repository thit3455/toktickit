# TokTickIT Lab 3 API Specification

## 1. Authentication Overview

TokTickIT Lab 3 uses server-managed session cookie authentication.

The server is responsible for:

- validating user credentials;
- creating authenticated sessions;
- identifying the current user;
- enforcing role-based authorization;
- invalidating sessions during logout.

Authentication secrets and passwords must never be exposed to client applications.

---

# 2. Authentication APIs

## 2.1 Login

### POST /api/auth/login

Purpose:

Authenticate a user using email and password.

### Request

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Success Response

Status:

```
200 OK
```

Response:

```json
{
  "user": {
    "id": 1,
    "name": "Example User",
    "email": "user@example.com",
    "role": "REQUESTER"
  },
  "mustChangePassword": false
}
```

### Validation

The API must reject:

- missing email;
- missing password;
- invalid credentials.

### Error Responses

```
400 Bad Request
```

Invalid input.

```
401 Unauthorized
```

Invalid email or password.

```
403 Forbidden
```

Inactive account.

---

## 2.2 Logout

### POST /api/auth/logout

Purpose:

Destroy the current authenticated session.

### Success Response

Status:

```
200 OK
```

Response:

```json
{
  "message": "Logged out successfully"
}
```

---

## 2.3 Current User

### GET /api/auth/me

Purpose:

Retrieve the currently authenticated user.

### Success Response

Status:

```
200 OK
```

Response:

```json
{
  "id": 1,
  "name": "Example User",
  "email": "user@example.com",
  "role": "REQUESTER"
}
```

### Error

```
401 Unauthorized
```

No active session.

---

## 2.4 Change Initial Password

### POST /api/auth/change-password

Purpose:

Allow users with an initial password to create a new password.

### Request

```json
{
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

### Rules

- User must be authenticated.
- Password confirmation must match.
- Password must satisfy validation rules.
- mustChangePassword becomes false after success.

### Success Response

```
200 OK
```

---

# 3. Authorization Model

Every protected endpoint checks:

1. Authentication status.
2. User role.
3. Resource ownership.

Frontend hiding buttons is not considered authorization.

Backend authorization is the security control.

---

# 4. Requester APIs

Requester operations continue from Lab 2.

The authenticated user identity replaces the Development Requester selector.

The client cannot provide another requester identity.

---

## 4.1 Create Ticket

### POST /api/tickets

Purpose:

Create a new ticket using the authenticated Requester.

Authorization:

Allowed:

```
REQUESTER
```

The backend automatically sets:

```
requesterId = authenticated user
```

---

## 4.2 View My Tickets

### GET /api/tickets/my

Purpose:

Retrieve tickets owned by the authenticated Requester.

Authorization:

Allowed:

```
REQUESTER
```

Users cannot view another Requester's tickets.

---

## 4.3 Ticket Detail

### GET /api/tickets/:id

Purpose:

Retrieve owned ticket information.

Authorization:

Allowed:

```
REQUESTER
IT_STAFF
ADMINISTRATOR
```

Access depends on ownership and role permissions.

---

## 4.4 Public Comments

### POST /api/tickets/:id/comments

Purpose:

Create a Public Comment.

Visible to:

- Requester;
- IT Staff;
- Administrator.

Request:

```json
{
  "content": "The issue is still happening."
}
```

Validation:

- Empty content rejected.
- Whitespace-only content rejected.

---

### GET /api/tickets/:id/comments

Purpose:

Retrieve Public Comments.

---

## 4.5 Problem Appears Resolved

### PATCH /api/tickets/:id/resolution-indication

Purpose:

Requester indicates that the problem appears resolved.

Important:

Requester cannot directly change status to:

- Resolved;
- Closed.

---

# 5. IT Staff APIs

## 5.1 Ticket Queue

### GET /api/staff/tickets

Purpose:

Retrieve operational Ticket Queue.

Authorization:

Allowed:

```
IT_STAFF
```

Possible administrator access must be explicitly defined by authorization rules.

---

### Query Parameters

Supported:

```
search
status
priority
owner
sort
page
limit
```

Example:

```
GET /api/staff/tickets?status=OPEN&page=1
```

---

### Response Example

```json
{
  "tickets": [
    {
      "ticketNumber": "TK-001",
      "summary": "Network problem",
      "status": "OPEN",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "owner": "Staff User"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

---

## 5.2 IT Staff Ticket Detail

### GET /api/staff/tickets/:id

Purpose:

Retrieve complete ticket information for IT operations.

Includes:

- Ticket information;
- Requester information;
- Attachments;
- Public Comments;
- Internal Notes;
- Ownership information.

---

## 5.3 Claim or Reassign Ticket

### PATCH /api/staff/tickets/:id/owner

Purpose:

Assign or change Ticket ownership.

Request:

```json
{
  "ownerId": 5
}
```

Authorization:

Allowed:

```
IT_STAFF
```

---

## 5.4 Update IT Priority

### PATCH /api/staff/tickets/:id/priority

Purpose:

Update IT Priority.

Request:

```json
{
  "itPriority": "HIGH"
}
```

Authorization:

Allowed:

```
IT_STAFF
```

Requested Priority remains unchanged.

---

## 5.5 Update Ticket Status

### PATCH /api/staff/tickets/:id/status

Purpose:

Update permitted Ticket workflow status.

Allowed statuses:

- NEW
- OPEN
- IN_PROGRESS
- WAITING_FOR_REQUESTER
- RESOLVED
- CLOSED
- REOPENED
- CANCELLED

Authorization:

Allowed:

```
IT_STAFF
```

Invalid transitions are rejected.

---

## 5.6 Internal Notes

### POST /api/tickets/:id/internal-notes

Purpose:

Create private operational notes.

Visible only to:

- IT Staff;
- Administrator.

Request:

```json
{
  "content": "Checked server configuration."
}
```

Requester access is forbidden.

---

### GET /api/tickets/:id/internal-notes

Purpose:

Retrieve Internal Notes.

Authorization:

Allowed:

```
IT_STAFF
ADMINISTRATOR
```

---

# 6. Administrator APIs

Administrator manages users only.

Administrator responsibilities are separated from IT Staff ticket operations.

---

## 6.1 User List

### GET /api/admin/users

Purpose:

Retrieve user accounts.

Authorization:

Allowed:

```
ADMINISTRATOR
```

Supports:

- Search by name;
- Search by email;
- Optional role filter.

---

## 6.2 Create User

### POST /api/admin/users

Purpose:

Create a user account.

Request:

```json
{
  "name": "New User",
  "email": "new@example.com",
  "role": "REQUESTER",
  "password": "initialPassword"
}
```

Validation:

- Email must be unique.
- Role must be valid.
- Password must be stored securely.

---

## 6.3 Update User

### PATCH /api/admin/users/:id

Purpose:

Update basic account information.

Editable:

- name;
- email;
- role;
- activation state.

---

## 6.4 Set Initial Password

### POST /api/admin/users/:id/password

Purpose:

Set a new initial password.

After change:

```
mustChangePassword = true
```

The user must change password at next login.

---

# 7. Error Handling

All APIs use safe error responses.

## 400 Bad Request

Invalid input.

Example:

- Missing required field.
- Invalid password format.

---

## 401 Unauthorized

User is not authenticated.

---

## 403 Forbidden

User is authenticated but does not have permission.

---

## 404 Not Found

Resource does not exist.

---

## 409 Conflict

Data conflict.

Example:

- Duplicate email address.

---

## 500 Internal Server Error

Unexpected server error.

Sensitive information must not be exposed.

---

# 8. Security Decisions

TokTickIT Lab 3 follows these security rules:

- Passwords are stored using secure hashing.
- Plaintext passwords are never stored.
- Authentication is handled by server sessions.
- Backend authorization protects every restricted operation.
- Safe error messages prevent information leakage.
- Internal Notes are protected from unauthorized access.
- Ticket ownership is validated on the server.

---

# 9. API Completion Criteria

The API contract is complete when:

- Authentication APIs work.
- Role authorization works.
- Requester ownership is protected.
- IT Staff workflow APIs work.
- Administrator user APIs work.
- Safe error handling is implemented.
- Tests cover required behaviors.