import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes, mockUser } from "../../test/setup.js";

vi.mock("../../models/AdminUser.js", () => ({
  default: {
    USER_ROLES: ["attendee", "organizer", "admin"],
    USER_STATUSES: ["active", "suspended"],
    buildUserWhere: vi.fn(),
    listUsers: vi.fn(),
    findUserById: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

const { default: AdminUser } = await import("../../models/AdminUser.js");
const adminUserController = await import("../adminUserController.js");

const admin = mockUser({ id: "admin-1", role: "admin" });

const userListItem = (overrides = {}) => ({
  id: "user-1",
  email: "user@example.com",
  name: "Test User",
  first_name: "Test",
  last_name: "User",
  role: "attendee",
  status: "active",
  createdAt: new Date("2026-04-10T10:00:00.000Z"),
  bookingsCount: 2,
  eventsOrganizedCount: 0,
  ...overrides,
});

describe("admin user controller", () => {
  beforeEach(() => {
    AdminUser.buildUserWhere.mockReturnValue({ role: "attendee" });
    AdminUser.listUsers.mockResolvedValue({
      items: [userListItem()],
      total: 21,
    });
    AdminUser.findUserById.mockResolvedValue({
      ...userListItem(),
      recentBookings: [
        {
          id: "booking-1",
          eventTitle: "Tech Conference",
          status: "confirmed",
          createdAt: new Date("2026-04-13T10:00:00.000Z"),
        },
      ],
      recentEventsOrganized: [
        {
          id: "event-1",
          title: "Organizer Event",
          startsAt: new Date("2026-05-13T10:00:00.000Z"),
        },
      ],
    });
    AdminUser.updateUserRole.mockResolvedValue(userListItem({ role: "organizer" }));
    AdminUser.updateUserStatus.mockResolvedValue(userListItem({ status: "suspended" }));
  });

  it("lists users with pagination, search, filters, and sort", async () => {
    const req = createMockReq({
      user: admin,
      query: {
        page: "2",
        pageSize: "10",
        q: "test",
        role: "attendee",
        status: "active",
        sort: "email_asc",
      },
    });
    const res = createMockRes();

    await adminUserController.listUsers(req, res);

    expect(AdminUser.buildUserWhere).toHaveBeenCalledWith({
      q: "test",
      role: "attendee",
      status: "active",
    });
    expect(AdminUser.listUsers).toHaveBeenCalledWith({
      where: { role: "attendee" },
      skip: 10,
      take: 10,
      orderBy: { email: "asc" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [userListItem()],
      page: 2,
      pageSize: 10,
      total: 21,
      hasMore: true,
    });
  });

  it("reports hasMore false on the last page", async () => {
    AdminUser.listUsers.mockResolvedValue({
      items: [userListItem()],
      total: 20,
    });
    const req = createMockReq({
      user: admin,
      query: { page: "2", pageSize: "10" },
    });
    const res = createMockRes();

    await adminUserController.listUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
        total: 20,
        hasMore: false,
      })
    );
  });

  it("returns 400 for invalid list params", async () => {
    const req = createMockReq({
      user: admin,
      query: { pageSize: "100", role: "attendee" },
    });
    const res = createMockRes();

    await adminUserController.listUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "pageSize must be less than or equal to 50",
    });
    expect(AdminUser.listUsers).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid role filter", async () => {
    const req = createMockReq({
      user: admin,
      query: { role: "owner" },
    });
    const res = createMockRes();

    await adminUserController.listUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid user role filter",
    });
  });

  it("returns 404 for missing user detail", async () => {
    AdminUser.findUserById.mockResolvedValue(null);
    const req = createMockReq({
      user: admin,
      params: { id: "missing-user" },
    });
    const res = createMockRes();

    await adminUserController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  it("returns user detail with recent bookings and events", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "user-1" },
    });
    const res = createMockRes();

    await adminUserController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          recentBookings: expect.arrayContaining([
            expect.objectContaining({ eventTitle: "Tech Conference" }),
          ]),
          recentEventsOrganized: expect.arrayContaining([
            expect.objectContaining({ title: "Organizer Event" }),
          ]),
        }),
      })
    );
  });

  it("updates a valid role", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "user-1" },
      body: { role: "organizer" },
    });
    const res = createMockRes();

    await adminUserController.updateUserRole(req, res);

    expect(AdminUser.updateUserRole).toHaveBeenCalledWith({
      id: "user-1",
      role: "organizer",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects invalid role updates", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "user-1" },
      body: { role: "owner" },
    });
    const res = createMockRes();

    await adminUserController.updateUserRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AdminUser.updateUserRole).not.toHaveBeenCalled();
  });

  it("rejects self role changes", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "admin-1" },
      body: { role: "attendee" },
    });
    const res = createMockRes();

    await adminUserController.updateUserRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You cannot change your own role",
    });
  });

  it("updates a valid status", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "user-1" },
      body: { status: "suspended" },
    });
    const res = createMockRes();

    await adminUserController.updateUserStatus(req, res);

    expect(AdminUser.updateUserStatus).toHaveBeenCalledWith({
      id: "user-1",
      status: "suspended",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects self suspension", async () => {
    const req = createMockReq({
      user: admin,
      params: { id: "admin-1" },
      body: { status: "suspended" },
    });
    const res = createMockRes();

    await adminUserController.updateUserStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You cannot suspend your own account",
    });
  });
});
