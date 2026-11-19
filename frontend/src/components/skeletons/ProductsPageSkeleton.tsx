export default function ProductsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-md bg-muted" />
          <div className="h-4 w-64 max-w-full rounded-md bg-muted" />
        </div>

        <div className="h-10 w-32 rounded-lg bg-muted" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap">
        <div className="h-11 min-w-0 flex-1 rounded-lg bg-muted" />
        <div className="h-11 w-full rounded-lg bg-muted sm:w-40" />
        <div className="h-11 w-full rounded-lg bg-muted sm:w-44" />
        <div className="h-11 w-full rounded-lg bg-muted sm:w-28" />
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Table Heading */}
        <div className="flex items-center gap-2 border-b border-border p-5">
          <div className="h-5 w-5 rounded bg-muted" />
          <div className="h-5 w-36 rounded bg-muted" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Header */}
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Product",
                  "Category",
                  "Brand",
                  "Material",
                  "Color",
                  "Status",
                  "Action",
                ].map((column) => (
                  <th key={column} className="px-5 py-4">
                    <div className="h-3 w-16 rounded bg-muted-foreground/20" />
                  </th>
                ))}
              </tr>
            </thead>

            {/* Skeleton Rows */}
            <tbody className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-5 py-4">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="mt-2 h-3 w-44 rounded bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-4 w-24 rounded bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-4 w-20 rounded bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-4 w-16 rounded bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-6 w-16 rounded-full bg-muted" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="ml-auto h-9 w-20 rounded-lg bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="h-3 w-20 rounded bg-muted" />

          <div className="flex gap-2">
            <div className="h-9 w-20 rounded-lg bg-muted" />
            <div className="h-9 w-16 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
