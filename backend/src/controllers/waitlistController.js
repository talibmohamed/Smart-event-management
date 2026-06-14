import Waitlist from "../models/Waitlist.js";

const ensureAttendeeRole = (req, res) => {
  if (req.user.role !== "attendee") {
    res.status(403).json({
      success: false,
      message: "Access denied. Only attendees can use the waitlist",
    });
    return false;
  }

  return true;
};

const joinWaitlist = async (req, res) => {
  try {
    if (!ensureAttendeeRole(req, res)) {
      return;
    }

    const event_id = req.params.id;
    const user_id = req.user.id;
    const eventAvailability = await Waitlist.getEventAvailabilityRecord(event_id);

    if (!eventAvailability) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!eventAvailability.is_full) {
      return res.status(400).json({
        success: false,
        message: "Event is not full",
      });
    }

    const activeBooking = await Waitlist.findActiveBookingForUser({ event_id, user_id });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        message: "An active booking already exists for this event",
      });
    }

    await Waitlist.joinWaitlist({ event_id, user_id });
    const status = await Waitlist.getWaitlistStatus({ event_id, user_id });

    return res.status(201).json({
      success: true,
      message: "Joined waitlist successfully",
      data: status,
    });
  } catch (error) {
    console.error("Join waitlist error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "You are already on the waitlist for this event",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while joining waitlist",
      error: error.message,
    });
  }
};

const leaveWaitlist = async (req, res) => {
  try {
    if (!ensureAttendeeRole(req, res)) {
      return;
    }

    const event_id = req.params.id;
    const user_id = req.user.id;
    const eventAvailability = await Waitlist.getEventAvailabilityRecord(event_id);

    if (!eventAvailability) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const result = await Waitlist.leaveWaitlist({ event_id, user_id });

    if (!result.count) {
      return res.status(404).json({
        success: false,
        message: "You are not on the waitlist for this event",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Left waitlist successfully",
      data: {
        is_waiting: false,
        position: null,
      },
    });
  } catch (error) {
    console.error("Leave waitlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while leaving waitlist",
      error: error.message,
    });
  }
};

const getMyWaitlistStatus = async (req, res) => {
  try {
    if (!ensureAttendeeRole(req, res)) {
      return;
    }

    const event_id = req.params.id;
    const user_id = req.user.id;
    const eventAvailability = await Waitlist.getEventAvailabilityRecord(event_id);

    if (!eventAvailability) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const status = await Waitlist.getWaitlistStatus({ event_id, user_id });

    return res.status(200).json({
      success: true,
      message: "Waitlist status retrieved successfully",
      data: status,
    });
  } catch (error) {
    console.error("Get waitlist status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching waitlist status",
      error: error.message,
    });
  }
};

export default {
  joinWaitlist,
  leaveWaitlist,
  getMyWaitlistStatus,
};
