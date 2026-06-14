import api from "./api";

const waitlistService = {
  joinWaitlist(eventId) {
    return api.post(`/events/${eventId}/waitlist`);
  },

  leaveWaitlist(eventId) {
    return api.delete(`/events/${eventId}/waitlist`);
  },

  getMyStatus(eventId) {
    return api.get(`/events/${eventId}/waitlist/me`);
  },
};

export default waitlistService;
