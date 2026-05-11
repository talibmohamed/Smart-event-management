import api from "./api";

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

const adminAnalyticsService = {
  getSummary() {
    return api.get("/admin/analytics/summary");
  },

  getTimeseries(params) {
    return api.get("/admin/analytics/timeseries", {
      params: compactParams(params),
    });
  },

  getTopEvents(params = {}) {
    return api.get("/admin/analytics/top-events", {
      params: compactParams(params),
    });
  },

  getTopOrganizers(params = {}) {
    return api.get("/admin/analytics/top-organizers", {
      params: compactParams(params),
    });
  },
};

export default adminAnalyticsService;
