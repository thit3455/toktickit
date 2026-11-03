# I6 Accessibility Verification

2026-11-03; GitHub #68. See [regression-report.md](regression-report.md) for commands, isolation, failures and actual final totals.

## Method and coverage

Executed five scenarios on desktop Chromium 1440x1000, tablet WebKit 768x1024 and mobile Chromium 390x844, one worker and no automatic retries. Additional 320x900 layout checks run in all three projects. Actual result: 15 passed, zero failed/skipped. These scenarios produced 81 screen/state audits (27 per project).

Pinned axe-core 4.14.0 was installed only under artifacts/lab-04/i6-local/a11y-tools with --ignore-scripts --no-audit --no-fund, using the official npm registry. No project dependency, lockfile, shared node_modules or .env file changed. The helper verifies the exact local package path/version before injecting it. Audit tags: wcag2a, wcag2aa, wcag21aa, wcag22aa. Real finite transitions are allowed to finish before measuring colors; neither motion nor audit rules are disabled.

Covered Login; mandatory Change Password for all three roles; Requester Dashboard, My Tickets, shared Detail/Actions, Create/validation, actual loading, controlled safe 500/retry and real empty state; Staff Dashboard/Queue, Detail/Workflow, action editor/cancellation/revisions, Ticket editor/status history; Administrator Dashboard/User Management/editor/validation; all-role 320px navigation.

## Actual checks and corrections

| Check | Actual result |
|---|---|
| Tab from Login email to password to Login; Enter activation | Passed on all projects |
| First-login gate, hidden normal navigation, protected API 403, rejected password reuse, distinct password saved, old credential denied | Passed for all three roles on all projects |
| Role navigation Tab order, named controls and visible focus | Passed |
| Action editor focus entry and return to opener, cancellation entry/keep, Workflow editor entry/return, Admin heading entry | Passed |
| Required-field labels, aria-invalid/error feedback and safe live loading/error messages | Passed |
| Landmark, heading, table/form label and contrast axe checks | Zero violations across 81 audits |
| Closed native select CSS contrast | 93 measurements, minimum 15.426:1 |
| Visible controls overlap / horizontal page overflow | Zero overlaps; none exceeded viewport width |
| Observed button/link/summary targets below 24x24 CSS px | None in the sampled states; not a complete target-spacing certification |

Eleven read-only Ticket fields lacked programmatic labels. Matching htmlFor/id pairs now expose the existing visible names; a four-case focused Ticket Detail suite including the new regression passed. No values, editing capability or permissions changed.

Real contrast defects were 3.39:1 for green outline retry text on a red alert, and 4.18/4.35:1 for link/secondary editor text on gray. The retry now uses a filled success button, and only Actions/Workflow link/secondary variables are darker. Existing focus styling is preserved. The 82 affected component cases and subsequent full audit passed. Initial transition-timing false findings and all genuine failures are retained, not removed or converted to skips.

## Visual review and evidence

The agent actually inspected seven rendered PNGs: desktop action editor/focus, tablet Administrator users, mobile Requester Detail/Actions, 320px Administrator Dashboard, desktop safe-error/retry, desktop mandatory-password reuse validation, and mobile Workflow editor/focus. Text, green/white/gray hierarchy, labels, wrapped long content, separated controls, role navigation, focus outlines and feedback were legible in those views. Long read-only single-line values remain natively horizontally selectable/scrollable; Description retains its textarea scrolling.

Eighteen selected screenshots are in [artifacts/lab-04/i6](../../artifacts/lab-04/i6/); [accessibility-audits.json](../../artifacts/lab-04/i6/accessibility-audits.json) retains all 81 measurements, exact incomplete targets and geometry. All original screenshots/traces remain local.

## Limits

Axe retained 27 screen-level incomplete color-contrast checks on native selects. Closed-state CSS foreground/background contrast was explicitly measured above; OS-rendered popup menus were not certified. No human screen-reader session, physical device, high-contrast-mode or exhaustive WCAG assessment was performed. Keyboard interaction was automated through actual browser Tab/Enter/focus events; the screenshot inspection is agent visual review, not a claimed human keyboard/screen-reader audit.

Reference thresholds: [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Inactive controls are distinguished from enabled text; remaining native-control limitations are not relabelled automated passes.
