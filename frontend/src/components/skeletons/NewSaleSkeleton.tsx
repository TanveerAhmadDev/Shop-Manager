import { Skeleton } from "@/components/ui/skeleton";

interface NewSaleSkeletonProps {
  isUrdu: boolean;
}

const NewSaleSkeleton = ({ isUrdu }: NewSaleSkeletonProps) => {
  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      className="mx-auto max-w-5xl space-y-4 pb-4 sm:space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />

        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>

      {/* Customer Section */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>

        {/* Existing / New Customer buttons */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        {/* Customer selector */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </section>

      {/* Furniture Section */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-60 max-w-full" />
        </div>

        {/* Barcode scanner and model number */}
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-lg" />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg sm:w-32" />
          </div>
        </div>

        {/* Empty furniture state */}
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
          <Skeleton className="mx-auto mb-3 size-9 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-40" />
          <Skeleton className="mx-auto mt-2 h-3 w-56 max-w-full" />
        </div>
      </section>

      {/* Payment and Bill Summary */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>

        {/* Discount and Tax */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>

        {/* Payment amount */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Payment method and reference */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>

        {/* Bill totals */}
        <div className="mt-5 space-y-4 rounded-xl bg-muted/40 p-4">
          <Skeleton className="h-5 w-32" />

          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Notes */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-10" />
        </div>
      </section>

      {/* Desktop Actions */}
      <div className="hidden justify-end gap-3 sm:flex">
        <Skeleton className="h-12 w-28 rounded-lg" />
        <Skeleton className="h-12 w-40 rounded-lg" />
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="sticky bottom-0 z-40 -mx-3 border-t border-border bg-background/95 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>

          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default NewSaleSkeleton;
