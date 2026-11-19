"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

type ExpenseType = "business" | "personal";

type PaymentMethod = "cash" | "bank" | "easypaisa" | "jazzcash" | "other";

interface CreateExpenseResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
  };
}

// Get today's date in local time
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function NewExpensePage() {
  const router = useRouter();

  // Form fields
  const [expenseType, setExpenseType] = useState<ExpenseType>("business");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Submission
  const [saving, setSaving] = useState(false);

  // Submit expense
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate title
    if (!title.trim()) {
      toast.add({
        title: "Title required",
        description: "Please enter an expense title.",
        type: "error",
      });
      return;
    }

    // Validate amount
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.add({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        type: "error",
      });
      return;
    }

    // Validate date
    if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      toast.add({
        title: "Invalid date",
        description: "Please select a valid expense date.",
        type: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest<CreateExpenseResponse>("/expenses", {
        method: "POST",
        body: JSON.stringify({
          category_id: null,
          title: title.trim(),
          description: description.trim() || null,
          amount: numericAmount,
          expense_type: expenseType,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
        }),
      });

      toast.add({
        title: "Expense created successfully",
        description: result.message || "Your expense has been saved.",
        type: "success",
      });

      router.push("/expenses");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create expense.";

      toast.add({
        title: "Failed to create expense",
        description: message,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          aria-label="Back to expenses"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Expense</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Record a business expense or personal withdrawal.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          {/* Expense Type */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-foreground">
              Expense Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExpenseType("business")}
                className={`rounded-lg border p-4 text-left transition ${
                  expenseType === "business"
                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <p className="font-semibold text-foreground">
                  Business Expense
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Shop rent, electricity, transport, salaries, etc.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExpenseType("personal")}
                className={`rounded-lg border p-4 text-left transition ${
                  expenseType === "personal"
                    ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <p className="font-semibold text-foreground">
                  Personal Withdrawal
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Money taken from shop cash for personal use.
                </p>
              </button>
            </div>
          </div>

          {/* Accounting Information */}
          <div
            className={`mb-6 rounded-lg p-3 text-sm ${
              expenseType === "business"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
            }`}
          >
            {expenseType === "business"
              ? "Business expenses are included when calculating your shop's operating profit."
              : "Personal withdrawals reduce available shop cash but are not treated as business expenses."}
          </div>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Expense Title <span className="text-red-500">*</span>
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  expenseType === "business"
                    ? "e.g. Shop electricity bill"
                    : "e.g. Personal cash withdrawal"
                }
                maxLength={150}
                required
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about this expense..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Amount and Date */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>

                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="expenseDate"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Expense Date <span className="text-red-500">*</span>
                </label>

                <input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label
                htmlFor="paymentMethod"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Payment Method <span className="text-red-500">*</span>
              </label>

              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                required
                className={inputClass}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label
                htmlFor="referenceNumber"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Reference Number
              </label>

              <input
                id="referenceNumber"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID or receipt number"
                maxLength={100}
                className={inputClass}
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Useful for bank and mobile wallet transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/expenses"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={17} />
                Save Expense
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
