import Event from "../models/Event.js";
import { isSupportedFrenchCity } from "../utils/frenchCities.js";

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

    if (!isSupportedFrenchCity(city)) {
      return res.status(400).json({
        success: false,
        message: "City must be a supported French city"
      });
    }

    const newEvent = await Event.createEvent({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      address: address.trim(),
      city: city.trim(),
      event_date,
      capacity: numericCapacity,
      price: numericPrice,
      organizer_id: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent
    });
  } catch (error) {
    console.error("Create event error:", error);

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

const updateEvent = async (req, res) => {
  try {
    const existingEvent = await Event.getEventById(req.params.id);

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

    if (!isSupportedFrenchCity(city)) {
      return res.status(400).json({
        success: false,
        message: "City must be a supported French city"
      });
    }

    const updatedEvent = await Event.updateEvent(req.params.id, {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      address: address.trim(),
      city: city.trim(),
      event_date,
      capacity: numericCapacity,
      price: numericPrice
    });

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent
    });
  } catch (error) {
    console.error("Update event error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating event",
      error: error.message
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const existingEvent = await Event.getEventById(req.params.id);

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

    const deletedEvent = await Event.deleteEvent(req.params.id);

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
  updateEvent,
  deleteEvent
};
