import { useEffect, useState, useMemo } from 'react';
import { Card, CardBody, CardHeader, Divider, Progress, User, Spinner } from "@heroui/react";
import { Star, MessageSquareOff } from "lucide-react";

export default function EventFeedbackStats({ eventId }) {
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0, feedbacks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchStats() {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/events/${eventId}/feedback`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load feedback.");
        }

        if (!ignore) {
          setStats(data);
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchStats();

    return () => { ignore = true; };
  }, [eventId]);

  // Calculer la répartition des notes (combien de 5 étoiles, 4 étoiles, etc.)
  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.feedbacks.forEach((feedback) => {
      distribution[feedback.rating] += 1;
    });
    return distribution;
  }, [stats.feedbacks]);

  // Fonction pour afficher des étoiles
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={16} 
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200 dark:text-zinc-700"} 
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <CardBody className="flex justify-center items-center py-12">
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
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-4">
        <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          Event Feedback
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Insights and reviews from your attendees.
        </p>
      </CardHeader>
      
      <Divider className="opacity-50" />

      <CardBody className="p-0">
        {stats.totalReviews === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquareOff size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No feedback yet.</p>
            <p className="text-sm text-zinc-500 mt-1">Check back later after your event has finished.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* RÉSUMÉ GLOBAL & BARRES DE PROGRESSION */}
            <div className="flex flex-col sm:flex-row gap-8 p-6 bg-zinc-50/50 dark:bg-white/[0.02]">
              
              {/* Moyenne */}
              <div className="flex flex-col items-center justify-center sm:w-1/3">
                <div className="text-5xl font-bold text-zinc-950 dark:text-white flex items-baseline gap-1">
                  {stats.averageRating}
                </div>
                <div className="mt-2 mb-1">
                  {renderStars(Math.round(stats.averageRating))}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-1">
                  {stats.totalReviews} Review{stats.totalReviews > 1 ? 's' : ''}
                </p>
              </div>

              {/* Barres HeroUI */}
              <div className="flex flex-col gap-2 flex-1 justify-center">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 w-12 flex items-center gap-1">
                      {star} <Star size={12} className="fill-current" />
                    </span>
                    <Progress 
                      aria-label={`${star} star rating`}
                      value={(ratingDistribution[star] / stats.totalReviews) * 100}
                      className="h-2 flex-1"
                      classNames={{
                        indicator: "bg-yellow-400",
                        track: "bg-zinc-200 dark:bg-white/10"
                      }}
                    />
                    <span className="text-xs text-zinc-500 w-6 text-right">
                      {ratingDistribution[star]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Divider className="opacity-50" />

            {/* LISTE DES COMMENTAIRES AVEC LE COMPOSANT <User> */}
            <div className="flex flex-col divide-y divide-zinc-200/50 dark:divide-white/10">
              {stats.feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <User   
                      name={`${feedback.user?.first_name} ${feedback.user?.last_name}`}
                      description={new Date(feedback.created_at).toLocaleDateString()}
                      avatarProps={{
                        src: feedback.user?.avatar_url, // S'affichera si l'utilisateur a une photo
                        name: feedback.user?.first_name?.charAt(0),
                        className: "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                      }}
                      classNames={{
                        name: "text-sm font-semibold text-zinc-900 dark:text-white",
                        description: "text-xs text-zinc-500"
                      }}
                    />
                    <div>
                      {renderStars(feedback.rating)}
                    </div>
                  </div>
                  {feedback.comment ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {feedback.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">No comment provided.</p>
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