# Lab 2 UI Specification

## 1. Visual Theme

TokTickIT uses the Zen Green Theme.

- Primary Green: `#006B3C`
- Secondary Green: `#0B7A46`
- Pale Green: `#EAF6EF`
- Page Background: `#F5F7F6`
- Cards/Surfaces: white with subtle border and shadow
- Main Text: dark charcoal-green
- Error: dark red
- Warning: amber
- Success: green with readable text

## 2. Application Shell

The application header includes:

- TokTickIT identity
- My Tickets
- Create Ticket
- selected Development Requester name
- Change Requester action
- clear active-page indication

Navigation must remain usable on mobile.

## 3. Development Requester Selection

The screen contains:

- TokTickIT title
- explanation that this is for Lab 2 testing only
- Development Requester dropdown
- Continue button

Only active Requesters are shown.

Required states:

- loading
- normal
- no active Requesters
- API failure

Controls must be keyboard accessible.

## 4. Create Ticket Screen

Required information:

- Ticket Number — read-only/generated
- Ticket Date — read-only
- Requester — read-only from selected Requester
- Category — required
- Related System — required
- Ticket Summary — required
- Requested Priority — required
- Description — required
- Attachments

System-generated/read-only fields must look different from editable fields.

Summary and Description must receive sufficient width.

Primary action: `Submit Ticket`

Submit must show a busy state and be disabled while processing.

## 5. Form Component Rules

- Labels appear above controls.
- Required fields show a red `*`.
- Validation messages appear directly below the related field.
- Inputs use consistent height and spacing.
- Description uses a larger multiline control.
- Disabled controls are visually distinct.
- Keyboard focus indicators remain visible.
- Buttons contain clear text.
- Icon-only controls require accessible labels/tooltips.

## 6. Button Hierarchy

### Primary
Used for major actions such as:

- Continue
- Submit Ticket
- Create Ticket

### Secondary
Used for actions such as:

- Cancel
- Back
- Clear Filters

### Destructive
Used for Attachment removal.

### Disabled
Must appear visually disabled and cannot be activated.

### Busy
Shows processing feedback and cannot be clicked again.

## 7. My Tickets Screen

The screen includes:

- page title
- Create Ticket button
- search
- filters
- sorting
- pagination
- Ticket list

Desktop Ticket list displays:

- Ticket Number
- Ticket Date
- Summary
- Category
- Requested Priority
- Current Status
- Last Updated

Clicking a Ticket opens Ticket Detail.

### List States

- loading
- normal list
- empty list
- no search/filter results
- API failure

`Empty` means the Requester owns no Tickets.

`No Results` means Tickets exist but none match the current search/filter.

## 8. Search, Filter, Sort and Pagination

Search must remain easy to find.

Filters include suitable Ticket fields such as:

- Category
- Requested Priority
- Current Status

Sorting must provide a clear selected option.

A Clear Filters action resets search/filter controls.

Pagination displays the current page and allows movement between available pages.

## 9. Ticket Detail Screen

Ticket Detail displays owned Ticket information as read-only.

It clearly separates:

1. Ticket information
2. Attachment actions

The screen must not include:

- Public Comments
- Internal Notes
- Actions Taken
- status-changing controls
- IT Staff controls

## 10. Attachment UI

Attachment states include:

- selected
- uploading
- active
- invalid
- upload failure
- removed
- unavailable

Each active Attachment shows useful metadata such as:

- original filename
- file type
- file size

Available actions:

- Download
- Remove

Removal requires:

- confirmation
- removal reason

Removed Attachment metadata remains visible but Download/Preview controls are unavailable.

Invalid files must show a clear message near the Attachment area.

## 11. Badge Rules

Consistent badge styling is used for:

- Requested Priority
- IT Priority if displayed as read-only
- Current Status

Badges must include readable text and must not communicate meaning through color alone.

## 12. Screen Feedback States

Required UI feedback includes:

- initial
- loading
- validation failure
- submitting
- success
- API failure
- empty
- no-results

Successful Ticket creation clearly displays the backend-generated Ticket Number and a suitable next action.

If submission fails, entered form values remain visible.

## 13. Responsive Rules

### Desktop: `>= 992px`

- multi-column form where suitable
- centered content with sensible maximum width
- My Tickets may use a table

### Tablet: `768–991px`

- two-column layout where practical
- Summary and Description receive sufficient width

### Mobile: `< 768px`

- fields stack vertically
- buttons remain touch-friendly
- Ticket table may change to cards/responsive representation
- no horizontal page scrolling

### All Sizes

There must be:

- no clipped labels
- no overlapping messages
- no hidden buttons
- no unreadable Attachment names
- no unintended horizontal scrolling

## 14. Accessibility

- form controls have associated labels
- keyboard navigation works
- visible focus indicators are retained
- required fields use text/asterisk as well as visual styling
- errors contain readable messages
- status/badge meaning does not rely only on color
- icon-only actions have accessible names/tooltips

## 15. Visual Inspection Checklist

Check:

- Zen Green colors are consistent
- editable/read-only fields are clearly different
- required asterisks are visible
- validation messages appear below fields
- button hierarchy is consistent
- busy and disabled states are visible
- no clipping
- no overlap
- no unintended horizontal scrolling
- search, filters and pagination remain usable
- Attachment controls remain readable
- desktop/tablet/mobile layouts match this specification

## 16. Screenshot Evidence

Screenshots will be stored under:

artifacts/lab-02/screenshots/create-ticket/
artifacts/lab-02/screenshots/my-tickets/
artifacts/lab-02/screenshots/ticket-detail/

Screenshots must include desktop, tablet and mobile evidence.