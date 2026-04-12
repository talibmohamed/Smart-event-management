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

  getBookingById(id) {
    return api.get(`/bookings/${id}`);
  },

  retryPayment(id) {
    return api.post(`/bookings/${id}/retry-payment`);
  },

  cancelBooking(id) {
    return api.put(`/bookings/${id}/cancel`);
  },
};

export default bookingService;
