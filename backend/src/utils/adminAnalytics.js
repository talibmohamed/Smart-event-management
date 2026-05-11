import { Prisma } from "@prisma/client";

export const ANALYTICS_CURRENCY = "eur";
export const TIMESERIES_METRICS = [
  "bookings_created",
  "revenue",
  "users_created",
  "events_created",
];

export const revenueBookingWhere = (extraWhere = {}) => ({
  status: "confirmed",
  payment_status: "paid",
  amount_paid: {
    not: null,
  },
  ...extraWhere,
});

export const revenueBookingSqlCondition = (bookingAlias = "b") => {
  const alias = Prisma.raw(bookingAlias);

  return Prisma.sql`${alias}.status = 'confirmed'
    AND ${alias}.payment_status = 'paid'
    AND ${alias}.amount_paid IS NOT NULL`;
};

export function eurosToCents(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Math.round(Number(value) * 100);
}

export function toUtcDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function startOfUtcDay(value) {
  const date = new Date(value);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfUtcDay(value) {
  const start = startOfUtcDay(value);

  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function daysBetweenInclusive(from, to) {
  const fromDay = startOfUtcDay(from);
  const toDay = startOfUtcDay(to);

  return Math.floor((toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function zeroFillDailySeries({ from, to, rows }) {
  const valuesByDate = new Map(
    rows.map((row) => [row.date, Number(row.value || 0)])
  );
  const points = [];
  const totalDays = daysBetweenInclusive(from, to);
  const fromDay = startOfUtcDay(from);

  for (let index = 0; index < totalDays; index += 1) {
    const date = new Date(fromDay.getTime() + index * 24 * 60 * 60 * 1000);
    const dateKey = toUtcDateKey(date);

    points.push({
      date: dateKey,
      value: valuesByDate.get(dateKey) || 0,
    });
  }

  return points;
}
