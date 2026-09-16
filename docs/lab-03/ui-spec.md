# TokTickIT Lab 3 UI Specification

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

Before release verify:

- Consistent Zen Green appearance
- Clear editable/read-only fields
- Correct role navigation
- Status badges
- Priority badges
- Validation messages
- Loading feedback
- Responsive behavior