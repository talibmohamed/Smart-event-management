import { Card, CardBody, Chip } from "@heroui/react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

const privacySections = [
  {
    title: "Information We Collect",
    content:
      "Quickseat collects the account details needed to use the platform, such as name, email address, role, event bookings, and event management activity. Organizers may also provide event information such as title, description, address, city, date, price, capacity, and cover image.",
  },
  {
    title: "How We Use Information",
    content:
      "We use information to authenticate users, display events, process bookings, support payments, manage event operations, improve platform reliability, and send account or event-related messages when required.",
  },
  {
    title: "Payments",
    content:
      "Paid booking checkout is handled through Stripe. Quickseat does not store full card numbers or sensitive payment credentials. Payment status is stored so bookings can be confirmed, cancelled, or retried.",
  },
  {
    title: "Access And Security",
    content:
      "Access is protected by JWT authentication and role-based permissions. Attendees, organizers, and admins have different capabilities. Organizers can manage only their own events unless an admin action is required.",
  },
  {
    title: "Data Sharing",
    content:
      "We do not sell personal data. Data may be shared with service providers that support core platform features, including database hosting, email delivery, image storage, and payment processing.",
  },
  {
    title: "Your Choices",
    content:
      "Users can update account access through authentication flows, cancel eligible bookings, and contact the platform owner for account or data questions related to this university project.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 md:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/72 p-6 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(139,92,246,0.14),transparent_32%)]" />

        <div className="relative">
          <Chip
            variant="flat"
            className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
            startContent={<ShieldCheck size={14} />}
          >
            Legal
          </Chip>

          <div className="mt-7 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400 md:text-base md:leading-8">
              This policy explains how Quickseat handles user and event data for the event
              management platform. It is written for product clarity and should be reviewed before
              any real public deployment.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Last updated: April 13, 2026
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5">
        {privacySections.map((section) => (
          <Card
            key={section.title}
            className="border border-zinc-200/80 bg-white/74 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
          >
            <CardBody className="gap-3 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sky-600 dark:border-white/10 dark:bg-white/8 dark:text-sky-300">
                  <LockKeyhole size={18} />
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">{section.content}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
