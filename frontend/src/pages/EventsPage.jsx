import EventCard from "../components/event/EventCard";

const mockEvents = [
  {
    id: 1,
    title: "Tech Conference Paris",
    category: "Technology",
    description: "A large conference about AI, web development and innovation.",
    date: "April 12, 2026 - 09:00",
    location: "Paris",
    capacity: 300,
    price: 49,
  },
  {
    id: 2,
    title: "Startup Networking Night",
    category: "Business",
    description:
      "Meet entrepreneurs, investors and students in one networking event.",
    date: "April 18, 2026 - 19:00",
    location: "Lyon",
    capacity: 120,
    price: 0,
  },
  {
    id: 3,
    title: "Music Festival Weekend",
    category: "Music",
    description: "Two days of live music, food trucks and outdoor activities.",
    date: "May 3, 2026 - 15:00",
    location: "Marseille",
    capacity: 1000,
    price: 89,
  },
];

export default function EventsPage() {
  return (
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Browse available events by category, location and date.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {mockEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
  );
}
