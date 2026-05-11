import AdminTransaction from "../models/AdminTransaction.js";
import {
  createValidationError,
  parseIsoDateQueryValue,
  parsePaginationQuery,
} from "../utils/pagination.js";

const TRANSACTION_SORT_MAP = {
  date_desc: { booking_date: "desc" },
  date_asc: { booking_date: "asc" },
  amount_desc: { amount_paid: "desc" },
  amount_asc: { amount_paid: "asc" },
};

function validateEnum(value, allowedValues, message) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw createValidationError(message);
  }

  return value;
}

function parseDateRange(query) {
  const dateFrom = parseIsoDateQueryValue(query.dateFrom, "dateFrom");
  const dateTo = parseIsoDateQueryValue(query.dateTo, "dateTo");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw createValidationError("dateFrom must be less than or equal to dateTo");
  }

  return { dateFrom, dateTo };
}

function handleTransactionError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? fallbackMessage : error.message,
  });
}

export const listTransactions = async (req, res) => {
  try {
    const pagination = parsePaginationQuery(req.query, {
      defaultSort: "date_desc",
      sortMap: TRANSACTION_SORT_MAP,
    });
    const status = validateEnum(
      req.query.status,
      AdminTransaction.BOOKING_STATUSES,
      "Invalid booking status filter"
    );
    const paymentStatus = validateEnum(
      req.query.paymentStatus,
      AdminTransaction.PAYMENT_STATUSES,
      "Invalid payment status filter"
    );
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const where = AdminTransaction.buildTransactionWhere({
      q: req.query.q,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
    });
    const result = await AdminTransaction.listTransactions({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy,
    });

    return res.status(200).json({
      items: result.items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: result.total,
      hasMore: pagination.page * pagination.pageSize < result.total,
    });
  } catch (error) {
    return handleTransactionError(res, error, "Server error while listing transactions");
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const transaction = await AdminTransaction.getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    return handleTransactionError(res, error, "Server error while retrieving transaction");
  }
};

export default {
  listTransactions,
  getTransactionById,
};
