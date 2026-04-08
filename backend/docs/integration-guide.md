# Frontend Integration Guide

Last updated: 2026-04-08

## Base Setup

- Local backend URL: `http://localhost:5000`
- Send `Content-Type: application/json`
- Protected routes require:

```http
Authorization: Bearer <jwt>
```

## JWT Handling

- `POST /api/auth/register` and `POST /api/auth/login` both return:
  - `data.token`
  - `data.user`
- Store the token in frontend auth state and persistent storage
- On app startup, if a token exists, call `GET /api/auth/me`
- On `401`, clear the token and redirect to login
- On `403`, keep the session and show a permission error

## Page To Endpoint Mapping

| Frontend page or action | Endpoint | Notes |
| --- | --- | --- |
| App health check | `GET /` | Optional dev check |
| Register page | `POST /api/auth/register` | `role` can be `attendee` or `organizer` |
| Login page | `POST /api/auth/login` | Returns JWT and user |
| Session restore | `GET /api/auth/me` | Requires JWT |
| Events list page | `GET /api/events` | Public |
| Event detail page | `GET /api/events/:id` | Public |
| Organizer create event page | `POST /api/events` | Requires `organizer` or `admin` |
| Organizer edit event page | `PUT /api/events/:id` | Requires `organizer` or `admin` and ownership unless admin |
| Organizer delete event action | `DELETE /api/events/:id` | Requires `organizer` or `admin` and ownership unless admin |
| My bookings page | `GET /api/bookings/my-bookings` | Requires JWT |
| Book event action | `POST /api/bookings` | Requires JWT, body only needs `event_id` |
| Cancel booking action | `PUT /api/bookings/:id/cancel` | Requires JWT, owner or admin |
| Dev DB check | `GET /api/test/db` | Dev tooling, not a user page |

## Request Notes

### Register

- Required fields: `first_name`, `last_name`, `email`, `password`
- Optional field: `role`
- If `role` is not `attendee` or `organizer`, backend stores `attendee`

### Create Or Update Event

- Current backend requires all fields:
  - `title`
  - `description`
  - `category`
  - `location`
  - `event_date`
  - `capacity`
  - `price`
- `organizer_id` is taken from the JWT and must not be sent by the frontend
- `capacity` must be greater than `0`
- `price` must be greater than or equal to `0`

### Create Booking

- Request body:

```json
{
  "event_id": "uuid"
}
```

- If the user already has a confirmed booking, backend returns `409`
- If the user has a cancelled booking for the same event, backend reactivates it and still returns `201`
- If the event is full, backend returns `400`

## Response Notes

### Auth

- Register and login return `token` plus a minimal user object
- `GET /api/auth/me` returns profile data with `created_at`

### Events

- `GET /api/events` and `GET /api/events/:id` include organizer display fields:
  - `first_name`
  - `last_name`
  - `organizer_email`
- `POST`, `PUT`, and `DELETE` on events return the event record without organizer display fields
- `price` is returned as a string, for example `"10.00"`

### Bookings

- `POST /api/bookings` and `PUT /api/bookings/:id/cancel` return booking-only objects
- `GET /api/bookings/my-bookings` returns booking fields plus event summary fields:
  - `title`
  - `description`
  - `category`
  - `location`
  - `event_date`
  - `capacity`
  - `price`
  - `organizer_id`

## Error Handling

- Use the backend `message` field directly in UI feedback
- Common statuses:
  - `400` validation or business rule error
  - `401` auth error
  - `403` role or ownership error
  - `404` not found
  - `409` duplicate booking
  - `500` unexpected server error

## Not Available Yet

- Feedback pages and feedback submission
- Dedicated admin supervision endpoints
- Event search, filtering, and pagination
