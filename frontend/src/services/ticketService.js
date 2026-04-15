import api from "./api";

const ticketService = {
  getBookingTickets(bookingId) {
    return api.get(`/bookings/${bookingId}/tickets`);
  },

  getTicket(ticketCode) {
    return api.get(`/tickets/${encodeURIComponent(ticketCode)}`);
  },

  checkInTicket(ticketCode) {
    return api.post(`/tickets/${encodeURIComponent(ticketCode)}/check-in`);
  },
};

export default ticketService;
