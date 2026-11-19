"use client";

import { useLanguage } from "@/context/language-context";

export default function DashboardSkeleton() {
  const { isUrdu } = useLanguage();

  return (
    <div dir={isUrdu ? "rtl" : "ltr"} className="space-y-6 animate-pulse">
      {/* Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-8 w-32 rounded bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted" />
        </div>

        <div className="h-10 w-24 rounded-lg bg-muted" />
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            {/* Card Heading */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-28 rounded bg-muted" />

              <div className="h-10 w-10 rounded-lg bg-muted" />
            </div>

            {/* Amount */}
            <div className="mt-4 h-7 w-36 rounded bg-muted" />

            {/* Description */}
            <div className="mt-2 h-3 w-44 max-w-full rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              {/* Icon and Plus */}
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="h-4 w-4 rounded bg-muted" />
              </div>

              {/* Title and Description */}
              <div className="space-y-2">
                <div className="h-4 w-24 max-w-full rounded bg-muted" />
                <div className="h-3 w-28 max-w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Overview */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-6 w-40 rounded bg-muted" />

        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 max-w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
