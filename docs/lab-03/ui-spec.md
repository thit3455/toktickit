# TokTickIT Lab 3 UI Specification

## Implemented Requester behavior — 2026-10-01

The application restores identity from the server session and shows the authenticated name/role with Logout. Development Requester selection and Change Requester are removed. Requester navigation exposes Create Ticket and My Tickets only.

Ticket Detail retains read-only ticket fields and existing attachments, adds Public Comments and an owner-only Problem Appears Resolved action with saving, success, failure and persisted timestamp feedback. The action does not change ticket status. Internal Notes, IT Staff operations and Administrator user controls are absent from the Requester UI.

My Tickets uses the existing Zen Green table on desktop and labelled cards below 992px. Create, list, detail, comments, attachments and validation were checked in desktop Chromium, tablet WebKit and mobile Chromium.

## 1. Design System

Lab 3 continues the Zen Green design language from Lab 2.

All new screens use:

- Existing color tokens
- Existing buttons
- Existing cards
- Existing form styles
- Existing badges
- Existing validation patterns


## 2. Application Shell

After authentication, the application shell displays:

- Current user name
- User role
- Logout action
- Role-based navigation


Navigation:

Requester:
- My Tickets
- Create Ticket

IT Staff:
- Ticket Queue

Administrator:
- User Management


Unauthorized pages must not be displayed.


## 3. Login Screen

Purpose:

Allow users to authenticate.

Controls:

- Email input
- Password input
- Login button

States:

- Empty form
- Validation error
- Loading state
- Invalid credentials
- Inactive account


## 4. Change Password Screen

Purpose:

Force users with initial passwords to create a new password.

Controls:

- New password
- Confirm password
- Save button


Rules:

- Password confirmation required
- Invalid passwords rejected
- User cannot continue before successful change


## 5. Requester Ticket Screens

Lab 2 requester screens continue with authentication.

Changes:

Removed:

- Development Requester selector
- Change Requester action


Added:

- Public Comments
- Problem Appears Resolved action


Requester can only view and manage owned tickets.


## 6. IT Staff Ticket Queue

Purpose:

Help IT Staff locate and manage tickets.

Display:

- Ticket number
- Created date
- Summary
- Category
- Requested Priority
- IT Priority
- Status
- Ticket Owner
- Last Updated


Features:

- Search
- Filters
- Sorting
- Pagination
- Open Ticket Detail


Feedback:

- Loading
- Empty state
- No results
- Forbidden
- API failure


## 7. IT Staff Ticket Detail

Editable fields:

- Ticket Owner
- IT Priority
- Status


Read-only information:

- Requester information
- Original ticket information
- Attachments


Sections:

- Ticket information
- Public Comments
- Internal Notes
- Attachments


Internal Notes must be visually separated from Public Comments.


## 8. Administrator User Management

Implemented in the existing authenticated shell, showing the Administrator's name, role, Logout and User Management navigation. The screen uses a compact Zen Green user table (Name, Email, Role, Status, Action) beside a shared create/edit/password panel, approximately 60/40 on desktop. Below 992px the panel stacks beneath the list; below 576px the same table becomes labelled compact records. Long names/emails wrap. Administrator styles are scoped and do not alter Requester or IT Staff screens. Opening an editor focuses its heading so keyboard and mobile users can reach it directly.

Search submits a name/email term; role and Active/Inactive filters apply immediately. Clear filters restores the list. Create, Edit and Set Initial Password use a shared inline editor with associated field validation, saving feedback and success messages. Account status is changed in the create/edit form. Self-deactivation is disabled in the editor and also rejected by the API; last-Administrator conflicts are explained by the API response. Self-role changes and self-password resets return to Login because the session is revoked.

Loading, empty list, no matching results, retryable API failure, expired session and forbidden states are distinct. Forbidden/expired responses hide account data and management controls. User deletion and IT Staff operational controls are absent. Screenshots and verification are recorded in [Administrator verification](admin-verification.md).

Purpose:

Manage user accounts.

User list:

- Name
- Email
- Role
- Status
- Edit action


Features:

- Search users
- Create user
- Edit user
- Assign role
- Activate/deactivate
- Set initial password


Restrictions:

- No user deletion
- One role per user


## 9. Responsive Rules

All screens must support:

Desktop:
- Full layouts
- Tables


Tablet:
- Adapted cards
- Reduced columns


Mobile:
- Stacked content
- No horizontal overflow
- Accessible controls


## 10. UI Completion Checklist

Current screenshot inventory and completed visual review: [Lab 3 responsive visual evidence](visual-evidence.md). All 39 submitted screenshots have been reviewed; keyboard focus passes across desktop/tablet/mobile. Single-line input viewports are PASS with observation, not a responsive failure. Gap #5 is resolved. Final PDF rendering/readability and Part 3 final-main test output remain submission checks; the list below is the design checklist.

Before release verify:

- Consistent Zen Green appearance
- Clear editable/read-only fields
- Correct role navigation
- Status badges
- Priority badges
- Validation messages
- Loading feedback
- Responsive behavior
