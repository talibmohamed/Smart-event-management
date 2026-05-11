import prisma from "../config/prisma.js";

export const USER_ROLES = ["attendee", "organizer", "admin"];
export const USER_STATUSES = ["active", "suspended"];

const baseUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  role: true,
  status: true,
  created_at: true,
  _count: {
    select: {
      bookings: true,
      events: true,
    },
  },
};

const formatUserListItem = (user) => ({
  id: user.id,
  email: user.email,
  name: [user.first_name, user.last_name].filter(Boolean).join(" "),
  first_name: user.first_name,
  last_name: user.last_name,
  role: user.role,
  status: user.status,
  createdAt: user.created_at,
  bookingsCount: user._count?.bookings ?? 0,
  eventsOrganizedCount: user._count?.events ?? 0,
});

const buildUserWhere = ({ q, role, status }) => {
  const where = {};

  if (q) {
    const query = String(q).trim();

    if (query) {
      const nameParts = query.split(/\s+/).filter(Boolean);
      const fullNameMatches = [];

      if (nameParts.length >= 2) {
        const firstPart = nameParts[0];
        const lastPart = nameParts.slice(1).join(" ");

        fullNameMatches.push(
          {
            AND: [
              { first_name: { contains: firstPart, mode: "insensitive" } },
              { last_name: { contains: lastPart, mode: "insensitive" } },
            ],
          },
          {
            AND: [
              { first_name: { contains: lastPart, mode: "insensitive" } },
              { last_name: { contains: firstPart, mode: "insensitive" } },
            ],
          }
        );
      }

      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { first_name: { contains: query, mode: "insensitive" } },
        { last_name: { contains: query, mode: "insensitive" } },
        ...fullNameMatches,
      ];
    }
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  return where;
};

const listUsers = async ({ where, skip, take, orderBy }) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: baseUserSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: users.map(formatUserListItem),
    total,
  };
};

const findUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...baseUserSelect,
      bookings: {
        orderBy: { booking_date: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          booking_date: true,
          event: {
            select: {
              title: true,
            },
          },
        },
      },
      events: {
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          event_date: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    ...formatUserListItem(user),
    recentBookings: user.bookings.map((booking) => ({
      id: booking.id,
      eventTitle: booking.event?.title || "Event",
      status: booking.status,
      createdAt: booking.booking_date,
    })),
    recentEventsOrganized: user.events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.event_date,
    })),
  };
};

const updateUserRole = async ({ id, role }) => {
  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: baseUserSelect,
  });

  return formatUserListItem(user);
};

const updateUserStatus = async ({ id, status }) => {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: baseUserSelect,
  });

  return formatUserListItem(user);
};

export default {
  USER_ROLES,
  USER_STATUSES,
  buildUserWhere,
  listUsers,
  findUserById,
  updateUserRole,
  updateUserStatus,
};
