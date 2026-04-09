# Backend Status

Last updated: 2026-04-09

## Current State

- Runtime data access is Prisma-only
- Authentication is implemented with JWT
- Core auth, event, and booking flows are available
- `backend/docs` is the current frontend source of truth
- Local development seeding is available through Prisma

## Implemented Features

### Core API

- `GET /` API health check
- `GET /api/test/db` database connectivity check
- Express JSON parsing and CORS enabled

### Development Tooling

- `npm run db:seed` seeds sample users, events, bookings, and feedback
- Seeded sample login password: `Password123!`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- JWT protection middleware

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

### Bookings

- Authenticated booking creation
- One confirmed booking per user per event
- Cancelled booking reactivation
- Capacity check before booking
- Authenticated booking list
- Booking cancellation

## Pending Features

- Feedback endpoints and business logic
- Admin-specific supervision endpoints beyond current role checks
- Event filtering, search, and pagination
- Booking management endpoints beyond `my-bookings`
- Fully consistent success response shape across all endpoints

## Known Behavior Notes

- `GET /api/auth/me` returns `{ success, data }` without a `message` field on success
- Event create and update currently require all event fields in the request body
- Event location is split into `address` and `city`
- Event `price` is serialized as a string in JSON responses
- `POST /api/auth/register` only honors `attendee` and `organizer`; any other role becomes `attendee`
- `POST /api/bookings` returns `201` even when reactivating a cancelled booking

## Frontend Ready Areas

- Login, register, and session restore
- Public events list and event detail
- Organizer event create, update, and delete
- User booking create, cancel, and my-bookings view
