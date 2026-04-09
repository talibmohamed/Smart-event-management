import { Card, CardBody } from "@heroui/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EventForm from "../components/event/EventForm";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";

export default function CreateEventPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(payload) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await eventService.createEvent(payload);

      navigate("/dashboard", {
        replace: true,
        state: {
          flashMessage: response.data.message || "Event created successfully",
          flashTone: "success",
        },
      });
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        logout();
        navigate("/login", {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        });
        return;
      }

      setErrorMessage(
        extractApiErrorMessage(error, "Unable to create the event right now."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardBody className="p-6 md:p-8">
          <EventForm
            title="Create a new event"
            description="Publish a new event with the required details. Organizers and admins can manage it later from the dashboard."
            submitLabel="Publish Event"
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        </CardBody>
      </Card>
    </div>
  );
}
