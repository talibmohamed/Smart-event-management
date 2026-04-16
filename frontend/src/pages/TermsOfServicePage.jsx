import { Card, CardBody, Chip } from "@heroui/react";
import { BadgeCheck, FileText } from "lucide-react";

const termsSections = [
  {
    title: "Use Of The Platform",
    content:
      "Quickseat provides tools for browsing, booking, creating, and managing events. Users agree to provide accurate information and use the platform only for lawful event-related activity.",
  },
  {
    title: "Accounts And Roles",
    content:
      "Platform access is based on user roles. Attendees can browse and book events. Organizers can create and manage their own events. Admins can supervise platform activity. Users must not attempt to bypass role restrictions.",
  },
  {
    title: "Event Management",
    content:
      "Organizers are responsible for the accuracy of event titles, descriptions, addresses, dates, prices, capacity, and images. Quickseat may restrict or remove content that is incorrect, unsafe, or inappropriate.",
  },
  {
    title: "Bookings And Payments",
    content:
      "Free bookings may be confirmed immediately. Paid bookings are processed through Stripe Checkout and are confirmed only after backend payment confirmation. Pending payments do not guarantee a reserved seat.",
  },
  {
    title: "Cancellations",
    content:
      "Users may cancel eligible bookings when supported by the platform. Cancelled, expired, or failed payment states may prevent access to an event reservation.",
  },
  {
    title: "Limitations",
    content:
      "Quickseat is a university engineering project. It should not be treated as a fully audited commercial service without additional legal, security, privacy, and operational review.",
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 md:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/72 p-6 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_100%_20%,rgba(139,92,246,0.14),transparent_32%)]" />

        <div className="relative">
          <Chip
            variant="flat"
            className="border border-zinc-200 bg-white/85 text-zinc-700 dark:border-white/10 dark:bg-white/8 dark:text-zinc-200"
            startContent={<FileText size={14} />}
          >
            Legal
          </Chip>

          <div className="mt-7 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white md:text-6xl">
              Terms of Service
            </h1>
            <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400 md:text-base md:leading-8">
              These terms describe the expected use of Quickseat by attendees, organizers, and
              admins. They are suitable for the project interface and should be reviewed before a
              production launch.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Last updated: April 13, 2026
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5">
        {termsSections.map((section) => (
          <Card
            key={section.title}
            className="border border-zinc-200/80 bg-white/74 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
          >
            <CardBody className="gap-3 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sky-600 dark:border-white/10 dark:bg-white/8 dark:text-sky-300">
                  <BadgeCheck size={18} />
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
