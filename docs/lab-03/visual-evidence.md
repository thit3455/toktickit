# Lab 3 responsive visual evidence

## Source and method

Lab 3 PDF page 16 requires four screenshot directories; page 18, Answer Part 9, requires desktop/tablet/mobile screenshots and a completed visual checklist. This review covers the four requested areas, with observations rather than automatic visual approval based on file existence.

Capture command: `npm.cmd exec -- playwright test --workers=1`.
Result: **33 passed, 0 failed** (11 checks on each device). This includes Requester regression, authentication, queue layout, real Staff workflow and Administrator workflow. Capture date: 2026-10-03. Screenshots use disposable test accounts. No application code was changed for this evidence task.

Device profiles from `playwright.config.ts`: desktop Chromium (Desktop Chrome, 1280x720 CSS pixels), tablet WebKit (iPad Mini, 768x1024), mobile Chromium (Pixel 7, 393x727). Device scale factors make PNG pixel dimensions larger; full-page captures extend vertically. These are emulated devices, not physical-device certification.

All 39 submitted PNGs below were opened and visually inspected across the initial review and this follow-up. Copies preserve original screenshot pixels. Authentication, Staff, Requester and Administrator captures use real backend data; the supplemental mocked queue test is not the source of the submitted queue screenshots.

Follow-up on 2026-10-03: `npm.cmd exec -- playwright test e2e/lab-03/user-administration.spec.ts --workers=1` passed **6/6, 0 failed** (20.3s); `npm.cmd exec -- playwright test e2e/lab-02/requester-ticket-flow.spec.ts --workers=1` passed **6/6, 0 failed** (16.2s). Each ran across all three profiles. The only test changes capture Set Password and wait for loaded Requester reference data before capture. The new Requester create triplet replaces a transient loading-state capture; list/detail copies come from the original passing 33-test run. No application source, account or seed changes were made.

An additional read-only Playwright keyboard inspection used Tab from the loaded Login page through Email, Password and Login on all three profiles. After allowing the 250ms CSS transition to settle, all nine focused states had visible rings: blue on inputs and green on Login. DOM focus and screenshots agreed. This is a nine-state visual check, not nine additional E2E tests.

## Exact screenshot inventory

Paths are relative to `artifacts/lab-03/screenshots/`.

| Area/state | Desktop | Tablet | Mobile |
|---|---|---|---|
| Login | `authentication/login-desktop.png` | `authentication/login-tablet.png` | `authentication/login-mobile.png` |
| Required password change and validation | `authentication/change-password-desktop.png` | `authentication/change-password-tablet.png` | `authentication/change-password-mobile.png` |
| Queue, unassigned ticket and filters | `staff-queue/staff-queue-desktop.png` | `staff-queue/staff-queue-tablet.png` | `staff-queue/staff-queue-mobile.png` |
| Detail after reassignment/updates, comments and notes | `staff-ticket-detail/staff-ticket-detail-desktop.png` | `staff-ticket-detail/staff-ticket-detail-tablet.png` | `staff-ticket-detail/staff-ticket-detail-mobile.png` |
| User list with Edit panel | `user-management/admin-edit-desktop.png` | `user-management/admin-edit-tablet.png` | `user-management/admin-edit-mobile.png` |
| User list with Create panel validation | `user-management/admin-validation-desktop.png` | `user-management/admin-validation-tablet.png` | `user-management/admin-validation-mobile.png` |
| Login Email keyboard focus | `authentication/keyboard-email-desktop.png` | `authentication/keyboard-email-tablet.png` | `authentication/keyboard-email-mobile.png` |
| Login Password keyboard focus | `authentication/keyboard-password-desktop.png` | `authentication/keyboard-password-tablet.png` | `authentication/keyboard-password-mobile.png` |
| Login button keyboard focus | `authentication/keyboard-login-desktop.png` | `authentication/keyboard-login-tablet.png` | `authentication/keyboard-login-mobile.png` |
| Set Initial Password panel | `user-management/admin-set-password-desktop.png` | `user-management/admin-set-password-tablet.png` | `user-management/admin-set-password-mobile.png` |
| Requester Create Ticket, loaded | `requester/requester-create-desktop.png` | `requester/requester-create-tablet.png` | `requester/requester-create-mobile.png` |
| Requester My Tickets | `requester/requester-list-desktop.png` | `requester/requester-list-tablet.png` | `requester/requester-list-mobile.png` |
| Requester detail, resolution/comments/attachments | `requester/requester-detail-desktop.png` | `requester/requester-detail-tablet.png` | `requester/requester-detail-mobile.png` |

Capture sources: `authentication.spec.ts` produces login and change-password images; `staff-ticket-flow.spec.ts` produces queue and detail images; `user-administration.spec.ts` produces edit/validation/Set Password images. Each source lives under `e2e/lab-03/`. Requester images come from `e2e/lab-02/requester-ticket-flow.spec.ts`, exercising current authenticated Lab 3 behavior. Keyboard images come from the read-only inspection described above. Generated E2E originals are under the corresponding device-suffixed `test-results` directories; submitted copies survive later Playwright runs. The final seven inventory rows are the 21 images added in this follow-up.

## Completed visual checklist

| PDF check | Result | Observed evidence / limit |
|---|---|---|
| Design consistency | PASS for captured states | Green headers/actions, pale borders and consistent form spacing. Change Password is simpler than Login but retains green action styling. |
| Role navigation | PASS for captured states | Staff shell shows Staff queue; Admin shell shows User Management; role/name and Logout remain visible. Authentication screens omit operational navigation. |
| Status/priority/role badges | PASS with observation | Queue MEDIUM/NEW pills are readable; Admin role/Active badges are readable. Desktop ADMINISTRATOR badge wraps its final letter onto a second line in the Create validation image; no overlap, but visually awkward. |
| Editable/read-only fields | PASS for captured states | Staff ticket information uses muted read-only fields, while assignment/priority/status use editable controls. Admin edit controls remain visually distinct. |
| Validation placement | PASS | Password mismatch sits below confirmation; Admin field errors are adjacent to affected inputs. No overlap observed on any device. |
| Focus | PASS for inspected controls | Tab traversal Email → Password → Login shows visible focus rings on all three profiles. The previous uncertainty was resolved by capturing settled keyboard focus. Change-password confirmation and Admin editor controls also show visible outlines. This does not certify every control in the application. |
| Clipping | PASS with observation | Long values exceed some native single-line input viewports; static screenshots show only part of the value. Complete values are retained and selectable. Ticket information fields are intentionally read-only; editable controls remain editable. Required labels/actions are visible, with no page overflow. This is normal input behavior, not a responsive failure. |
| Overlap | PASS for captured states | No overlapping labels, buttons, cards or validation text observed. Tablet/mobile content stacks with sufficient spacing. |
| Horizontal overflow | PASS for captured states | E2E document-width assertions pass; images show no content extending beyond page edges. Queue becomes labelled cards on smaller devices; Admin panels stack. |

## Final follow-up results and submission limits

| Requested item | Result | Evidence / remaining work |
|---|---|---|
| Login keyboard focus | PASS | Nine inspected keyboard states across desktop/tablet/mobile; no application fix needed. |
| Administrator Set Password evidence | PASS | Three dedicated panel images. Account, masked password, validation guidance, next-login change requirement and Save/Cancel are visible. Panel stacks on smaller screens. |
| Required current Requester evidence | PASS | Nine current Create/List/Detail images reviewed and preserved under `requester/`; no extra legacy screenshots copied. Loaded create forms, list actions, resolution indication, comments and attachment controls are represented. |
| Review all submitted screenshots | PASS with observation | All 39 reviewed. No page overflow or overlapping controls observed. Long values are partially visible within normal single-line input viewports; complete values remain available. Desktop Requester Priority/Status headers and an Admin role badge wrap awkwardly without hiding actions. No application styling was changed. |
| Final checklist documentation | PASS | Inventory, commands, results and limitations recorded here. |

The required screenshot collection is present, including all four PDF-mandated directories and current Requester views. **Gap #5: PASS with observation.** The PDF requires a clipping review, not simultaneous display of every long input value. The observed native input viewport behavior does not truncate data, hide required actions or cause page overflow.

Affected images (relative to `artifacts/lab-03/screenshots/`): `staff-ticket-detail/staff-ticket-detail-desktop.png` (Ticket Number); `staff-ticket-detail/staff-ticket-detail-tablet.png` and `staff-ticket-detail/staff-ticket-detail-mobile.png` (Ticket Number, Requester Email, Category, Related System); `requester/requester-detail-tablet.png` (Requester Email); `requester/requester-detail-mobile.png` (Requester Email and the editable Removal Reason placeholder).

Latest complete pre-merge verification: 125 frontend, 163 backend and 33 E2E tests passed (321 total, 0 failed, 0 skipped); both builds passed. See [test results](tests.md). These results apply to the pre-merge `lab3-staging` working tree, not final `main`. Part 3 final-main test output remains pending. Final PDF screenshot readability is a submission-document check when the PDF is created, not an application UI defect.
- Long full-page Staff detail images must not be squeezed onto one PDF page. Include readable sections across pages, preserve links to originals, and check the final PDF rendering. Final PDF readability and rendered ui-spec evidence have not been verified here.
- This checklist is a completed review with recorded limitations, not a claim of comprehensive accessibility or contrast certification.
