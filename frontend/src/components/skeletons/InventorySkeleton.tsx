"use client";

import { Boxes, Package } from "lucide-react";

export default function InventorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-72 max-w-full rounded bg-muted" />
        </div>

        <div className="h-10 w-28 rounded-lg bg-muted" />
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
        <div className="h-4 w-4 rounded-full bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted" />
      </div>

      {/* Inventory count cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted" />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <Boxes className="h-6 w-6 text-muted-foreground/30" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted" />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <Package className="h-6 w-6 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-10 flex-1 rounded-lg bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted sm:w-48" />
      </div>

      {/* Inventory table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {[
                  "Model Number",
                  "Product",
                  "Category",
                  "Specifications",
                  "Cost Price",
                  "Status",
                  "Added Date",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left">
                    <div className="h-3 w-20 rounded bg-muted-foreground/20" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {Array.from({ length: 7 }).map((_, index) => (
                <tr key={index}>
                  {/* Model Number */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  {/* Product */}
                  <td className="px-4 py-5">
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </td>

                  {/* Specifications */}
                  <td className="px-4 py-5">
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                  </td>

                  {/* Cost Price */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-5">
                    <div className="h-6 w-20 rounded-full bg-muted" />
                  </td>

                  {/* Added Date */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-40 rounded bg-muted" />

          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-lg bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-9 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
