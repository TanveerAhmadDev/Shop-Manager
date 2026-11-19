"use client";

import { useLanguage } from "@/context/language-context";

export default function SalesSkeleton() {
  const { isUrdu } = useLanguage();

  return (
    <div dir={isUrdu ? "rtl" : "ltr"} className="space-y-6 animate-pulse">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted" />
        </div>

        <div className="h-10 w-28 rounded-lg bg-muted" />
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-10 rounded-lg bg-muted md:col-span-2" />
          <div className="h-10 rounded-lg bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="h-3 w-32 rounded bg-muted" />

          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-muted" />
            <div className="h-9 w-24 rounded-lg bg-muted" />
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table dir="ltr" className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {[
                  "Bill",
                  "Customer",
                  "Date",
                  "Total",
                  "Paid",
                  "Balance",
                  "Status",
                  "Action",
                ].map((item) => (
                  <th key={item} className="px-5 py-4">
                    <div className="h-3 w-14 rounded bg-muted-foreground/20" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {Array.from({ length: 7 }).map((_, index) => (
                <tr key={index}>
                  {/* Bill */}
                  <td className="px-5 py-5">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-5">
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-5">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Total */}
                  <td className="px-5 py-5">
                    <div className="ml-auto h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Paid */}
                  <td className="px-5 py-5">
                    <div className="ml-auto h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Balance */}
                  <td className="px-5 py-5">
                    <div className="ml-auto h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Status and Return */}
                  <td className="px-5 py-5">
                    <div className="space-y-2">
                      <div className="h-6 w-20 rounded-full bg-muted" />
                      {index % 3 === 0 && (
                        <>
                          <div className="h-6 w-24 rounded-full bg-muted" />
                          <div className="h-3 w-16 rounded bg-muted" />
                        </>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-5">
                    <div className="ml-auto h-9 w-20 rounded-lg bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="divide-y divide-border md:hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-3 p-4">
              {/* Bill and Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>

                <div className="space-y-2">
                  <div className="h-6 w-20 rounded-full bg-muted" />
                  {index % 3 === 0 && (
                    <div className="h-6 w-24 rounded-full bg-muted" />
                  )}
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-2 rounded-lg bg-muted/40 px-3 py-3">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-24 rounded bg-muted" />
                  </div>
                ))}

                <div className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-3">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              </div>

              {/* Return Details */}
              {index % 3 === 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              )}

              {/* View Details */}
              <div className="h-10 w-full rounded-lg bg-muted" />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="h-3 w-24 rounded bg-muted" />

          <div className="flex gap-2">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="h-9 w-9 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
