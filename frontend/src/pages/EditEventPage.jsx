import { Card, CardBody } from "@heroui/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import EventForm from "../components/event/EventForm";
import { EventFormSkeleton } from "../components/ui/LoadingSkeletons";
import { useAuth } from "../context/AuthContext";
import { extractApiErrorMessage } from "../services/api";
import eventService from "../services/eventService";

export default function EditEventPage() {
  const [eventRecord, setEventRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await eventService.getEventById(id);
        const eventData = response.data.data;

        if (ignore) {
          return;
        }

        if (user?.role !== "admin" && eventData.organizer_id !== user?.id) {
          navigate("/dashboard", {
            replace: true,
            state: {
              flashMessage: "Access denied. You can only update your own events",
              flashTone: "error",
            },
          });
          return;
        }

        setEventRecord(eventData);
      } catch (error) {
        if (ignore) {
          return;
        }

        const status = error.response?.status;

        if (status === 401) {
          logout();
          navigate("/login", {
            replace: true,
            state: { from: `${location.pathname}${location.search}` },
          });
          return;
        }

        if (status === 404) {
          navigate("/dashboard", {
            replace: true,
            state: {
              flashMessage: "Event not found",
              flashTone: "error",
            },
          });
          return;
        }

        setErrorMessage(extractApiErrorMessage(error, "Unable to load this event."));
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      ignore = true;
    };
  }, [id, location.pathname, location.search, logout, navigate, user?.id, user?.role]);

  async function handleSubmit(payload) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await eventService.updateEvent(id, payload);

      navigate("/dashboard", {
        replace: true,
        state: {
          flashMessage: response.data.message || "Event updated successfully",
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

      if (status === 403 || status === 404) {
        navigate("/dashboard", {
          replace: true,
          state: {
            flashMessage: extractApiErrorMessage(error, "Unable to update this event."),
            flashTone: "error",
          },
        });
        return;
      }

      setErrorMessage(extractApiErrorMessage(error, "Unable to update this event."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <Card className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardBody className="p-6 md:p-8">
          {isLoading ? (
            <EventFormSkeleton />
          ) : (
            <EventForm
              initialValues={eventRecord}
              title="Edit event"
              description="Update the event details below. Full event data is required by the current backend update flow."
              submitLabel="Save changes"
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              onSubmit={handleSubmit}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
