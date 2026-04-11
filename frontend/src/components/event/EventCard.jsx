import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from "@heroui/react";
import { ArrowRight, CalendarClock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatEventDate, formatEventPrice, formatEventVenue } from "../../utils/eventUtils";

export default function EventCard({ event, isSelected = false, onSelect, onHover }) {
  return (
    <Card
      className={`group w-full overflow-hidden border bg-white/82 shadow-sm shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:bg-white/[0.04] dark:shadow-black/10 dark:hover:shadow-black/25 ${
        isSelected
          ? "border-sky-400 ring-4 ring-sky-400/20 dark:border-sky-300 dark:ring-sky-300/15"
          : "border-zinc-200/80 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/15"
      }`}
      onClick={() => onSelect?.(event.id)}
      onMouseEnter={() => onHover?.(event.id)}
      onFocus={() => onHover?.(event.id)}
    >
      <div className="h-1.5 w-full bg-[linear-gradient(90deg,rgba(14,165,233,0.92),rgba(99,102,241,0.88),rgba(16,185,129,0.78))] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader className="flex flex-col items-start gap-4 px-6 pb-4 pt-5">
        <div className="flex w-full items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-100/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/8 dark:text-zinc-300">
              {event.category}
            </div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              {event.title}
            </h3>
          </div>

          <Chip
            variant="flat"
            className="border border-zinc-200 bg-white/90 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
          >
            {formatEventPrice(event.price)}
          </Chip>
        </div>
      </CardHeader>

      <CardBody className="gap-5 px-6 py-0">
        <p className="line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <CalendarClock size={14} />
              Schedule
            </div>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {formatEventDate(event.event_date || event.date)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <MapPin size={14} />
              Venue
            </div>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {formatEventVenue(event)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Users size={16} />
          <span>{event.capacity} seats available</span>
        </div>
      </CardBody>

      <CardFooter className="px-6 pb-6 pt-5">
        <Button
          as={Link}
          to={`/events/${event.id}`}
          radius="full"
          className="w-full bg-zinc-950 text-white transition-transform duration-300 group-hover:translate-x-0.5 dark:bg-white dark:text-zinc-950"
          endContent={<ArrowRight size={15} />}
        >
          View details
        </Button>
      </CardFooter>
    </Card>
  );
}
