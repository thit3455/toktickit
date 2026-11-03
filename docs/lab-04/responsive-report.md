# I6 Responsive and Visual Verification

2026-11-03; GitHub #68. Actual automated and visual evidence only.

| Project | Browser / viewport in CSS pixels | Final browser cases |
|---|---|---:|
| desktop | Chromium, 1440x1000 | 28 passed |
| tablet | WebKit/iPad device profile, 768x1024 | 28 passed |
| mobile | Chromium/Pixel device profile, 390x844 | 28 passed |

One worker, retries disabled. Five new accessibility/responsive scenarios account for 15 of these 84 cases; do not add them again. Each project also executes a 320x900 all-role Dashboard/navigation smoke. Screenshot pixels differ from CSS viewport size because the existing device profiles retain their device scale factors.

## Screens and measurements

The 81 new screen/state captures cover Login, mandatory password changes for every role, Requester/Staff/Admin dashboards, My Tickets, Create/validation, Ticket Detail, shared Actions, Staff Queue, action editor/cancel/revision history, Workflow editor/status history and User Management/editor/validation. Existing real API browser flows additionally cover creation/upload/comment, saved workflow/cancellation/gates/conflicts/retry and Dashboard drill-down. The isolated fixtures include long valid names, descriptions, action descriptions, identifiers and summaries.

No horizontal document overflow or overlapping controls occurred in any of the 81 audited states. No sampled visible button/link/summary target measured below 24x24 CSS pixels. These checks do not prove all possible zoom, text-spacing or hardware combinations.

Agent visual review covered seven actual screenshots listed in accessibility-report.md. Desktop panels retain alignment and spacing; tablet users wrap without table escape; mobile Ticket information and action rows stack; Workflow buttons/editor stack with visible focus; 320px role navigation, metric cards and bounded lists remain readable. Long read-only single-line fields retain native value scrolling; long Description content retains textarea scrolling. No layout correction or redesign was needed beyond the demonstrated accessible labels/contrast changes.

## Evidence and reliability

Eighteen selected full-page images are retained under [artifacts/lab-04/i6](../../artifacts/lab-04/i6/); exact sources and SHA-256 hashes are in verification-summary.json. The local final a11y-browser-1793721137627 folder retains all 81 original captures. Earlier workflow, dashboard and legacy browser artifacts remain local.

The initial workflow group had one tablet pointer/editor timeout (29 passed/1 failed). The affected unchanged tablet file passed 3/3 and the final full group passed 30/30 without a timeout increase or automatic retry. Its original screenshot/trace remains retained; the precise transient cause is unproven and should be monitored in peer/CI execution.

These are browser/device emulations, not physical-device tests. Human screen-reader, OS native-popup, exhaustive zoom/high-contrast and final-main verification are not claimed. All final required project cases passed with no skipped cases; peer review remains pending.
