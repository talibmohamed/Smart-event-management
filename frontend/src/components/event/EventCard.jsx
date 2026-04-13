import { Button, Card, CardBody, CardFooter, Chip } from "@heroui/react";
import { ArrowRight, CalendarClock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatEventAvailability,
  formatEventDate,
  formatEventPriceRange,
  formatEventVenue,
} from "../../utils/eventUtils";
import EventCoverImage from "./EventCoverImage";

export default function EventCard({ event, isSelected = false, onSelect, onHover }) {
  return (
    <Card
      className={`group w-full overflow-hidden rounded-[1.75rem] border bg-white/76 shadow-[0_18px_55px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_26px_70px_rgba(148,163,184,0.24)] dark:bg-white/[0.045] dark:shadow-black/15 dark:hover:bg-white/[0.065] dark:hover:shadow-black/30 ${
        isSelected
          ? "border-sky-400 ring-4 ring-sky-400/18 dark:border-sky-300 dark:ring-sky-300/15"
          : "border-zinc-200/80 hover:border-zinc-300/90 dark:border-white/10 dark:hover:border-white/18"
      }`}
      onClick={() => onSelect?.(event.id)}
      onMouseEnter={() => onHover?.(event.id)}
      onFocus={() => onHover?.(event.id)}
    >
      <div className="relative p-3 pb-0">
        {event.image_url ? (
          <EventCoverImage
            src={event.image_url}
            alt={`${event.title} cover`}
            className="h-48 w-full rounded-[1.35rem]"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="relative h-32 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.34),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.3),transparent_34%),linear-gradient(135deg,rgba(241,245,249,0.96),rgba(226,232,240,0.82))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(15,23,42,0.86))]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-35 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
            <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-sky-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
              <CalendarClock size={18} />
            </div>
          </div>
        )}

        <div className="absolute left-6 top-6 flex max-w-[calc(100%-3rem)] items-center gap-2">
          <span className="truncate rounded-full border border-white/55 bg-white/82 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/58 dark:text-zinc-200">
            {event.category || "Event"}
          </span>

          <Chip
            variant="flat"
            className="shrink-0 border border-white/55 bg-white/86 text-zinc-800 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/58 dark:text-zinc-100"
          >
            {formatEventPriceRange(event)}
          </Chip>
        </div>
      </div>

      <CardBody className="gap-5 px-5 pb-0 pt-5">
        <div className="space-y-3">
          <h3 className="text-[1.35rem] font-semibold leading-tight tracking-[-0.045em] text-zinc-950 dark:text-white">
            {event.title}
          </h3>
          <p className="line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {event.description}
          </p>
        </div>

        <div className="space-y-3 border-y border-zinc-200/70 py-4 text-sm dark:border-white/10">
          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventDate(event.event_date || event.date)}
            </span>
          </div>

          <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
            <MapPin size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="line-clamp-2 font-medium leading-6 text-zinc-900 dark:text-zinc-100">
              {formatEventVenue(event)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-zinc-100/80 px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-white/8 dark:text-zinc-300">
            <Users size={14} />
            <span>{formatEventAvailability(event)}</span>
          </div>

          {isSelected ? (
            <span className="rounded-full bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
              On map
            </span>
          ) : null}
        </div>
      </CardBody>

      <CardFooter className="px-5 pb-5 pt-5">
        <Button
          as={Link}
          to={`/events/${event.id}`}
          radius="full"
          className="h-11 w-full bg-zinc-950 text-white shadow-sm transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:group-hover:bg-zinc-200"
          endContent={<ArrowRight size={15} />}
        >
          View details
        </Button>
      </CardFooter>
    </Card>
  );
}
