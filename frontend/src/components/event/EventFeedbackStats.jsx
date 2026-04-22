import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Divider, Progress, Spinner, User } from "@heroui/react";
import { MessageSquareOff, Star } from "lucide-react";
import { extractApiErrorMessage } from "../../services/api";
import eventService from "../../services/eventService";

const emptyStats = {
  average_rating: 0,
  total_reviews: 0,
  feedbacks: [],
};

export default function EventFeedbackStats({ eventId }) {
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchStats() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await eventService.getEventFeedbackStats(eventId);

        if (!ignore) {
          setStats(response.data?.data || emptyStats);
        }
      } catch (err) {
        if (!ignore) {
          setError(extractApiErrorMessage(err, "Failed to load feedback."));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const feedback of stats.feedbacks || []) {
      if (distribution[feedback.rating] !== undefined) {
        distribution[feedback.rating] += 1;
      }
    }

    return distribution;
  }, [stats.feedbacks]);

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200 dark:text-zinc-700"
          }
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Card className="w-full border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardBody className="flex items-center justify-center py-12">
          <Spinner color="default" label="Loading feedback..." />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <Card className="w-full border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardHeader className="flex flex-col items-start px-6 pb-4 pt-6">
        <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          Event Feedback
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Insights and reviews from your attendees.
        </p>
      </CardHeader>

      <Divider className="opacity-50" />

      <CardBody className="p-0">
        {stats.total_reviews === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquareOff size={40} className="mb-3 text-zinc-300 dark:text-zinc-600" />
            <p className="font-medium text-zinc-600 dark:text-zinc-400">No feedback yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Check back later after your event has finished.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-col gap-8 bg-zinc-50/50 p-6 dark:bg-white/[0.02] sm:flex-row">
              <div className="flex flex-col items-center justify-center sm:w-1/3">
                <div className="flex items-baseline gap-1 text-5xl font-bold text-zinc-950 dark:text-white">
                  {stats.average_rating}
                </div>
                <div className="mb-1 mt-2">{renderStars(Math.round(stats.average_rating))}</div>
                <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {stats.total_reviews} Review{stats.total_reviews > 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex flex-1 flex-col justify-center gap-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="flex w-12 items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {star} <Star size={12} className="fill-current" />
                    </span>
                    <Progress
                      aria-label={`${star} star rating`}
                      value={(ratingDistribution[star] / stats.total_reviews) * 100}
                      className="h-2 flex-1"
                      classNames={{
                        indicator: "bg-yellow-400",
                        track: "bg-zinc-200 dark:bg-white/10",
                      }}
                    />
                    <span className="w-6 text-right text-xs text-zinc-500">{ratingDistribution[star]}</span>
                  </div>
                ))}
              </div>
            </div>

            <Divider className="opacity-50" />

            <div className="flex flex-col divide-y divide-zinc-200/50 dark:divide-white/10">
              {stats.feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <User
                      name={`${feedback.user?.first_name || "Anonymous"} ${feedback.user?.last_name || ""}`}
                      description={new Date(feedback.created_at).toLocaleDateString()}
                      avatarProps={{
                        name: feedback.user?.first_name?.charAt(0) || "A",
                        className: "bg-zinc-950 font-semibold text-white dark:bg-white dark:text-zinc-950",
                      }}
                      classNames={{
                        name: "text-sm font-semibold text-zinc-900 dark:text-white",
                        description: "text-xs text-zinc-500",
                      }}
                    />
                    <div>{renderStars(feedback.rating)}</div>
                  </div>
                  {feedback.comment ? (
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {feedback.comment}
                    </p>
                  ) : (
                    <p className="text-sm italic text-zinc-400">No comment provided.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
