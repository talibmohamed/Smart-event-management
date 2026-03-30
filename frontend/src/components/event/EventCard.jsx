import { Card, CardHeader, CardBody, CardFooter, Button, Chip } from "@heroui/react"
import { MapPin, CalendarClock, Users } from "lucide-react"
import { Link } from "react-router-dom"

export default function EventCard({ event }) {
  return (
    <Card className="w-full border border-slate-200/80 bg-white/90 transition-colors dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="flex flex-col items-start gap-2">
        <div className="flex w-full items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{event.title}</h3>
          <Chip color={event.price > 0 ? "primary" : "success"} variant="flat">
            {event.price > 0 ? `${event.price} EUR` : "Free"}
          </Chip>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{event.category}</p>
      </CardHeader>

      <CardBody className="gap-3">
        <p className="text-sm">{event.description}</p>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <CalendarClock size={16} />
          <span>{event.date}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin size={16} />
          <span>{event.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Users size={16} />
          <span>{event.capacity} seats</span>
        </div>
      </CardBody>

      <CardFooter>
        <Button as={Link} to={`/events/${event.id}`} color="primary" className="w-full">
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
