"use client";

import Link from "next/link";
import type { NewSaleActionsProps } from "./types";

const NewSaleActions = ({
  isUrdu,
  submitting,
  itemsCount,
  isPaymentInvalid,
  total,
  formatMoney,
}: NewSaleActionsProps) => {
  const isSubmitDisabled = submitting || itemsCount === 0 || isPaymentInvalid;

  return (
    <>
      <div className="hidden justify-end gap-3 sm:flex">
        <Link
          href="/sales"
          className="flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          {isUrdu ? "منسوخ کریں" : "Cancel"}
        </Link>

        <button
          type="submit"
          disabled={submitting || isPaymentInvalid}
          className="flex min-h-12 min-w-40 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? isUrdu
              ? "بل بنایا جا رہا ہے..."
              : "Creating Bill..."
            : isUrdu
              ? "بل بنائیں"
              : "Create Bill"}
        </button>
      </div>

      {/* STICKY MOBILE ACTION BAR */}
      <div className="sticky bottom-0 z-40 -mx-3 border-t border-border bg-background/95 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {isUrdu ? "کل بل" : "Bill Total"}
            </p>
            <p className="truncate text-lg font-bold text-foreground" dir="ltr">
              {formatMoney(total)}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || isPaymentInvalid}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? isUrdu
                ? "بل بنایا جا رہا ہے..."
                : "Creating Bill..."
              : isUrdu
                ? "بل بنائیں"
                : "Create Bill"}
          </button>
        </div>

        <Link
          href="/sales"
          className="mt-2 flex min-h-10 items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {isUrdu ? "منسوخ کریں" : "Cancel"}
        </Link>
      </div>
    </>
  );
};

export default NewSaleActions;
