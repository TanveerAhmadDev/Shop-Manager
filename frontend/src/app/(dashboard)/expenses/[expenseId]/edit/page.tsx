"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

// Expense types
type ExpenseType = "business" | "personal";

type PaymentMethod = "cash" | "bank" | "easypaisa" | "jazzcash" | "other";

// Expense interface
interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number | string;
  expense_type: ExpenseType;
  expense_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
}

// GET response
interface ExpenseResponse {
  success: boolean;
  message: string;
  data: Expense | { expense: Expense };
}

// PATCH response
interface UpdateExpenseResponse {
  success: boolean;
  message: string;
  data?: Expense;
}

// Get date in YYYY-MM-DD format using the browser's local timezone.
function getDateForInput(date: string) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date.slice(0, 10);
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Input styles
const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();

  const expenseId = params.expenseId as string;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("business");
  const [expenseDate, setExpenseDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Fetch expense details
  useEffect(() => {
    if (!expenseId) return;

    let cancelled = false;

    async function fetchExpense() {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest<ExpenseResponse>(
          `/expenses/${expenseId}`,
        );

        // Support both response formats:
        // data: { ...expense }
        // data: { expense: { ...expense } }
        const expense =
          "expense" in result.data ? result.data.expense : result.data;

        if (cancelled) return;

        setTitle(expense.title ?? "");
        setDescription(expense.description ?? "");
        setAmount(String(expense.amount ?? ""));
        setExpenseType(expense.expense_type);
        setExpenseDate(getDateForInput(expense.expense_date));
        setPaymentMethod(expense.payment_method ?? "cash");
        setReferenceNumber(expense.reference_number ?? "");
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load expense details.";

        setError(message);

        toast.add({
          title: "Unable to load expense",
          description: message,
          type: "error",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchExpense();

    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  // Update expense
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      toast.add({
        title: "Title required",
        description: "Please enter an expense title.",
        type: "error",
      });
      return;
    }

    const numericAmount = Number(amount);

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.add({
        title: "Invalid amount",
        description: "Please enter an amount greater than zero.",
        type: "error",
      });
      return;
    }

    if (!expenseDate) {
      toast.add({
        title: "Date required",
        description: "Please select the expense date.",
        type: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest<UpdateExpenseResponse>(
        `/expenses/${expenseId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            amount: numericAmount,
            expense_type: expenseType,
            expense_date: expenseDate,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || null,
          }),
        },
      );

      toast.add({
        title: "Expense updated",
        description: result.message || "Expense updated successfully.",
        type: "success",
      });

      router.push("/expenses");
    } catch (err) {
      toast.add({
        title: "Update failed",
        description:
          err instanceof Error ? err.message : "Unable to update expense.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          Loading expense...
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={17} />
          Back to Expenses
        </Link>

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="font-semibold text-red-600 dark:text-red-400">
            Unable to load expense
          </h2>

          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Back to expenses"
        >
          <ArrowLeft size={19} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Expense</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Update your expense details.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        {/* Expense Information */}
        <div>
          <h2 className="font-semibold text-foreground">Expense Information</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Update the basic information about this expense.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Expense Title */}
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>
              Expense Title <span className="text-red-500">*</span>
            </label>

            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shop Electricity Bill"
              className={inputClass}
              maxLength={150}
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={labelClass}>
              Amount (Rs.) <span className="text-red-500">*</span>
            </label>

            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={inputClass}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          {/* Expense Date */}
          <div>
            <label htmlFor="expenseDate" className={labelClass}>
              Expense Date <span className="text-red-500">*</span>
            </label>

            <input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Expense Type */}
          <div>
            <label htmlFor="expenseType" className={labelClass}>
              Expense Type <span className="text-red-500">*</span>
            </label>

            <select
              id="expenseType"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
              className={inputClass}
            >
              <option value="business">Shop Expense</option>
              <option value="personal">Personal Spending</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className={labelClass}>
              Payment Method <span className="text-red-500">*</span>
            </label>

            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethod)
              }
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference Number */}
          <div className="sm:col-span-2">
            <label htmlFor="referenceNumber" className={labelClass}>
              Reference Number
            </label>

            <input
              id="referenceNumber"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional transaction or receipt number"
              className={inputClass}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this expense..."
              rows={4}
              maxLength={1000}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/expenses"
            className="flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={17} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
