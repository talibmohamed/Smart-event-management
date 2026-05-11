import AdminAnalytics from "../models/AdminAnalytics.js";
import {
  ANALYTICS_CURRENCY,
  TIMESERIES_METRICS,
  daysBetweenInclusive,
  endOfUtcDay,
  startOfUtcDay,
  toUtcDateKey,
} from "../utils/adminAnalytics.js";
import { createValidationError, parseIsoDateQueryValue } from "../utils/pagination.js";

const TOP_EVENT_SORTS = ["revenue", "bookings"];
const TOP_ORGANIZER_SORTS = ["revenue", "events", "bookings"];

function parseEnum(value, allowedValues, name, { required = false, defaultValue = null } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createValidationError(`${name} is required`);
    }

    return defaultValue;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw createValidationError(`${name} must be one of: ${allowedValues.join(", ")}`);
  }

  return value;
}

function parseLimit(rawValue, { defaultValue = 10, max = 25 } = {}) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  if (typeof rawValue !== "string" || !/^\d+$/.test(rawValue)) {
    throw createValidationError("limit must be an integer");
  }

  const value = Number(rawValue);

  if (value < 1) {
    throw createValidationError("limit must be greater than or equal to 1");
  }

  if (value > max) {
    throw createValidationError(`limit must be less than or equal to ${max}`);
  }

  return value;
}

function parseRequiredDateRange(query) {
  const fromRaw = query.from;
  const toRaw = query.to;

  if (!fromRaw) {
    throw createValidationError("from is required");
  }

  if (!toRaw) {
    throw createValidationError("to is required");
  }

  const from = startOfUtcDay(parseIsoDateQueryValue(fromRaw, "from"));
  const to = endOfUtcDay(parseIsoDateQueryValue(toRaw, "to"));

  if (from > to) {
    throw createValidationError("from must be less than or equal to to");
  }

  if (daysBetweenInclusive(from, to) > 365) {
    throw createValidationError("date range must be 365 days or less");
  }

  return { from, to };
}

function parseOptionalEventDateRange(query) {
  const from = query.from ? startOfUtcDay(parseIsoDateQueryValue(query.from, "from")) : null;
  const to = query.to ? endOfUtcDay(parseIsoDateQueryValue(query.to, "to")) : null;

  if (from && to && from > to) {
    throw createValidationError("from must be less than or equal to to");
  }

  return { from, to };
}

function handleAnalyticsError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? fallbackMessage : error.message,
  });
}

export const getSummary = async (req, res) => {
  try {
    const summary = await AdminAnalytics.getSummary();

    return res.status(200).json({
      success: true,
      message: "Analytics summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    return handleAnalyticsError(res, error, "Server error while fetching analytics summary");
  }
};

export const getTimeseries = async (req, res) => {
  try {
    const metric = parseEnum(req.query.metric, TIMESERIES_METRICS, "metric", {
      required: true,
    });
    const { from, to } = parseRequiredDateRange(req.query);
    const points = await AdminAnalytics.getTimeseries({ metric, from, to });

    return res.status(200).json({
      success: true,
      message: "Analytics timeseries retrieved successfully",
      data: {
        metric,
        from: toUtcDateKey(from),
        to: toUtcDateKey(to),
        points,
      },
    });
  } catch (error) {
    return handleAnalyticsError(res, error, "Server error while fetching analytics timeseries");
  }
};

export const getTopEvents = async (req, res) => {
  try {
    const sortBy = parseEnum(req.query.sortBy, TOP_EVENT_SORTS, "sortBy", {
      defaultValue: "revenue",
    });
    const limit = parseLimit(req.query.limit);
    const { from, to } = parseOptionalEventDateRange(req.query);
    const items = await AdminAnalytics.getTopEvents({
      sortBy,
      limit,
      from,
      to,
    });

    return res.status(200).json({
      success: true,
      message: "Top events retrieved successfully",
      data: { items },
    });
  } catch (error) {
    return handleAnalyticsError(res, error, "Server error while fetching top events");
  }
};

export const getTopOrganizers = async (req, res) => {
  try {
    const sortBy = parseEnum(req.query.sortBy, TOP_ORGANIZER_SORTS, "sortBy", {
      defaultValue: "revenue",
    });
    const limit = parseLimit(req.query.limit);
    const items = await AdminAnalytics.getTopOrganizers({
      sortBy,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Top organizers retrieved successfully",
      data: { items, currency: ANALYTICS_CURRENCY },
    });
  } catch (error) {
    return handleAnalyticsError(res, error, "Server error while fetching top organizers");
  }
};

export default {
  getSummary,
  getTimeseries,
  getTopEvents,
  getTopOrganizers,
};
