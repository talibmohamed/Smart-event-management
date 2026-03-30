import { Card, CardBody } from "@heroui/react"
import { useAuth } from "../context/AuthContext"

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <Card className="border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
        <CardBody className="gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm font-medium text-primary">
            Signed in as {user?.first_name} {user?.last_name}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Track registrations, revenue, and event activity from one overview.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
