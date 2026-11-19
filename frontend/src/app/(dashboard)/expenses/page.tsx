"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Wallet,
  User,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Trash2,
  Pencil,
  X,
  CalendarDays,
  TrendingDown,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

import type {
  Expense,
  ExpensesResponse,
  ExpenseSummary,
  ExpenseSummaryResponse,
} from "@/types/expenses";

// Format currency
const money = (value: number | string) => {
  const amount = Number(value);

  return `Rs. ${
    Number.isFinite(amount)
      ? amount.toLocaleString("en-PK", {
          maximumFractionDigits: 2,
        })
      : "0"
  }`;
};

// Format date
const formatDate = (date: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Get current month
const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Get month date range
const getMonthDateRange = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
};

// Format month
const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
};

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const secondaryButtonClass =
  "flex items-center justify-center gap-2 rounded-lg border border-border bg-background p-2.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [expenseType, setExpenseType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Delete confirmation
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 10;

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      const query = new URLSearchParams();

      query.set("page", String(page));
      query.set("limit", String(limit));
      query.set("start_date", startDate);
      query.set("end_date", endDate);

      if (search.trim()) {
        query.set("search", search.trim());
      }

      if (expenseType !== "all") {
        query.set("expense_type", expenseType);
      }

      const result = await apiRequest<ExpensesResponse>(
        `/expenses?${query.toString()}`,
      );

      setExpenses(result.data);
      setTotalExpenses(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [page, search, expenseType, selectedMonth]);

  // Fetch monthly summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      const result = await apiRequest<ExpenseSummaryResponse>(
        `/expenses/summary?start_date=${startDate}&end_date=${endDate}`,
      );

      setSummary(result.data);
    } catch (err) {
      toast.add({
        title: "Unable to load summary",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Delete expense
  async function handleDelete() {
    if (!selectedExpense || deleting) return;

    setDeleting(true);

    try {
      await apiRequest(`/expenses/${selectedExpense.id}`, {
        method: "DELETE",
      });

      toast.add({
        title: "Expense deleted",
        description: `${selectedExpense.title} was deleted successfully.`,
        type: "success",
      });

      setSelectedExpense(null);

      // If the deleted expense was the only item on this page,
      // move back one page when possible.
      if (expenses.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchExpenses();
      }

      await fetchSummary();
    } catch (err) {
      toast.add({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Unable to delete expense.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters =
    search !== "" ||
    expenseType !== "all" ||
    selectedMonth !== getCurrentMonth();

  function clearFilters() {
    setSearch("");
    setExpenseType("all");
    setSelectedMonth(getCurrentMonth());
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your shop spending.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month filter */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
            <CalendarDays size={17} className="text-muted-foreground" />

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                }
              }}
              className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              void Promise.all([fetchExpenses(), fetchSummary()]);
            }}
            disabled={loading || summaryLoading}
            className={secondaryButtonClass}
            title="Refresh"
            aria-label="Refresh expenses"
          >
            <RefreshCw
              size={18}
              className={loading || summaryLoading ? "animate-spin" : ""}
            />
          </button>

          {/* Add expense */}
          <Link
            href="/expenses/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={18} />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Monthly Summary */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {formatMonth(selectedMonth)} Summary
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Shop Expenses */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Shop Expenses
              </p>

              <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                <Wallet size={20} />
              </div>
            </div>

            <h3 className="mt-3 text-2xl font-bold text-foreground">
              {summaryLoading ? "..." : money(summary?.business_expenses ?? 0)}
            </h3>
          </div>

          {/* Personal Spending */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Personal Spending
              </p>

              <div className="rounded-lg bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400">
                <User size={20} />
              </div>
            </div>

            <h3 className="mt-3 text-2xl font-bold text-foreground">
              {summaryLoading
                ? "..."
                : money(summary?.personal_withdrawals ?? 0)}
            </h3>
          </div>

          {/* Total Spending */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Total Spending
              </p>

              <div className="rounded-lg bg-red-500/10 p-2.5 text-red-600 dark:text-red-400">
                <TrendingDown size={20} />
              </div>
            </div>

            <h3 className="mt-3 text-2xl font-bold text-red-600 dark:text-red-400">
              {summaryLoading ? "..." : money(summary?.total_spending ?? 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* Expense History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-semibold text-foreground">Expense History</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {totalExpenses} records in {formatMonth(selectedMonth)}
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search expenses..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={expenseType}
            onChange={(e) => {
              setExpenseType(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="all">All Expenses</option>
            <option value="business">Shop Expenses</option>
            <option value="personal">Personal Spending</option>
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading expenses...
          </div>
        ) : error ? (
          <div className="p-5 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>

            <button
              type="button"
              onClick={() => void fetchExpenses()}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt size={36} className="mx-auto text-muted-foreground/50" />

            <h3 className="mt-3 font-semibold text-foreground">
              No expenses found
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Try changing your filters or add a new expense.
            </p>

            <Link
              href="/expenses/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Plus size={16} />
              Add Expense
            </Link>
          </div>
        ) : (
          <>
            {/* Expenses Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Expense</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="transition hover:bg-muted/50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {expense.title}
                        </p>

                        {expense.description && (
                          <p className="mt-1 max-w-52 truncate text-xs text-muted-foreground">
                            {expense.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {expense.category_name || "Uncategorized"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            expense.expense_type === "business"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                          }`}
                        >
                          {expense.expense_type === "business"
                            ? "Shop"
                            : "Personal"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDate(expense.expense_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-foreground">
                        {money(expense.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/expenses/${expense.id}/edit`}
                            title="Edit"
                            aria-label="Edit expense"
                            className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          >
                            <Pencil size={15} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setSelectedExpense(expense)}
                            title="Delete"
                            aria-label="Delete expense"
                            className="rounded-lg border border-red-500/30 p-2 text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalExpenses)} of {totalExpenses}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                  className={secondaryButtonClass}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages || loading}
                  className={secondaryButtonClass}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deleting) setSelectedExpense(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Delete Expense
              </h2>

              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                disabled={deleting}
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {selectedExpense.title}
              </strong>
              ?
            </p>

            <p className="mt-2 font-semibold text-foreground">
              {money(selectedExpense.amount)}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
