import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Textarea } from "@heroui/react";
import { Star } from "lucide-react";
import eventService from "../../services/eventService";
import { extractApiErrorMessage } from "../../services/api";

export default function EventFeedbackForm({ eventId, onFeedbackSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select at least one star.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Magie ! On utilise ton eventService au lieu de fetch
      const response = await eventService.submitFeedback(eventId, { rating, comment });

      setMessage(response.data?.message || "Thank you for your feedback!");
      setRating(0);
      setComment('');
      
      if (onFeedbackSubmitted) onFeedbackSubmitted();

    } catch (err) {
      // On utilise ton extracteur d'erreur pour avoir un beau message propre
      setError(extractApiErrorMessage(err, "Failed to submit feedback."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
          Evaluate this event
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Let the organizer know how your experience was.
        </p>
      </CardHeader>
      
      <CardBody className="px-6 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* LES 5 ÉTOILES */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star 
                    size={32} 
                    className={`transition-colors duration-200 ${
                      isFilled 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-zinc-300 dark:text-zinc-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* LE CHAMP COMMENTAIRE */}
          <Textarea
            label="Your comment (optional)"
            placeholder="What did you think of the event?"
            variant="faded"
            value={comment}
            onValueChange={setComment}
            minRows={3}
            classNames={{
              input: "resize-none text-sm",
              label: "text-zinc-700 dark:text-zinc-300 font-medium"
            }}
          />

          {/* MESSAGES D'ERREUR OU SUCCÈS */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
          
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </div>
          )}

          {/* BOUTON VALIDER */}
          <Button
            type="submit"
            isLoading={isSubmitting}
            isDisabled={message !== null}
            className="w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950"
            radius="full"
          >
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}