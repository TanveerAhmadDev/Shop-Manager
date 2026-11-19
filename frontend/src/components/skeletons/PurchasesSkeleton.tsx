"use client";

import { Package } from "lucide-react";

export default function PurchasesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted" />
        </div>

        <div className="h-10 w-36 rounded-lg bg-muted" />
      </div>

      {/* Total Purchases */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Package size={22} className="text-muted-foreground/30" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center">
        <div className="h-11 min-w-0 flex-1 rounded-lg bg-muted" />
        <div className="h-11 w-full rounded-lg bg-muted md:w-40" />
        <div className="h-11 w-full rounded-lg bg-muted md:w-40" />
        <div className="h-11 w-full rounded-lg bg-muted md:w-28" />
      </div>

      {/* Purchase History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Table Heading */}
        <div className="border-b border-border px-5 py-4">
          <div className="h-5 w-36 rounded bg-muted" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            {/* Table Header */}
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Purchase No.",
                  "Suppliers",
                  "Date",
                  "Items",
                  "Total Amount",
                  "Status",
                  "Action",
                ].map((column) => (
                  <th key={column} className="px-5 py-3">
                    <div className="h-3 w-20 rounded bg-muted-foreground/20" />
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-border">
              {Array.from({ length: 7 }).map((_, index) => (
                <tr key={index}>
                  {/* Purchase Number */}
                  <td className="px-5 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  {/* Suppliers */}
                  <td className="px-5 py-5">
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />

                      {index % 3 === 0 && (
                        <div className="h-5 w-20 rounded-full bg-muted" />
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  {/* Items */}
                  <td className="px-5 py-5">
                    <div className="space-y-2">
                      <div className="h-4 w-16 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-5 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-5">
                    <div className="h-6 w-20 rounded-full bg-muted" />
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

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="h-4 w-40 rounded bg-muted" />

          <div className="flex gap-2">
            <div className="h-11 w-24 rounded-lg bg-muted" />
            <div className="h-11 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
