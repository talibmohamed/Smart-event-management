import { Card, CardBody, Skeleton } from "@heroui/react";

function SkeletonLine({ className = "" }) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

function SkeletonBox({ className = "" }) {
  return <Skeleton className={`rounded-2xl ${className}`} />;
}

export function EventCardSkeleton() {
  return (
    <Card className="w-full overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/76 shadow-[0_18px_55px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="p-3 pb-0">
        <SkeletonBox className="h-48 w-full rounded-[1.35rem]" />
      </div>
      <CardBody className="gap-5 px-5 pb-5 pt-5">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-3/4" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-2/3" />
        </div>
        <div className="space-y-3 border-y border-zinc-200/70 py-4 dark:border-white/10">
          <SkeletonLine className="h-4 w-2/3" />
          <SkeletonLine className="h-4 w-5/6" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="h-9 w-36" />
          <SkeletonLine className="h-9 w-24" />
        </div>
        <SkeletonLine className="h-11 w-full" />
      </CardBody>
    </Card>
  );
}

export function EventGridSkeleton({ count = 4 }) {
  return (
    <div className="columns-1 gap-6 md:columns-2 lg:columns-1 xl:columns-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="mb-6 break-inside-avoid">
          <EventCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function MapPanelSkeleton() {
  return (
    <Card className="h-full min-h-0 w-full rounded-none border-0 bg-white/84 shadow-none dark:bg-white/[0.04]">
      <CardBody className="h-full min-h-0 w-full p-4">
        <SkeletonBox className="h-full min-h-0 w-full rounded-[1.5rem]" />
      </CardBody>
    </Card>
  );
}

export function StatCardsSkeleton({ count = 3 }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <CardBody className="gap-3 px-5 py-4">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-8 w-16" />
          </CardBody>
        </Card>
      ))}
    </section>
  );
}

export function DashboardEventSkeleton({ count = 2 }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <CardBody className="gap-5 p-6">
            <div className="flex items-start gap-3">
              <SkeletonBox className="h-20 w-24 shrink-0" />
              <div className="flex-1 space-y-3">
                <SkeletonLine className="h-6 w-3/4" />
                <SkeletonLine className="h-4 w-1/2" />
              </div>
              <SkeletonLine className="h-8 w-20" />
            </div>
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-2/3" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonBox className="h-20 w-full" />
              <SkeletonBox className="h-20 w-full" />
              <SkeletonBox className="h-20 w-full sm:col-span-2" />
            </div>
            <div className="flex flex-wrap gap-3">
              <SkeletonLine className="h-10 w-20" />
              <SkeletonLine className="h-10 w-24" />
              <SkeletonLine className="h-10 w-28" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function BookingCardSkeleton({ count = 2 }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="w-full overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/76 shadow-[0_18px_55px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-white/[0.045]"
        >
          <div className="p-3 pb-0">
            <SkeletonBox className="h-48 w-full rounded-[1.35rem]" />
          </div>
          <CardBody className="gap-5 px-5 pb-5 pt-5">
            <SkeletonLine className="h-7 w-3/4" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-2/3" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonBox className="h-20 w-full" />
              <SkeletonBox className="h-20 w-full" />
              <SkeletonBox className="h-28 w-full sm:col-span-2" />
            </div>
            <div className="flex flex-wrap gap-3">
              <SkeletonLine className="h-11 w-28" />
              <SkeletonLine className="h-11 w-32" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-72 w-full rounded-[1.75rem] md:h-96" />
      <SkeletonBox className="h-44 w-full rounded-[1.75rem]" />
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-11/12" />
        <SkeletonLine className="h-4 w-2/3" />
      </div>
      <SkeletonBox className="h-80 w-full rounded-[1.75rem]" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-24 w-full" />
      </div>
    </div>
  );
}

export function EventFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-2/3" />
      </div>
      <SkeletonBox className="h-56 w-full rounded-[1.5rem]" />
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBox key={index} className="h-16 w-full" />
        ))}
      </div>
      <SkeletonBox className="h-40 w-full" />
      <SkeletonBox className="h-72 w-full rounded-[1.5rem]" />
      <div className="flex justify-end gap-3">
        <SkeletonLine className="h-11 w-24" />
        <SkeletonLine className="h-11 w-32" />
      </div>
    </div>
  );
}

export function TicketPageSkeleton() {
  return (
    <div className="space-y-8">
      <SkeletonBox className="h-48 w-full rounded-[2rem]" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-24 w-full md:col-span-2" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card
            key={index}
            className="border border-zinc-200/80 bg-white/88 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
          >
            <CardBody className="gap-6 p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <SkeletonLine className="h-7 w-20" />
                  <SkeletonLine className="h-5 w-40" />
                  <SkeletonLine className="h-8 w-48" />
                </div>
                <SkeletonBox className="h-48 w-48" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SkeletonBox className="h-20 w-full" />
                <SkeletonBox className="h-20 w-full" />
                <SkeletonBox className="h-24 w-full sm:col-span-2" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AttendeesSkeleton({ count = 4 }) {
  return (
    <section className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="border border-zinc-200/80 bg-white/84 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <CardBody className="gap-4 p-5">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_1.4fr]">
              <div className="space-y-2">
                <SkeletonLine className="h-5 w-36" />
                <SkeletonLine className="h-4 w-48" />
              </div>
              <SkeletonLine className="h-5 w-36" />
              <div className="space-y-2">
                <SkeletonLine className="h-7 w-24" />
                <SkeletonLine className="h-7 w-20" />
              </div>
              <div className="space-y-2">
                <SkeletonLine className="h-5 w-20" />
                <SkeletonLine className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <SkeletonBox className="h-14 w-full" />
                <SkeletonBox className="h-14 w-full" />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </section>
  );
}

export function BookingStatusSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-64 w-full rounded-[1.75rem] md:h-80" />
      <SkeletonBox className="h-44 w-full rounded-[1.75rem]" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-24 w-full" />
        <SkeletonBox className="h-28 w-full md:col-span-3" />
      </div>
      <div className="flex gap-3">
        <SkeletonLine className="h-11 w-36" />
        <SkeletonLine className="h-11 w-28" />
      </div>
    </div>
  );
}
