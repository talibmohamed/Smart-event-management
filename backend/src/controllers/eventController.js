import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import { geocodeFrenchAddress } from "../utils/geocoder.js";
import {
  deleteEventImage,
  uploadEventImage
} from "../utils/eventImageStorage.js";
import { sendEmailBestEffort } from "../utils/emailService.js";
import {
  eventDeletedEmail,
  eventUpdatedEmail
} from "../utils/emailTemplates.js";
import { findSupportedFrenchCity } from "../utils/frenchCities.js";
import { parseEventTicketTiers } from "../utils/ticketTiers.js";

const shouldRemoveImage = (value) => value === true || value === "true";
const ATTENDEE_STATUS_FILTERS = ["confirmed", "pending_payment", "cancelled", "all"];

const hasCoordinates = (coordinates) =>
  coordinates?.latitude !== null &&
  coordinates?.latitude !== undefined &&
  coordinates?.longitude !== null &&
  coordinates?.longitude !== undefined;

const didKeyEventDetailsChange = (beforeEvent, afterEvent) => {
  return (
    beforeEvent.title !== afterEvent.title ||
    new Date(beforeEvent.event_date).getTime() !==
      new Date(afterEvent.event_date).getTime() ||
    beforeEvent.address !== afterEvent.address ||
    beforeEvent.city !== afterEvent.city ||
    Number(beforeEvent.price) !== Number(afterEvent.price)
  );
};

const sendEventUpdatedEmails = ({ attendees, beforeEvent, afterEvent }) => {
  attendees.forEach((booking) => {
    sendEmailBestEffort(
      eventUpdatedEmail({
        attendee: booking.user,
        beforeEvent,
        afterEvent
      })
    );
  });
};

const sendEventDeletedEmails = ({ attendees, event }) => {
  attendees.forEach((booking) => {
    sendEmailBestEffort(
      eventDeletedEmail({
        attendee: booking.user,
        event
      })
    );
  });
};

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      address,
      city,
      event_date,
      capacity,
      price
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !address ||
      !city ||
      !event_date ||
      capacity === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All event fields are required"
      });
    }

    const numericCapacity = Number(capacity);
    const numericPrice = Number(price);

    if (Number.isNaN(numericCapacity) || numericCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive number"
      });
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number greater than or equal to 0"
      });
    }

    const ticketTiers = parseEventTicketTiers({
      rawTicketTiers: req.body.ticket_tiers,
      fallbackPrice: numericPrice,
      eventCapacity: numericCapacity
    });

    const supportedCity = findSupportedFrenchCity(city);

    if (!supportedCity) {
      return res.status(400).json({
        success: false,
        message: "City must be a supported French city"
      });
    }

    const trimmedAddress = address.trim();
    const coordinates = await geocodeFrenchAddress({
      address: trimmedAddress,
      city: supportedCity.name
    });

    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "Address could not be located"
      });
    }

    let uploadedImage = {
      image_url: null,
      image_path: null
    };

    if (req.file) {
      uploadedImage = await uploadEventImage(req.file, req.user.id);
    }

    let newEvent;

    try {
      newEvent = await Event.createEvent({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        address: trimmedAddress,
        city: supportedCity.name,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        image_url: uploadedImage.image_url,
        image_path: uploadedImage.image_path,
        event_date,
        capacity: numericCapacity,
        price: numericPrice,
        ticket_tiers: ticketTiers,
        organizer_id: req.user.id
      });
    } catch (error) {
      await deleteEventImage(uploadedImage.image_path);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent
    });
  } catch (error) {
    console.error("Create event error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating event",
      error: error.message
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.getAllEvents();

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: events
    });
  } catch (error) {
    console.error("Get all events error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching events",
      error: error.message
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: event
    });
  } catch (error) {
    console.error("Get event by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching event",
      error: error.message
    });
  }
};

const getEventAttendees = async (req, res) => {
  try {
    const status = req.query.status || "confirmed";

    if (!ATTENDEE_STATUS_FILTERS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendee status filter"
      });
    }

    const event = await Event.getEventRecordById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (req.user.role !== "admin" && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view attendees for your own events"
      });
    }

    const attendees = await Booking.getEventAttendees({
      event_id: event.id,
      status
    });

    return res.status(200).json({
      success: true,
      message: "Event attendees retrieved successfully",
      data: {
        event: {
          id: event.id,
          title: event.title,
          status_filter: status
        },
        attendees
      }
    });
  } catch (error) {
    console.error("Get event attendees error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching event attendees",
      error: error.message
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const existingEvent = await Event.getEventRecordById(req.params.id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (
      req.user.role !== "admin" &&
      existingEvent.organizer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own events"
      });
    }

    const {
      title,
      description,
      category,
      address,
      city,
      event_date,
      capacity,
      price
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !address ||
      !city ||
      !event_date ||
      capacity === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All event fields are required"
      });
    }

    const numericCapacity = Number(capacity);
    const numericPrice = Number(price);

    if (Number.isNaN(numericCapacity) || numericCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive number"
      });
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number greater than or equal to 0"
      });
    }

    const existingTicketTiers = req.body.ticket_tiers === undefined
      ? await Event.getTicketTiersForEvent(existingEvent.id)
      : null;
    const ticketTiers = existingTicketTiers || parseEventTicketTiers({
      rawTicketTiers: req.body.ticket_tiers,
      fallbackPrice: numericPrice,
      eventCapacity: numericCapacity
    });
    const ticketTierCapacityTotal = ticketTiers.reduce(
      (sum, tier) => sum + Number(tier.capacity),
      0
    );

    if (ticketTierCapacityTotal > numericCapacity) {
      return res.status(400).json({
        success: false,
        message: "Ticket tier capacities cannot exceed event capacity"
      });
    }

    const supportedCity = findSupportedFrenchCity(city);

    if (!supportedCity) {
      return res.status(400).json({
        success: false,
        message: "City must be a supported French city"
      });
    }

    const trimmedAddress = address.trim();
    const trimmedCity = supportedCity.name;
    const confirmedAttendees = await Event.getConfirmedAttendeesForEvent(
      existingEvent.id
    );
    const hasExistingCoordinates = hasCoordinates(existingEvent);
    const locationChanged =
      existingEvent.address !== trimmedAddress ||
      existingEvent.city !== trimmedCity;

    const coordinates = locationChanged || !hasExistingCoordinates
      ? await geocodeFrenchAddress({ address: trimmedAddress, city: trimmedCity })
      : {
          latitude: existingEvent.latitude,
          longitude: existingEvent.longitude
        };

    if (!hasCoordinates(coordinates)) {
      return res.status(400).json({
        success: false,
        message: "Address could not be located"
      });
    }

    let imageData = {
      image_url: existingEvent.image_url,
      image_path: existingEvent.image_path
    };
    let uploadedImagePath = null;

    if (req.file) {
      imageData = await uploadEventImage(req.file, req.user.id);
      uploadedImagePath = imageData.image_path;
    } else if (shouldRemoveImage(req.body.remove_image)) {
      imageData = {
        image_url: null,
        image_path: null
      };
    }

    let updatedEvent;

    try {
      updatedEvent = await Event.updateEvent(req.params.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        address: trimmedAddress,
        city: trimmedCity,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        image_url: imageData.image_url,
        image_path: imageData.image_path,
        event_date,
        capacity: numericCapacity,
        price: numericPrice,
        ticket_tiers: ticketTiers
      });
    } catch (error) {
      await deleteEventImage(uploadedImagePath);
      throw error;
    }

    if (
      existingEvent.image_path &&
      existingEvent.image_path !== imageData.image_path &&
      (req.file || shouldRemoveImage(req.body.remove_image))
    ) {
      await deleteEventImage(existingEvent.image_path);
    }

    if (didKeyEventDetailsChange(existingEvent, updatedEvent)) {
      sendEventUpdatedEmails({
        attendees: confirmedAttendees,
        beforeEvent: existingEvent,
        afterEvent: updatedEvent
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent
    });
  } catch (error) {
    console.error("Update event error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating event",
      error: error.message
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const existingEvent = await Event.getEventRecordById(req.params.id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (
      req.user.role !== "admin" &&
      existingEvent.organizer_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own events"
      });
    }

    const confirmedAttendees = await Event.getConfirmedAttendeesForEvent(
      existingEvent.id
    );
    const deletedEvent = await Event.deleteEvent(req.params.id);
    await deleteEventImage(existingEvent.image_path);
    sendEventDeletedEmails({
      attendees: confirmedAttendees,
      event: existingEvent
    });

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      data: deletedEvent
    });
  } catch (error) {
    console.error("Delete event error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting event",
      error: error.message
    });
  }
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  getEventAttendees,
  updateEvent,
  deleteEvent
};
