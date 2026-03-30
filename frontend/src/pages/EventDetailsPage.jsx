import { Card, CardBody } from "@heroui/react"

export default function EventDetailsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
        <CardBody className="gap-3">
          <h1 className="text-3xl font-bold">Event Details</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Event information, schedules, and registration flow will live here.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
