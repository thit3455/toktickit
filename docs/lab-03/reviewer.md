# Lab 3 Reviewer Record

## Reviewer Identity

- GitHub username: `Chanya-Grace-2546`

---

## Pull Request Reviews

### [PR #41](https://github.com/thit3455/toktickit/pull/41) — Lab 3 Engineering Contract

**Reviewer comment:**
> I think it is enough. Approve.

**Author response:**
> Thank you.

**Status:** Approved

---

### [PR #42](https://github.com/thit3455/toktickit/pull/42) — Complete Lab 3 Database Migration Foundation

**Reviewer comment:**
> I checked the migration SQL and noticed that it creates a new User table while the existing RequesterUser table is preserved separately. I don't see existing requester data/IDs being migrated to User or the Ticket requester foreign key being changed to reference User. Since Lab 3 authentication should replace the temporary requester identity, should the migration preserve the existing requester records by migrating them into User and update the Ticket relationship accordingly?

**Author response:**
> Thank you for the review. You were right that the initial migration only created the User foundation but did not complete the requester migration.
>
> I updated the migration to:
> - migrate Ticket ownership from RequesterUser to User
> - preserve existing Ticket records
> - remove the old RequesterUser dependency

**Reviewer follow-up:**
> Checked the updated migration. The existing RequesterUser records are now migrated to User, the old-to-new ID mapping is used to update existing Ticket ownership and the Ticket foreign key is updated before RequesterUser is removed. This addresses my original concern. Thanks for fixing it!

**Author response:**
> Thanks for reviewing! I updated the migration based on your feedback. The RequesterUser to User migration now preserves Ticket ownership through ID mapping, and the FK update is handled before removing RequesterUser.

**Status:** Review feedback addressed and approved

---

### [PR #43](https://github.com/thit3455/toktickit/pull/43) — Complete Lab 3 Authentication Flow

**Reviewer comment:**
> Reviewed the authentication flow and the implemented changes. Login, logout, session handling, current-user verification, password hashing and first-login password change are covered and the reported authentication tests are passing. The changes look good to me. Approved.

**Status:** Approved

---

### [PR #45](https://github.com/thit3455/toktickit/pull/45) — Complete Issue 4 Authorization System

**Reviewer comment:**
> Looks fine. Approve.

**Status:** Approved

---

### [PR #46](https://github.com/thit3455/toktickit/pull/46) — Completed Requester Regression

**Reviewer comment:**
> Seems fine. Approve!

**Status:** Approved

---

### [PR #47](https://github.com/thit3455/toktickit/pull/47) — Complete IT Staff Queue and Ticket Ownership Workflow

**Reviewer comment:**
> Your verification and UI meet the criteria. So go ahead!

**Author response:**
> Thank you.

**Status:** Approved

---

### [PR #48](https://github.com/thit3455/toktickit/pull/48) — Complete Lab 3 Requester Regression and Resolution Workflow

**Reviewer comment:**
> Your requester page seems fine. Approve.

**Status:** Approved

---

### [PR #49](https://github.com/thit3455/toktickit/pull/49) — Complete Lab 3 Administrator User Management

**Reviewer comment:**
> Your administrator seems fine and fits all the criteria. Approve!

**Author response:**
> Thank you.

**Status:** Approved

---

## Pull Request Evidence

| PR | Scope | Merge Commit | Review Status |
|---|---|---|---|
| [#41](https://github.com/thit3455/toktickit/pull/41) | Lab 3 Engineering Contract | `e062021` | Approved |
| [#42](https://github.com/thit3455/toktickit/pull/42) | Database Migration Foundation | `04bae53` | Feedback addressed and approved |
| [#43](https://github.com/thit3455/toktickit/pull/43) | Authentication Flow | `ad38955` | Approved |
| [#45](https://github.com/thit3455/toktickit/pull/45) | Authorization System | `50b392c` | Approved |
| [#46](https://github.com/thit3455/toktickit/pull/46) | Requester Regression | `d2bac92` | Approved |
| [#47](https://github.com/thit3455/toktickit/pull/47) | IT Staff Queue and Ticket Ownership | `9eab2ac` | Approved |
| [#48](https://github.com/thit3455/toktickit/pull/48) | Requester Resolution Workflow | `abea3ea` | Approved |
| [#49](https://github.com/thit3455/toktickit/pull/49) | Administrator User Management | `17c3f82` | Approved |

---

## Review Summary

The Lab 3 pull requests listed above were reviewed by GitHub user `Chanya-Grace-2546`.

The most significant review feedback occurred during [PR #42](https://github.com/thit3455/toktickit/pull/42). The reviewer identified that the initial database migration did not fully migrate existing `RequesterUser` records into the new `User` model or preserve the Ticket ownership relationship.

The migration was revised to migrate the requester records, preserve existing Ticket ownership through ID mapping, update the Ticket foreign key, and remove the old `RequesterUser` dependency only after the migration was complete.

The reviewer checked the updated implementation and confirmed that the original concern had been addressed.

The remaining listed Lab 3 pull requests were approved after review of their respective implementation and verification evidence.

These records apply only to the historical pull requests listed above. They do not establish reviewer approval or merge of the later final-compliance changes.

The latest automated pre-merge verification passed **321 tests**:

- Frontend: **125 passed, 0 failed, 0 skipped**
- Backend: **163 passed, 0 failed, 0 skipped**
- E2E: **33 passed, 0 failed, 0 skipped**
- Frontend build: **PASS**
- Backend build: **PASS**

See [tests](tests.md) for the detailed verification record.

Final-compliance review evidence and the required Part 3 final test output from `main` will be recorded only after those steps actually occur.
