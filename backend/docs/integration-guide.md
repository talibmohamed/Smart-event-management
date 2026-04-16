# Frontend Integration Guide

Last updated: 2026-04-16

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
- Local password reset schema command: `npm run db:password-reset-schema`
- Local ticket tier schema command: `npm run db:ticket-tier-schema`
- Local ticket schema command: `npm run db:ticket-schema` applies ticket tables and backfills confirmed booking tickets
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
- Required backend env variables for Resend emails:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `EMAIL_REPLY_TO` optional
  - `EMAIL_ENABLED=true`
- Styled email preview command:
  - `npm run email:preview -- --to email@example.com`
  - `npm run email:preview -- --to email@example.com --template bookingConfirmedEmail` sends only the booking confirmation preview with ticket PDF
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
| Forgot password page | `POST /api/auth/forgot-password` | Public, sends reset email if account exists |
| Reset password page | `POST /api/auth/reset-password` | Public, uses token from email link |
| Session restore | `GET /api/auth/me` | Requires JWT |
| City autocomplete/select | `GET /api/cities?search=paris` | Public, returns max 20 backend-approved French cities |
| Events list page | `GET /api/events` | Public |
| Event detail page | `GET /api/events/:id` | Public |
| Organizer event attendees page | `GET /api/events/:id/attendees?status=confirmed` | Requires organizer/admin; organizer owns event unless admin |
| Organizer create event page | `POST /api/events` | Requires `organizer` or `admin` |
| Organizer edit event page | `PUT /api/events/:id` | Requires `organizer` or `admin`; supports safe ticket tier edits |
| Organizer delete event action | `DELETE /api/events/:id` | Requires `organizer` or `admin` and ownership unless admin |
| My bookings page | `GET /api/bookings/my-bookings` | Requires attendee JWT |
| Booking detail/status polling | `GET /api/bookings/:id` | Requires JWT, owner attendee or admin |
| View booking tickets | `GET /api/bookings/:id/tickets` | Requires confirmed booking, owner attendee or admin |
| Download booking tickets PDF | `GET /api/bookings/:id/tickets/pdf` | Requires confirmed booking, owner attendee or admin; returns PDF |
| Book event action | `POST /api/bookings` | Requires attendee JWT, body only needs `event_id` |
| Retry paid checkout | `POST /api/bookings/:id/retry-payment` | Requires attendee JWT and pending payment booking |
| Cancel booking action | `PUT /api/bookings/:id/cancel` | Requires JWT, owner or admin |
| Organizer ticket validation | `GET /api/tickets/:ticket_code` | Requires organizer/admin; organizer owns event unless admin |
| Organizer ticket check-in | `POST /api/tickets/:ticket_code/check-in` | Requires organizer/admin; organizer owns event unless admin |
| Stripe webhook | `POST /api/payments/stripe/webhook` | Stripe only, raw body required |
| Dev DB check | `GET /api/test/db` | Dev tooling, not a user page |

## Request Notes

### Register

- Required fields: `first_name`, `last_name`, `email`, `password`
- Optional field: `role`
- If `role` is not `attendee` or `organizer`, backend stores `attendee`

### Forgot Password

- Request password reset email:

```http
POST /api/auth/forgot-password
```

```json
{
  "email": "john@example.com"
}
```

- Success response is the same whether the account exists or not:

```json
{
  "success": true,
  "message": "If an account exists for this email, a password reset link has been sent"
}
```

- Backend sends a Resend email with this link shape:

```text
FRONTEND_URL/reset-password?token=<token>
```

- The reset token expires after 60 minutes.
- Frontend should read `token` from the reset password page URL.

### Reset Password

```http
POST /api/auth/reset-password
```

```json
{
  "token": "token-from-url",
  "password": "newPassword123"
}
```

- Success:

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

- Common frontend-handled errors:
  - `Token and password are required`
  - `Password must be at least 6 characters`
  - `Invalid or expired password reset token`

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
  - `ticket_tiers` optional for old compatibility, recommended for new frontend
- `organizer_id` is taken from the JWT and must not be sent by the frontend
- `city` must be selected from `GET /api/cities`; invalid cities return `400`
- Do not send `latitude` or `longitude`; backend geocodes the address and city
- Optional image upload uses multipart file field `cover_image`
- Optional image removal on update uses `remove_image=true`
- `ticket_tiers` can be sent as an array in JSON requests or as a JSON string in multipart requests
- Each ticket tier needs `name`, `price >= 0`, and `capacity > 0`
- Event must have 1-10 ticket tiers when `ticket_tiers` is provided
- Sum of tier capacities must equal event `capacity`
- If `ticket_tiers` is omitted on create, backend creates one `Standard` tier from `price` and `capacity`
- If `ticket_tiers` is omitted on update, backend preserves existing tiers
- Sold tiers cannot be deleted, and tier capacity cannot be reduced below confirmed sold quantity
- Unsold tiers omitted from an update payload are disabled instead of hard-deleted
- `price` in event responses is the minimum active tier price for old frontend compatibility
- `capacity` must be greater than `0`
- `price` must be greater than or equal to `0`

Example `ticket_tiers`:

```json
[
  {
    "name": "Early Bird",
    "description": "Limited early access",
    "price": 10,
    "capacity": 20,
    "is_active": true,
    "sort_order": 0
  },
  {
    "name": "Standard",
    "description": "General admission",
    "price": 25,
    "capacity": 60,
    "is_active": true,
    "sort_order": 1
  },
  {
    "name": "VIP",
    "description": "Premium access",
    "price": 50,
    "capacity": 20,
    "is_active": true,
    "sort_order": 2
  }
]
```

### Organizer Event Attendees

- Endpoint:

```http
GET /api/events/:id/attendees?status=confirmed
```

- Auth: organizer/admin JWT required
- Organizers can view only their own event attendees
- Admins can view any event attendees
- Status filter values:
  - `confirmed`
  - `pending_payment`
  - `cancelled`
  - `all`
- Default status is `confirmed`
- Use `status=all` for support/refund preparation views, not normal check-in lists
- Response contains event metadata and an `attendees` array
- Each attendee contains attendee identity, booking status, payment status, ticket items, `total_quantity`, and `total_price`

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
  "event_id": "uuid",
  "items": [
    {
      "ticket_tier_id": "uuid",
      "quantity": 2
    }
  ]
}
```

- If the user already has a confirmed booking, backend returns `409`
- If the user already has a pending paid booking, backend returns `409`
- If the user has a cancelled booking for the same event, backend reactivates it and still returns `201`
- If the event is full, backend returns `400`
- `items` is optional only for old compatibility; new frontend should always send selected tiers and quantities
- Max total quantity per booking is 5 tickets
- Backend validates each selected tier belongs to the event and is active
- Backend validates tier remaining quantity and event remaining seats
- Backend calculates `unit_price`, `total_price`, and booking total from stored ticket tier prices
- Booking total `0` returns a `confirmed` booking and `payment_required: false`
- Booking total greater than `0` returns a `pending_payment` booking, `payment_required: true`, and Stripe `checkout_url`
- Confirmed bookings generate one ticket per purchased quantity
- Pending payment bookings do not generate tickets
- Frontend must redirect to `checkout_url` for paid bookings
- Stripe success pages are UX only; use `GET /api/bookings/:id` to poll final booking status
- Pending paid bookings do not reserve seats
- To continue payment for an existing `pending_payment` booking, call `POST /api/bookings/:id/retry-payment` and redirect to the returned `checkout_url`
- My bookings and booking detail responses include `items`, `total_quantity`, and `total_price`

### Booking Tickets

- Tickets are available only for confirmed bookings
- Endpoint:

```http
GET /api/bookings/:id/tickets
```

- Auth: booking owner attendee or admin
- If the booking is not confirmed, backend returns:

```json
{
  "success": false,
  "message": "Tickets are available only for confirmed bookings"
}
```

- Frontend should:
  - Show “View tickets” only when booking `status` is `confirmed`
  - Render one ticket card per returned ticket
  - Generate QR images from `qr_value`
  - Treat `qr_value` as the same value as backend `ticket_code`
  - Hide ticket actions for `pending_payment`, `cancelled`, `failed`, or `expired` bookings
  - Use `GET /api/bookings/:id/tickets/pdf` for the Download PDF button
  - Treat the PDF response as a binary blob, not JSON

### Organizer Ticket Validation And Check-In

- Scanner/manual validation should first call:

```http
GET /api/tickets/:ticket_code
```

- This validates that the ticket exists and that the organizer owns the event
- It does not change ticket state
- After the organizer confirms entry, call:

```http
POST /api/tickets/:ticket_code/check-in
```

- Successful check-in changes ticket `status` from `valid` to `used` and returns `checked_in_at`
- Cancelled tickets return `400`
- Already used tickets return `409` and are not updated again
- Do not auto-check-in immediately on scan; show the scanned ticket first

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
- Stripe amount validation uses the sum of backend-created booking item totals
- Stripe line items are generated from backend ticket tier prices, not frontend prices

### Transactional Emails

- Backend sends best-effort emails with Resend
- Email failures are logged but do not fail API requests or webhooks
- Emails use styled HTML with status badges, detail cards, CTA buttons, and plain text fallback
- Emails are sent for free booking confirmation, paid booking confirmation, payment failure, payment expiration, booking cancellation, event updates, and event deletion
- Forgot password emails are also sent through Resend
- Booking confirmation emails include a ticket page link
- Confirmation emails may include inline QR images for each generated ticket
- Confirmation emails include a ticket PDF attachment when PDF generation succeeds
- Ticket PDFs render the frontend SVG logo as vector and strip embedded raster nodes to avoid black background artifacts
- Inline email QR codes are convenience only; backend ticket validation remains the source of truth
- If inline QR generation fails, the email still sends with the ticket link
- No email is sent for duplicate booking errors, failed validation requests, pending payment retry creation, or frontend Stripe success redirects
- Set `EMAIL_ENABLED=false` to disable email sending locally
- Use `npm run email:preview -- --to email@example.com` to send all templates to one inbox for visual inspection; this does not test booking/payment/event business functionality
- Use `npm run email:preview -- --to email@example.com --template bookingConfirmedEmail` to send only the ticket email preview with the PDF attachment

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
- Event responses include `ticket_tiers`, `min_price`, and `max_price`
- `confirmed_bookings` now counts confirmed ticket quantities, not booking rows
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
- Booking responses also include:
  - `items`
  - `total_quantity`
  - `total_price`
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
