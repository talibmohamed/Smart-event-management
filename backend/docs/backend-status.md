# Backend Status

Last updated: 2026-04-19

## Current State

- Runtime data access is Prisma-only
- Runtime Prisma connection is normalized for the Supabase pooler
- Authentication is implemented with JWT
- Core auth, event, and booking flows are available
- Paid bookings use Stripe Checkout and webhook confirmation
- Transactional emails use styled HTML templates through Resend with plain text fallback and best-effort delivery
- `backend/docs` is the current frontend source of truth
- Local development seeding is available through Prisma
- Critical backend tests are available with Vitest
- Event locations use structured address, city, latitude, and longitude fields
- Optional event cover images use Supabase Storage
- Events support multi-tier ticketing with booking line items
- Confirmed bookings generate QR-code-ready ticket records
- Persistent realtime notifications are available through REST plus Socket.IO
- Supabase Storage requires a public `event-images` bucket and service role credentials in backend env

## Implemented Features

### Core API

- `GET /` API health check
- `GET /api/test/db` database connectivity check
- Express JSON parsing and CORS enabled
- `GET /api/cities` public French city search endpoint

### Development Tooling

- `npm run db:seed` seeds sample users, events, bookings, and feedback
- `npm run db:payment-schema` applies the booking payment columns/check constraints to Supabase
- `npm run storage:setup` creates or updates the public Supabase `event-images` bucket
- `npm run db:ticket-tier-schema` applies ticket tier and booking item tables, then backfills existing data
- `npm run db:ticket-schema` applies the ticket table and backfills confirmed booking tickets
- `npm run db:notification-schema` applies the notifications table and indexes
- `npm run test` runs critical backend tests with mocked external services
- `npm run test:watch` runs the same tests in watch mode
- `npm run test:coverage` runs critical backend tests with a V8 coverage report
- Seeded events cover multiple French cities for list/map UI development
- Seeded sample login password: `Password123!`
- Event image upload requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_EVENT_IMAGES_BUCKET`
- Stripe Checkout requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY`, and `FRONTEND_URL`
- Transactional emails require `RESEND_API_KEY`, `EMAIL_FROM`, and optional `EMAIL_REPLY_TO`
- `npm run email:preview -- --to email@example.com` sends all styled email templates to one recipient for visual inspection
- `npm run email:preview -- --to email@example.com --template bookingConfirmedEmail` sends only the booking confirmation preview with ticket PDF attachment
- Forgot password requires the password reset database fields from `npm run db:password-reset-schema`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- JWT protection middleware
- Critical auth middleware and password reset tests

### Roles And Access

- Supported roles: `attendee`, `organizer`, `admin`
- Organizer and admin protection for event write endpoints
- Owner-or-admin checks for event update and delete
- Owner-or-admin checks for booking cancellation

### Events

- Public event list
- Public event detail
- Organizer/admin event creation
- Organizer/admin event update
- Organizer/admin event deletion
- Organizer/admin attendee list with booking status filtering
- Backend-driven event update/delete notifications for affected attendees and admins
- Backend-approved French city validation on event create and update
- Backend-only Nominatim geocoding on event create and update
- Stored event coordinates for split list/map UI support
- Optional event cover image upload, replace, remove, and delete cleanup
- Custom ticket tiers with tier price, capacity, active state, and sort order
- Event responses include tier availability, `min_price`, and `max_price`
- Public event responses expose `image_url` and hide internal `image_path`

### Bookings

- Authenticated booking creation
- Booking items support multiple ticket tiers and quantities in one booking
- Max 5 tickets per booking
- Free event bookings confirm immediately
- Paid event bookings start as `pending_payment` and confirm only from Stripe webhook
- One active booking per user per event
- Cancelled booking reactivation
- Capacity check before booking
- Authenticated booking list
- Authenticated booking detail for payment status polling
- Confirmed booking ticket retrieval through `GET /api/bookings/:id/tickets`
- Organizer/admin ticket validation and check-in through `/api/tickets/:ticket_code`
- Payment retry endpoint creates a fresh Stripe Checkout Session for pending bookings
- Booking cancellation
- Stripe webhook handles completed and expired Checkout Sessions
- Webhook processing validates metadata, amount, currency, capacity, and duplicate Stripe events
- Stripe Checkout line items are generated from backend-calculated booking item prices
- Resend emails are sent for booking confirmations, paid confirmations, payment failures/expirations, booking cancellations, event updates, and event deletions
- Resend emails use a shared styled HTML layout with status badges, detail cards, CTA buttons, and text fallback
- Backend creates persisted notifications for booking confirmations, payment failures/expirations, booking cancellations, event updates/deletions, and ticket check-ins
- Notification delivery uses Socket.IO for live updates and REST for initial load/refresh recovery
- Notification creation is centralized and deduped for webhook/retry-prone events
- Booking confirmation emails include ticket page links and may include inline ticket QR codes
- Booking confirmation emails include a branded generated ticket PDF attachment when PDF generation succeeds
- Password reset emails are sent through Resend and expire after 60 minutes
- Critical booking and Stripe webhook tests use mocked model/payment/email boundaries

## Pending Features

- Feedback endpoints and business logic
- Admin-specific supervision endpoints beyond current role checks
- Event filtering, search, and pagination
- Attendee export/download support
- Advanced ticket rules such as deadline-based Early Bird tiers
- Persisted PDF files in storage; PDFs are generated on demand
- Refund handling and advanced payment operations
- Fully consistent success response shape across all endpoints

## Known Behavior Notes

- `GET /api/auth/me` returns `{ success, data }` without a `message` field on success
- Event create and update currently require all event fields in the request body
- Event location is split into `address` and `city`
- Event `city` must match a backend-approved French city from `GET /api/cities`
- Event `latitude` and `longitude` are generated by the backend and must not be sent by frontend forms
- Event `image_url` is optional and generated by backend Supabase Storage upload
- Event `image_path` is internal metadata and is never exposed in API responses
- Event create/update support JSON payloads and multipart payloads with optional `cover_image`
- Event create/update returns `400` with `Address could not be located` when Nominatim cannot resolve the address
- Invalid event images return `400` with `Event image must be a JPEG, PNG, or WebP file under 5MB`
- Event `price` is serialized as a string in JSON responses
- Event `price` now means minimum active ticket tier price for compatibility
- Ticket tier capacities must sum exactly to event capacity
- Confirmed booking item quantities count toward event and tier availability
- Pending paid bookings do not reserve event or tier seats
- Organizers/admins cannot delete sold tiers or reduce tier capacity below confirmed sold quantity; omitted unsold tiers are disabled
- `POST /api/auth/register` only honors `attendee` and `organizer`; any other role becomes `attendee`
- Only attendees can create bookings and view their own booking list
- Pending paid bookings do not reserve seats; only confirmed booking items count against capacity
- Tickets are generated only for confirmed bookings
- Ticket QR values use public `ticket_code` values, not sensitive attendee or payment data
- Cancelled bookings mark related valid tickets as `cancelled`
- Already used tickets return `409` on check-in and are not updated again
- Stripe success redirect is not payment confirmation; only the webhook confirms paid bookings
- Ticket PDFs render the frontend SVG logo as vector and strip embedded raster nodes to avoid black background artifacts
- Email delivery is best-effort and does not change API success/failure results
- Realtime notification delivery is best-effort; persisted notifications remain the source of truth
- Notifications are ordered by `created_at DESC`
- Duplicate webhook events do not create duplicate notifications
- Frontend must not subscribe directly to Supabase tables for notifications
- Forgot password responses do not reveal whether an email exists
- Duplicate pending paid bookings return `409`
- Pending paid bookings can be retried through `POST /api/bookings/:id/retry-payment`
- `POST /api/bookings` returns `201` even when reactivating a cancelled booking
- Supabase pooler connections automatically add `pgbouncer=true` and `connection_limit=1` at runtime to avoid prepared statement collisions
- Tests do not contact Supabase, Stripe, Resend, Nominatim, or Supabase Storage

## Frontend Ready Areas

- Login, register, and session restore
- French city autocomplete/select through `GET /api/cities`
- Public events list and event detail
- Organizer event create, update, and delete
- Organizer/admin event attendee list
- Notification bell using `GET /api/notifications` plus Socket.IO `notification:new`
- Attendee ticket display/download pages
- Organizer/admin ticket scanner/check-in pages
- Organizer/admin event cover image upload and removal
- Attendee booking create, cancel, payment retry, payment redirect, status polling, and my-bookings view
- Event tier editor and tier-aware booking UI can be integrated from the documented API contract
