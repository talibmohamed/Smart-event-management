import { Card, CardBody, Input, Textarea, Button } from "@heroui/react"

export default function CreateEventPage() {
  return (
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
          <CardBody className="gap-4">
            <h1 className="text-2xl font-bold">Create Event</h1>
            <Input label="Event Title" />
            <Input label="Category" />
            <Input label="Location" />
            <Input label="Date and Time" />
            <Input label="Capacity" type="number" />
            <Input label="Price (EUR)" type="number" />
            <Textarea label="Description" minRows={4} />
            <Button color="primary">Publish Event</Button>
          </CardBody>
        </Card>
      </div>
  )
}
