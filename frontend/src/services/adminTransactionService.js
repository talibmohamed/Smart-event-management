import api from "./api";

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

const adminTransactionService = {
  listTransactions(params = {}) {
    return api.get("/admin/transactions", {
      params: compactParams(params),
    });
  },

  getTransactionById(id) {
    return api.get(`/admin/transactions/${id}`);
  },
};

export default adminTransactionService;
