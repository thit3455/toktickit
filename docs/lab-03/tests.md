# TokTickIT Lab 3 Test Plan

## 1. Test Strategy

Lab 3 testing validates authentication, authorization, migration, IT Staff workflow, Administrator management, UI behavior, and regression from Lab 2.

Testing levels:

- Unit Testing
- API Integration Testing
- UI Component Testing
- End-to-End Testing
- Security and Authorization Testing
- Migration Testing


## 2. Test Traceability

| Test ID | Requirement | Description |
|---|---|---|
| API-01 | AC-01 | Valid user login |
| API-02 | AC-01 | Invalid credential handling |
| API-03 | AC-02 | Initial password change requirement |
| API-04 | AC-07 | Logout invalidates access |
| API-05 | AC-03 | Requester ownership protection |
| API-06 | AC-04 | Internal Note authorization |
| API-07 | AC-05 | IT Staff ticket operations |
| API-08 | AC-06 | Administrator user management |


## 3. Authentication Tests

Test authentication features:

- Valid login
- Invalid email/password
- Inactive user login rejection
- Current user retrieval
- Logout behavior
- Session invalidation
- First login password change


Expected:

- Valid users receive authenticated access.
- Invalid users receive safe error messages.
- Passwords are never exposed.


## 4. Authorization Tests

Verify backend role protection.

Test cases:

- Requester accessing Admin APIs
- Requester accessing Internal Notes
- IT Staff accessing Admin APIs
- Unauthorized Ticket access
- Ownership validation


Expected:

Protected operations return forbidden responses.


## 5. Requester Regression Tests

Verify Lab 2 functions continue working.

Test:

- Create ticket
- View owned tickets
- Ticket detail
- Attachment access
- Public comments

Expected:

Requester identity comes from authentication, not client input.


## 6. IT Staff Tests

Verify:

- Ticket Queue retrieval
- Search
- Filtering
- Sorting
- Pagination
- Ticket ownership assignment
- IT Priority update
- Status workflow
- Public Comments
- Internal Notes


Expected:

IT Staff can manage operational ticket workflow.


## 7. Administrator Tests

Verify:

- User listing
- User search
- User creation
- Duplicate email rejection
- Role assignment
- Account activation/deactivation
- Initial password setting
- Self-deactivation prevention
- Last Administrator protection


Expected:

Only Administrators can manage users.


## 8. UI Tests

Test screens:

- Login
- Change Password
- Ticket Queue
- Ticket Detail
- User Management


Verify:

- Loading states
- Validation messages
- Error feedback
- Role navigation
- Responsive behavior


## 9. End-to-End Tests

Authentication flow:

User login → password change → application access


IT Staff flow:

Login → queue → open ticket → update ticket → add notes


Administrator flow:

Login → users → create user → update account


## 10. Definition of Testing Complete

Testing is complete when:

- All planned tests pass.
- Authorization rules are verified.
- Lab 2 regression tests remain passing.
- UI and responsive checks are completed.
- Evidence screenshots are collected.