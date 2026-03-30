import { Button, Card, CardBody } from "@heroui/react"
import { Link } from "react-router-dom"

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center md:py-24">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Smart Event Management Platform
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Create, manage, discover and book events with a modern and responsive web application.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button as={Link} to="/events" color="primary" size="lg">
            Explore Events
          </Button>
          <Button as={Link} to="/create-event" variant="bordered" size="lg">
            Create Event
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 md:grid-cols-3">
        <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
          <CardBody className="gap-3">
            <h2 className="text-xl font-semibold">For Organizers</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Create events, manage attendees, monitor ticket sales and communicate with participants.
            </p>
          </CardBody>
        </Card>

        <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
          <CardBody className="gap-3">
            <h2 className="text-xl font-semibold">For Attendees</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Browse events, register, book tickets and receive reminders in one place.
            </p>
          </CardBody>
        </Card>

        <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
          <CardBody className="gap-3">
            <h2 className="text-xl font-semibold">For Admins</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Supervise users, events, sales and platform analytics through a dedicated dashboard.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
