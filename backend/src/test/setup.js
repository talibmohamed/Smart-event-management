import { afterEach, vi } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.STRIPE_CURRENCY = "eur";
process.env.EMAIL_ENABLED = "false";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";

afterEach(() => {
  vi.clearAllMocks();
});

export const createMockReq = ({
  body = {},
  params = {},
  query = {},
  headers = {},
  user = null,
} = {}) => ({
  body,
  params,
  query,
  headers,
  user,
});

export const createMockRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

export const createMockNext = () => vi.fn();

export const mockUser = (overrides = {}) => ({
  id: "user-1",
  first_name: "Test",
  last_name: "User",
  email: "test@example.com",
  role: "attendee",
  ...overrides,
});

export const mockEvent = (overrides = {}) => ({
  id: "event-1",
  title: "Test Event",
  description: "Test description",
  category: "Technology",
  address: "28 Rue Notre Dame des Champs",
  city: "Paris",
  capacity: 100,
  price: "25.00",
  organizer_id: "organizer-1",
  ...overrides,
});

export const mockBookingItem = (overrides = {}) => ({
  id: "booking-item-1",
  booking_id: "booking-1",
  ticket_tier_id: "tier-1",
  quantity: 1,
  unit_price: "25.00",
  total_price: "25.00",
  ticket_tier: {
    id: "tier-1",
    name: "Standard",
    description: "General admission",
    price: "25.00",
  },
  ...overrides,
});

export const mockBooking = (overrides = {}) => ({
  id: "booking-1",
  user_id: "user-1",
  event_id: "event-1",
  booking_date: new Date("2026-04-13T10:00:00.000Z"),
  status: "confirmed",
  payment_status: "paid",
  amount_paid: "0.00",
  currency: "eur",
  total_quantity: 1,
  total_price: "0.00",
  items: [mockBookingItem({ unit_price: "0.00", total_price: "0.00" })],
  ...overrides,
});

export const mockTicket = (overrides = {}) => ({
  id: "ticket-1",
  booking_id: "booking-1",
  booking_item_id: "booking-item-1",
  event_id: "event-1",
  user_id: "user-1",
  ticket_tier_id: "tier-1",
  ticket_code: "SEM-TEST123",
  qr_value: "SEM-TEST123",
  status: "valid",
  issued_at: new Date("2026-04-13T10:00:00.000Z"),
  checked_in_at: null,
  booking: {
    id: "booking-1",
    status: "confirmed",
    payment_status: "paid",
  },
  event: mockEvent({ organizer_id: "organizer-1" }),
  ticket_tier: {
    id: "tier-1",
    name: "Standard",
    price: "25.00",
  },
  attendee: mockUser(),
  ...overrides,
});
