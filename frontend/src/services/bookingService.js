import api from "./api";

const bookingService = {
  createBooking(eventId) {
    return api.post("/bookings", {
      event_id: eventId,
    });
  },

  getMyBookings() {
    return api.get("/bookings/my-bookings");
  },

  cancelBooking(id) {
    return api.put(`/bookings/${id}/cancel`);
  },
};

export default bookingService;
