import api from "./api";

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

const adminUserService = {
  listUsers(params = {}) {
    return api.get("/admin/users", {
      params: compactParams(params),
    });
  },

  getUserById(id) {
    return api.get(`/admin/users/${id}`);
  },

  updateUserRole(id, role) {
    return api.patch(`/admin/users/${id}/role`, { role });
  },

  updateUserStatus(id, status) {
    return api.patch(`/admin/users/${id}/status`, { status });
  },
};

export default adminUserService;
