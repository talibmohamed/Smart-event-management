import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes } from "../../test/setup.js";

vi.mock("../../models/AdminTransaction.js", () => ({
  default: {
    BOOKING_STATUSES: ["confirmed", "pending_payment", "cancelled"],
    PAYMENT_STATUSES: ["unpaid", "paid", "failed", "cancelled", "expired"],
    buildTransactionWhere: vi.fn(),
    listTransactions: vi.fn(),
    getTransactionById: vi.fn(),
  },
}));

const { default: AdminTransaction } = await import("../../models/AdminTransaction.js");
const adminTransactionController = await import("../adminTransactionController.js");

const transactionItem = (overrides = {}) => ({
  id: "booking-1",
  bookingDate: new Date("2026-04-13T10:00:00.000Z"),
  status: "confirmed",
  paymentStatus: "paid",
  amountPaidCents: 12500,
  currency: "eur",
  user: {
    id: "user-1",
    email: "john@example.com",
    name: "John Doe",
  },
  event: {
    id: "event-1",
    title: "Tech Conference",
    eventDate: new Date("2026-05-13T10:00:00.000Z"),
  },
  stripe: {
    checkoutSessionId: "cs_test_123",
    paymentIntentId: "pi_test_123",
    eventId: "evt_test_123",
  },
  ticketsCount: 2,
  ...overrides,
});

describe("admin transaction controller", () => {
  beforeEach(() => {
    AdminTransaction.buildTransactionWhere.mockReturnValue({ status: "confirmed" });
    AdminTransaction.listTransactions.mockResolvedValue({
      items: [transactionItem()],
      total: 21,
    });
    AdminTransaction.getTransactionById.mockResolvedValue({
      ...transactionItem(),
      items: [
        {
          ticketTierId: "tier-1",
          ticketTierName: "VIP",
          quantity: 2,
          unitPriceCents: 6250,
          totalPriceCents: 12500,
        },
      ],
      ticketCodes: ["SEM-1", "SEM-2"],
      ticketCodesReturned: 2,
      ticketCodesTruncated: false,
    });
  });

  it("lists transactions with pagination, filters, date range, and default sort", async () => {
    const req = createMockReq({
      query: {
        page: "2",
        pageSize: "10",
        q: "john",
        status: "confirmed",
        paymentStatus: "paid",
        dateFrom: "2026-04-01T00:00:00.000Z",
        dateTo: "2026-04-30T23:59:59.999Z",
      },
    });
    const res = createMockRes();

    await adminTransactionController.listTransactions(req, res);

    expect(AdminTransaction.buildTransactionWhere).toHaveBeenCalledWith({
      q: "john",
      status: "confirmed",
      paymentStatus: "paid",
      dateFrom: new Date("2026-04-01T00:00:00.000Z"),
      dateTo: new Date("2026-04-30T23:59:59.999Z"),
    });
    expect(AdminTransaction.listTransactions).toHaveBeenCalledWith({
      where: { status: "confirmed" },
      skip: 10,
      take: 10,
      orderBy: { booking_date: "desc" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [transactionItem()],
      page: 2,
      pageSize: 10,
      total: 21,
      hasMore: true,
    });
  });

  it.each([
    ["date_desc", { booking_date: "desc" }],
    ["date_asc", { booking_date: "asc" }],
    ["amount_desc", { amount_paid: "desc" }],
    ["amount_asc", { amount_paid: "asc" }],
  ])("supports sort %s", async (sort, orderBy) => {
    const req = createMockReq({ query: { sort } });
    const res = createMockRes();

    await adminTransactionController.listTransactions(req, res);

    expect(AdminTransaction.listTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy })
    );
  });

  it.each([
    [{ page: "0" }, "page must be greater than or equal to 1"],
    [{ pageSize: "51" }, "pageSize must be less than or equal to 50"],
    [{ status: "complete" }, "Invalid booking status filter"],
    [{ paymentStatus: "refunded" }, "Invalid payment status filter"],
    [{ sort: "status_desc" }, "sort must be one of: date_desc, date_asc, amount_desc, amount_asc"],
    [
      { dateFrom: "2026-05-01", dateTo: "2026-04-01" },
      "dateFrom must be less than or equal to dateTo",
    ],
  ])("returns 400 for invalid params %#", async (query, message) => {
    const req = createMockReq({ query });
    const res = createMockRes();

    await adminTransactionController.listTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message,
    });
  });

  it("returns transaction detail", async () => {
    const req = createMockReq({ params: { id: "booking-1" } });
    const res = createMockRes();

    await adminTransactionController.getTransactionById(req, res);

    expect(AdminTransaction.getTransactionById).toHaveBeenCalledWith("booking-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ ticketTierName: "VIP" }),
          ]),
          ticketCodes: ["SEM-1", "SEM-2"],
        }),
      })
    );
  });

  it("returns 404 for missing transaction detail", async () => {
    AdminTransaction.getTransactionById.mockResolvedValue(null);
    const req = createMockReq({ params: { id: "missing-booking" } });
    const res = createMockRes();

    await adminTransactionController.getTransactionById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Transaction not found",
    });
  });

  it("does not leak sensitive fields in response objects", async () => {
    const req = createMockReq({ params: { id: "booking-1" } });
    const res = createMockRes();

    await adminTransactionController.getTransactionById(req, res);

    const responseBody = res.json.mock.calls[0][0];
    const serializedResponse = JSON.stringify(responseBody);

    expect(serializedResponse).not.toContain("password_hash");
    expect(serializedResponse).not.toContain("password_reset_token_hash");
    expect(serializedResponse).not.toContain("password_reset_expires_at");
  });
});
