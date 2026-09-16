# TokTickIT Lab 3 Specification

## 1. Sprint Goal

The goal of Lab 3 is to transform TokTickIT from a development requester-based ticket system into a real authenticated IT ticket management system. The system will support secure login, role-based authorization, Requester ticket management, IT Staff ticket operations, and Administrator user management.

The system will support three user roles:

- Requester
- IT Staff
- Administrator


## 2. Stakeholder Request

The temporary Development Requester selector from Lab 2 will be replaced with real user authentication.

Users must login using email and password. Users with an initial password must change their password before accessing the application.

Requesters continue managing their own tickets using their authenticated identity.

IT Staff can manage operational ticket workflows including ticket ownership, priority, status updates, comments, and internal notes.

Administrators can manage user accounts and roles.


## 3. Scope

## 3.1 Included

The following features are included:

- User authentication
- Logout
- Current authenticated user retrieval
- First-login password change
- Role-based navigation
- Backend authorization
- Requester migration from Development Requester selector
- IT Staff Ticket Queue
- IT Staff Ticket Detail workflow
- Ticket ownership assignment
- IT Priority management
- Public Comments
- Internal Notes
- Administrator User Management


## 3.2 Excluded

The following features are excluded:

- Email invitation
- Password reset email
- Multi-factor authentication
- Social login
- Single sign-on
- Self-registration
- SLA calculation
- Notifications
- Dashboards
- Multiple roles per user
- User deletion
- Bulk user operations


## 4. Functional Requirements

### Authentication

FR-01:
The system shall allow users to login using email and password.

FR-02:
The system shall reject invalid credentials safely.

FR-03:
The system shall allow users to logout.

FR-04:
The system shall provide the current authenticated user information.

FR-05:
Users with an initial password must change password before accessing the application.


### Authorization

FR-06:
The system shall support Requester, IT Staff, and Administrator roles.

FR-07:
The backend shall enforce authorization rules for protected operations.

FR-08:
Frontend visibility controls shall not be considered security protection.


### Requester

FR-09:
Requester ticket operations shall use the authenticated user identity.

FR-10:
Requesters can create and manage only their own tickets.

FR-11:
Requesters can create Public Comments.

FR-12:
Requesters can indicate that a problem appears resolved.


### IT Staff

FR-13:
IT Staff can view the Ticket Queue.

FR-14:
IT Staff can search, filter, sort, and paginate tickets.

FR-15:
IT Staff can claim, assign, and reassign tickets.

FR-16:
IT Staff can update IT Priority.

FR-17:
IT Staff can perform permitted status changes.

FR-18:
IT Staff can create Internal Notes.


### Administrator

FR-19:
Administrators can view users.

FR-20:
Administrators can create users.

FR-21:
Administrators can update user information.

FR-22:
Administrators can assign one permitted role.

FR-23:
Administrators can activate or deactivate accounts.

FR-24:
Administrators can set a new initial password.


## 5. Business Rules

BR-01:
Only active users with valid credentials can authenticate.

BR-02:
Users requiring password change cannot access normal application features before changing password.

BR-03:
Requester ownership is determined by the authenticated user identity.

BR-04:
Public Comments are visible to Requester, IT Staff, and Administrator.

BR-05:
Internal Notes are visible only to IT Staff and Administrator.

BR-06:
Requester cannot directly resolve or close tickets.

BR-07:
Passwords must never be stored in plaintext.

BR-08:
Duplicate email addresses are not allowed.

BR-09:
Users cannot have multiple roles.

BR-10:
Administrator cannot deactivate their own account.

BR-11:
The system must always maintain at least one active Administrator.


## 6. UI Specification Summary

TokTickIT Lab 3 will continue using the Zen Green design system from Lab 2.

New screens:

- Login Screen
- Change Password Screen
- IT Staff Ticket Queue
- IT Staff Ticket Detail
- Administrator User Management

The UI will provide:

- Role-based navigation
- Status badges
- Priority badges
- Loading states
- Validation messages
- Error feedback
- Responsive desktop/tablet/mobile layouts


## 7. Data Changes

The Lab 2 RequesterUser model will evolve into a User model.

The User model will contain:

- name
- email
- password hash
- role
- activation status
- password change requirement


New relationships:

User:
- owns submitted Tickets
- owns assigned Tickets
- creates Comments
- creates Internal Notes


Ticket changes:

- authenticated requester
- IT Staff owner
- IT Priority
- expanded ticket status workflow


New models:

- PublicComment
- InternalNote


Existing data must remain:

- Tickets
- Attachments
- Categories
- Related Systems


## 8. API Contract

Authentication APIs:

- Login
- Logout
- Current user
- Change password


Requester APIs:

- Existing Lab 2 ticket APIs continue using authenticated identity.


IT Staff APIs:

- Ticket Queue retrieval
- Ticket detail retrieval
- Assignment
- Priority update
- Status update
- Public Comments
- Internal Notes


Administrator APIs:

- User list
- User creation
- User update
- Role assignment
- Activation/deactivation
- Initial password update


Authentication Decision:

TokTickIT will use server-managed session cookie authentication.

This approach is suitable for the React and Express application because it provides controlled session management, logout support, and simple backend authorization.


## 9. Acceptance Criteria

AC-01:
A valid active user can login and receive authenticated access.

AC-02:
A user with an initial password must change password before entering the application.

AC-03:
A Requester cannot access another Requester's ticket data.

AC-04:
Internal Notes cannot be accessed by Requesters.

AC-05:
IT Staff can manage tickets through the Ticket Queue and Ticket Detail screens.

AC-06:
Administrators can manage user accounts.

AC-07:
Unauthorized API requests are rejected safely.


## 10. Definition of Done

Lab 3 is complete when:

- Authentication works
- Password security is implemented
- Authorization rules are enforced
- Requester regression works
- IT Staff workflow works
- Administrator management works
- Required tests pass
- Documentation is completed
- Evidence screenshots are collected
- Final PDF submission is prepared


## 11. Assumptions and Decisions

- Session cookie authentication is selected.
- One user can have only one role.
- Deactivation is used instead of deleting users.
- Existing Lab 2 ticket and attachment data will be preserved.
- Passwords will be stored using secure hashing.