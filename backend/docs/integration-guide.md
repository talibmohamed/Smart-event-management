# Frontend Integration Guide

Last updated: 2026-04-11

## Base Setup

- Local backend URL: `http://localhost:5000`
- Send `Content-Type: application/json`
- For event image upload or replacement, send `multipart/form-data`
- Protected routes require:

```http
Authorization: Bearer <jwt>
```

- Local seed command: `npm run db:seed`
- Local booking payment schema command: `npm run db:payment-schema`
- Local storage setup command: `npm run storage:setup`
- Backend runtime normalizes Supabase pooler connections for Prisma
- Backend uploads event cover images to the public Supabase Storage bucket `event-images`
- Paid event bookings use Stripe Checkout; frontend redirects to `data.payment.checkout_url`
- Required backend env variables for images:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_EVENT_IMAGES_BUCKET=event-images`
- Required backend env variables for Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_CURRENCY=eur`
  - `FRONTEND_URL`
- Seeded sample password for all seed users: `Password123!`
- Seeded sample emails:
  - `admin@smartevent.test`
  - `organizer1@smartevent.test`
  - `organizer2@smartevent.test`
  - `attendee1@smartevent.test`
  - `attendee2@smartevent.test`
  - `attendee3@smartevent.test`
- Seeded event cities include:
  - `Paris`
  - `Issy-les-Moulineaux`
  - `Lyon`
  - `Marseille`
  - `Bordeaux`
  - `Lille`
  - `Nantes`
  - `Toulouse`

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
| City autocomplete/select | `GET /api/cities?search=paris` | Public, returns max 20 backend-approved French cities |
| Events list page | `GET /api/events` | Public |
| Event detail page | `GET /api/events/:id` | Public |
| Organizer create event page | `POST /api/events` | Requires `organizer` or `admin` |
| Organizer edit event page | `PUT /api/events/:id` | Requires `organizer` or `admin` and ownership unless admin |
| Organizer delete event action | `DELETE /api/events/:id` | Requires `organizer` or `admin` and ownership unless admin |
| My bookings page | `GET /api/bookings/my-bookings` | Requires attendee JWT |
| Booking detail/status polling | `GET /api/bookings/:id` | Requires JWT, owner attendee or admin |
| Book event action | `POST /api/bookings` | Requires attendee JWT, body only needs `event_id` |
| Retry paid checkout | `POST /api/bookings/:id/retry-payment` | Requires attendee JWT and pending payment booking |
| Cancel booking action | `PUT /api/bookings/:id/cancel` | Requires JWT, owner or admin |
| Stripe webhook | `POST /api/payments/stripe/webhook` | Stripe only, raw body required |
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
  - `address`
  - `city`
  - `event_date`
  - `capacity`
  - `price`
- `organizer_id` is taken from the JWT and must not be sent by the frontend
- `city` must be selected from `GET /api/cities`; invalid cities return `400`
- Do not send `latitude` or `longitude`; backend geocodes the address and city
- Optional image upload uses multipart file field `cover_image`
- Optional image removal on update uses `remove_image=true`
- `capacity` must be greater than `0`
- `price` must be greater than or equal to `0`

### Event Cover Images

- Use JSON for create/update when there is no image change
- Use `FormData` when creating with an image, replacing an image, or removing an image
- Append all normal event fields to `FormData`
- Append `cover_image` only when a new file is selected
- Append `remove_image=true` only when removing the existing image
- Allowed image types: JPEG, PNG, WebP
- Max file size: 5MB
- Frontend must not upload directly to Supabase
- Frontend reads and displays only `image_url`
- `image_path` is internal and is not returned by the API

### Search Cities

- Public endpoint:

```http
GET /api/cities?search=paris
```

- `search` is optional and matches city name or postal code
- The backend returns a maximum of 20 results
- The frontend should display `name`, optionally with `postal_code` and `department`
- Event create/update payloads should send only the selected city `name` as `city`

```json
{
  "success": true,
  "message": "Cities retrieved successfully",
  "data": [
    {
      "name": "Paris",
      "postal_code": "75000",
      "department": "Paris"
    }
  ]
}
```

### Create Booking

- Request body:

```json
{
  "event_id": "uuid"
}
```

- If the user already has a confirmed booking, backend returns `409`
- If the user already has a pending paid booking, backend returns `409`
- If the user has a cancelled booking for the same event, backend reactivates it and still returns `201`
- If the event is full, backend returns `400`
- Free events return a `confirmed` booking and `payment_required: false`
- Paid events return a `pending_payment` booking, `payment_required: true`, and Stripe `checkout_url`
- Frontend must redirect to `checkout_url` for paid bookings
- Stripe success pages are UX only; use `GET /api/bookings/:id` to poll final booking status
- Pending paid bookings do not reserve seats
- To continue payment for an existing `pending_payment` booking, call `POST /api/bookings/:id/retry-payment` and redirect to the returned `checkout_url`

### Stripe Webhook

- Local development command example:

```bash
stripe listen --forward-to localhost:5000/api/payments/stripe/webhook
```

- Configure the returned webhook secret as `STRIPE_WEBHOOK_SECRET`
- Backend verifies the raw request body and `Stripe-Signature`
- `checkout.session.completed` confirms valid paid bookings
- `checkout.session.expired` marks pending paid bookings as cancelled/expired
- Amount, currency, metadata, and capacity are validated before confirmation

## Response Notes

### Auth

- Register and login return `token` plus a minimal user object
- `GET /api/auth/me` returns profile data with `created_at`

### Events

- `GET /api/events` and `GET /api/events/:id` include organizer display fields:
  - `first_name`
  - `last_name`
  - `organizer_email`
- Event responses now expose `address` and `city` instead of a single `location` field
- Event create/update validates `city` against the same backend city list used by `GET /api/cities`
- Event responses include `latitude` and `longitude` for map rendering
- Event responses include optional `image_url` for cover images
- Event responses include `confirmed_bookings`, `remaining_seats`, and `is_full`
- Event create/update geocodes `address + city + France` on the backend with Nominatim
- Frontend must never call Nominatim or ask users to enter coordinates manually
- `POST`, `PUT`, and `DELETE` on events return the event record without organizer display fields
- `price` is returned as a string, for example `"10.00"`

### Bookings

- `POST /api/bookings` and `PUT /api/bookings/:id/cancel` return booking-only objects
- `GET /api/bookings/my-bookings` returns booking fields plus event summary fields:
  - `title`
  - `description`
  - `category`
  - `address`
  - `city`
  - `latitude`
  - `longitude`
  - `image_url`
  - `event_date`
  - `capacity`
  - `price`
  - `organizer_id`
- Booking statuses: `pending_payment`, `confirmed`, `cancelled`
- Payment statuses: `unpaid`, `paid`, `failed`, `cancelled`, `expired`

## Error Handling

- Use the backend `message` field directly in UI feedback
- Common statuses:
  - `400` validation or business rule error
  - `401` auth error
  - `403` role or ownership error
  - `404` not found
  - `409` duplicate booking
  - `500` unexpected server error
- Duplicate pending payment:
  - `409 { "success": false, "message": "You already have a pending payment for this event" }`
- Invalid event city:
  - `400 { "success": false, "message": "City must be a supported French city" }`
- Unlocatable event address:
  - `400 { "success": false, "message": "Address could not be located" }`
- Invalid event image:
  - `400 { "success": false, "message": "Event image must be a JPEG, PNG, or WebP file under 5MB" }`

## Not Available Yet

- Feedback pages and feedback submission
- Dedicated admin supervision endpoints
- Event search, filtering, and pagination
