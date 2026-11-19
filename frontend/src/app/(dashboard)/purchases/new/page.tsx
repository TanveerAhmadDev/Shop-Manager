"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FilePenLine } from "lucide-react";

import ManualPurchaseForm from "../components/manual-purchase-form";
import CsvPurchaseImport from "../components/csv-purchase-import";

type PurchaseMethod = "manual" | "csv";

export default function NewPurchasePage() {
  const [method, setMethod] = useState<PurchaseMethod | null>(null);

  if (method === "manual") {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          type="button"
          onClick={() => setMethod(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={17} />
          Back to purchase options
        </button>

        <ManualPurchaseForm />
      </div>
    );
  }

  if (method === "csv") {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          type="button"
          onClick={() => setMethod(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={17} />
          Back to purchase options
        </button>

        <CsvPurchaseImport />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchases"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent"
          aria-label="Back to purchases"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create New Purchase
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose how you want to record your purchase.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("manual")}
          className="group rounded-xl border border-border bg-card p-6 text-left transition hover:border-primary hover:bg-accent/50"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FilePenLine size={25} />
          </div>

          <h2 className="text-lg font-semibold text-foreground">
            Manual Entry
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add products, select suppliers, enter quantities and prices
            manually.
          </p>

          <span className="mt-5 inline-block text-sm font-semibold text-primary">
            Create manually →
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMethod("csv")}
          className="group rounded-xl border border-border bg-card p-6 text-left transition hover:border-primary hover:bg-accent/50"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet size={25} />
          </div>

          <h2 className="text-lg font-semibold text-foreground">Import CSV</h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Upload a spreadsheet containing multiple products and purchase
            details.
          </p>

          <span className="mt-5 inline-block text-sm font-semibold text-primary">
            Import from CSV →
          </span>
        </button>
      </div>
    </div>
  );
}
