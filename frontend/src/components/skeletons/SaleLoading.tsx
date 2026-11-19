import { Skeleton } from "@/components/ui/skeleton";

interface SaleLoadingProps {
  isUrdu: boolean;
  printingEnabled: boolean;
}

const SaleLoading = ({ isUrdu, printingEnabled }: SaleLoadingProps) => {
  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-5xl space-y-4 pb-6 sm:space-y-6"
    >
      {/* Sale Page Header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

          <div className="min-w-0 space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>

        {/* Actions - Match SalePageHeader */}
        <div
          className={`grid gap-2 sm:flex ${
            printingEnabled ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {/* Refresh */}
          <Skeleton className="h-11 w-full rounded-xl sm:w-12" />

          {printingEnabled && (
            <>
              {/* Print */}
              <Skeleton className="h-11 w-full rounded-xl sm:w-24" />

              {/* Generate PDF */}
              <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
            </>
          )}

          {/* WhatsApp */}
          <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
        </div>
      </div>

      {/* Invoice Content */}
      <div className="space-y-4 sm:space-y-5">
        {/* Shop Header */}
        <section className="rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </div>

          <div className="mt-4 border-t border-border pt-4 sm:mt-5">
            <Skeleton className="mx-auto h-6 w-36" />
            <Skeleton className="mx-auto mt-2 h-4 w-28" />
          </div>
        </section>

        {/* Bill and Customer Information */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {/* Bill Information */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="mb-4 h-5 w-32" />

            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </section>

          {/* Customer Information */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="mb-4 h-5 w-36" />

            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Furniture Items */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>

          {/* Mobile Item Cards */}
          <div className="divide-y divide-border sm:hidden">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>

                <div className="rounded-lg bg-muted/60 p-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4 w-36" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Item Table */}
          <div className="hidden overflow-x-auto sm:block">
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />

              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </section>

        {/* Payment History and Bill Summary */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {/* Payment History */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="mb-4 h-5 w-36" />

            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 border-b border-border pb-3"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>

                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </section>

          {/* Bill Summary */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="mb-4 h-5 w-32" />

            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Invoice Footer */}
        <section className="rounded-2xl border border-border bg-card p-4 text-center sm:p-5">
          <Skeleton className="mx-auto h-5 w-44 max-w-full" />
          <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full" />
        </section>
      </div>
    </div>
  );
};

export default SaleLoading;
