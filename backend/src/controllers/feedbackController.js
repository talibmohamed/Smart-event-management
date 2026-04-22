import Feedback from "../models/Feedback.js";

const isEventFinished = (event) => {
  const comparisonDate = event?.event_end_date || event?.event_date;

  if (!comparisonDate) {
    return false;
  }

  return new Date(comparisonDate).getTime() <= Date.now();
};

export const submitFeedback = async (req, res) => {
  try {
    const event_id = req.params.id;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    if (req.user.role !== "attendee") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only attendees can submit feedback",
      });
    }

    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const event = await Feedback.getEventById(event_id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!isEventFinished(event)) {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted after the event has finished",
      });
    }

    const booking = await Feedback.getConfirmedBooking(user_id, event_id);

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Confirmed attendance is required to submit feedback",
      });
    }

    const feedback = await Feedback.upsertFeedback({
      user_id,
      event_id,
      rating: parsedRating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while submitting feedback",
      error: error.message,
    });
  }
};

export const getEventFeedbackStats = async (req, res) => {
  try {
    const event_id = req.params.id;
    const event = await Feedback.getEventById(event_id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (req.user.role === "organizer" && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view feedback for your own events",
      });
    }

    const feedbacks = await Feedback.getFeedbacksByEvent(event_id);
    const totalReviews = feedbacks.length;
    const averageRating = totalReviews
      ? Number(
          (
            feedbacks.reduce((total, feedback) => total + feedback.rating, 0) /
            totalReviews
          ).toFixed(1)
        )
      : 0;

    return res.status(200).json({
      success: true,
      message: "Event feedback retrieved successfully",
      data: {
        average_rating: averageRating,
        total_reviews: totalReviews,
        feedbacks,
      },
    });
  } catch (error) {
    console.error("Get feedback stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching event feedback",
      error: error.message,
    });
  }
};

export default {
  submitFeedback,
  getEventFeedbackStats,
};
