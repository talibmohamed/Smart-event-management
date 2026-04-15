import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import {
  generateTicketsPdf,
  getTicketPdfFilename,
} from "../utils/ticketPdf.js";

const canManageTicket = (user, ticket) =>
  user.role === "admin" ||
  (user.role === "organizer" && ticket.event?.organizer_id === user.id);

const getBookingTickets = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own tickets",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(409).json({
        success: false,
        message: "Tickets are available only for confirmed bookings",
      });
    }

    await Ticket.generateTicketsForBooking(booking.id);
    const data = await Ticket.getBookingTicketsSummary(booking);

    return res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("Get booking tickets error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching tickets",
      error: error.message,
    });
  }
};

const getBookingTicketsPdf = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only download your own tickets",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(409).json({
        success: false,
        message: "Tickets are available only for confirmed bookings",
      });
    }

    await Ticket.generateTicketsForBooking(booking.id);
    const data = await Ticket.getBookingTicketsSummary(booking);
    const pdfBuffer = await generateTicketsPdf(data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${getTicketPdfFilename(booking.id)}"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Download booking tickets PDF error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while downloading tickets",
      error: error.message,
    });
  }
};

const getTicketByCode = async (req, res) => {
  try {
    const ticket = await Ticket.getTicketByCode(req.params.ticket_code);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    if (!canManageTicket(req.user, ticket)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only validate tickets for your own events",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket retrieved successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Get ticket by code error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching ticket",
      error: error.message,
    });
  }
};

const checkInTicket = async (req, res) => {
  try {
    const ticket = await Ticket.getTicketByCode(req.params.ticket_code);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    if (!canManageTicket(req.user, ticket)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only check in tickets for your own events",
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled tickets cannot be checked in",
      });
    }

    if (ticket.status === "used") {
      return res.status(409).json({
        success: false,
        message: "Ticket has already been checked in",
      });
    }

    const updatedTicket = await Ticket.checkInTicket(ticket.ticket_code);

    return res.status(200).json({
      success: true,
      message: "Ticket checked in successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Check in ticket error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while checking in ticket",
      error: error.message,
    });
  }
};

export default {
  getBookingTickets,
  getBookingTicketsPdf,
  getTicketByCode,
  checkInTicket,
};
