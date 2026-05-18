# Quickseat – Functionalities Checklist

### Authentication & Users
- [x] Registration (email/password)
- [x] Login with JWT
- [x] Session restore (`/api/auth/me`)
- [x] Forgot password
- [x] Reset password

### Events Management
- [x] Create event (organizer/admin)
- [x] Update event
- [x] Delete event
- [x] Event fields:
  - [x] Title
  - [x] Description
  - [x] Category
  - [x] Address
  - [x] City (France validated)
  - [x] Date & time
  - [x] Capacity
  - [x] Cover image
  - [x] Ticket tiers

### Location & Map
- [x] Address + city validation
- [x] Backend geocoding (lat/lng)
- [x] Map display (Leaflet)
- [x] Airbnb-style list + map UI

### Browsing & Search
- [x] Search (title/description/category/location)
- [x] Filters:
  - [x] Category
  - [x] City
  - [x] Price (Free/Paid + min/max)
  - [x] Time (Upcoming/Past)
- [x] Sorting (date/price)
- [x] URL query sync
- [x] List + map views

### Booking & Payments
- [x] Booking flow
- [x] Multi-tier ticket selection
- [x] Free event booking
- [x] Paid booking via Stripe Checkout
- [x] Payment retry
- [x] Status polling

### Payments
- [x] Stripe Checkout integration
- [x] Webhook confirmation

### Capacity Management
- [x] Global event capacity
- [x] Per-ticket-tier capacity
- [x] Only confirmed bookings count
- [x] Pending payments don't reserve seats

### Tickets
- [x] Multi-tier tickets (Early Bird / VIP / etc.)
- [x] Max 5 tickets per booking
- [x] QR-code tickets
- [x] Ticket page
- [x] PDF ticket download
- [x] Check-in scanner (organizer/admin)

### Notifications
- [x] Backend-persisted notifications
- [x] REST API fetch
- [x] Socket.IO real-time updates
- [x] Notification bell UI

### Media
- [x] Event cover image upload
- [x] Replace/remove images
- [x] Supabase Storage integration

### Organizer Tools
- [x] Attendee list page
- [x] Status filter
- [x] Ticket details
- [x] Revenue display
- [x] Ticket count stats

### Admin
- [x] User management UI (search, filter, role change, suspend/unsuspend)
- [x] Transaction monitoring dashboard
- [x] Admin analytics dashboard (summary, time series, top events/organizers)
- [ ] Unified admin overview/landing page

### Feedback
- [x] Ratings system (1–5 after attended events)
- [x] Event reviews (comments + organizer/admin viewing)

### Scheduling & Reminders
- [x] Event reminders (24h + 1h scheduled notifications)
- [x] Detailed agenda/session scheduling

### Security
- [x] JWT authentication
- [x] Role-based access (user/organizer/admin)
- [x] Ownership checks
- [x] Backend-controlled payments & tickets
- [x] Suspended-user enforcement on every authenticated request

### Backend Improvements
- [x] Backend pagination (events, admin users, admin transactions)
- [x] Backend filtering/search (events: q/category/city/price/date/sort)

### UI/UX
- [x] Responsive UI (Tailwind + HeroUI)

---

## Partial / Not Fully Done

### Analytics & Reporting
- [x] Sales trends (admin analytics timeseries)
- [x] Platform usage stats (admin analytics summary)
- [ ] Deeper organizer-side analytics (organizer dashboard still has basic stats only)
- [ ] Reporting tools (CSV/PDF export)

### ~~Event Types~~
- [ ] ~~Virtual events support~~
- [ ] ~~Hybrid events~~

### Advanced Booking Features
- [ ] Waitlist system

### Integrations
- [ ] Google Calendar integration
- [ ] Outlook integration

### Communication
- [ ] Organizer ↔ attendee messaging

### Accessibility
- [ ] Accessibility audit (WCAG compliance)

### Smart Features
- [ ] Recommendation engine

### Social
- [ ] Social media sharing

### ~~Payments Expansion~~
- [ ] ~~PayPal integration~~

### Virtual Features
- [ ] Live streaming support

---

## Extra Features

### Branding & Design
- [x] Quickseat rebranding
- [x] Custom logo + slogan
- [x] High-end landing page
- [x] Dark/light theme toggle

### Legal
- [x] Privacy Policy
- [x] Terms of Service

### Emails
- [x] Transactional emails (Resend)
- [x] Booking/payment/ticket emails
- [x] Reminder emails
- [x] PDF ticket attachments

### Tickets & Check-in
- [x] Branded PDF tickets
- [x] QR code generation
- [x] Check-in system

### Maps & Location
- [x] Leaflet integration
- [x] Mobile map bottom sheet
- [x] French city autocomplete
- [x] Backend-only geocoding

### Notifications
- [x] Persistent notification center
- [x] Real-time Socket.IO updates

### Frontend Components
- [x] Skeleton loaders

### Dev & Backend
- [x] API documentation
- [x] API contract (JSON)
- [x] Backend tests (Vitest)
- [x] Seeded dataset + test accounts
