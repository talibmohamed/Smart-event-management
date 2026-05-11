import AdminUser from "../models/AdminUser.js";
import { createValidationError, parsePaginationQuery } from "../utils/pagination.js";

const USER_SORT_MAP = {
  created_desc: { created_at: "desc" },
  created_asc: { created_at: "asc" },
  email_asc: { email: "asc" },
  email_desc: { email: "desc" },
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

function handleAdminError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? fallbackMessage : error.message,
  });
}

export const listUsers = async (req, res) => {
  try {
    const pagination = parsePaginationQuery(req.query, {
      defaultSort: "created_desc",
      sortMap: USER_SORT_MAP,
    });
    const role = validateEnum(req.query.role, AdminUser.USER_ROLES, "Invalid user role filter");
    const status = validateEnum(
      req.query.status,
      AdminUser.USER_STATUSES,
      "Invalid user status filter"
    );
    const where = AdminUser.buildUserWhere({
      q: req.query.q,
      role,
      status,
    });
    const result = await AdminUser.listUsers({
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
    return handleAdminError(res, error, "Server error while listing users");
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await AdminUser.findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    return handleAdminError(res, error, "Server error while retrieving user");
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!AdminUser.USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const existingUser = await AdminUser.findUserById(req.params.id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await AdminUser.updateUserRole({
      id: req.params.id,
      role,
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return handleAdminError(res, error, "Server error while updating user role");
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!AdminUser.USER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user status",
      });
    }

    if (req.user.id === req.params.id && status === "suspended") {
      return res.status(400).json({
        success: false,
        message: "You cannot suspend your own account",
      });
    }

    const existingUser = await AdminUser.findUserById(req.params.id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await AdminUser.updateUserStatus({
      id: req.params.id,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return handleAdminError(res, error, "Server error while updating user status");
  }
};

export default {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
};
