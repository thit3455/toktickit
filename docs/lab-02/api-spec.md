# Lab 2 REST API Specification

## 1. General Rules

- Base path: `/api`
- JSON is used for normal request and response bodies.
- Attachment upload uses `multipart/form-data`.
- Requester ownership must be checked by the backend.
- Errors must be safe and must not expose stack traces, database details, or storage paths.
- The Development Requester identity is temporary Lab 2 testing context only.

---

## 2. Development Requesters

### GET `/api/requesters`

Returns active Development Requesters only.

#### Success — 200

```json
{
  "data": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer@example.com"
    }
  ]
}