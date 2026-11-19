"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Package,
  ShoppingBag,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { ProfitReport, ProfitReportResponse } from "@/types/reports";

// Get current month
const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Get selected month's date range
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

// Format money
const money = (value: number | string) => {
  const amount = Number(value);

  return `Rs. ${
    Number.isFinite(amount)
      ? amount.toLocaleString("en-PK", {
          maximumFractionDigits: 0,
        })
      : "0"
  }`;
};

export default function ProfitReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [report, setReport] = useState<ProfitReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch profit report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      const result = await apiRequest<ProfitReportResponse>(
        `/reports/profit?start_date=${startDate}&end_date=${endDate}`,
      );

      setReport(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load profit report.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const isProfit = Number(report?.net_operating_profit ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Report</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Check your monthly sales, expenses and profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-2 rounded-lg border border-border-white px-3 py-2.5">
            <CalendarDays size={18} className="text-muted-foreground" />

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                }
              }}
              className="text-sm font-medium text-foregroundd outline-none"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-lg border border-border2.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
            title="Refresh report"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Selected Month */}
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Showing report for
        </p>

        <h2 className="mt-1 text-xl font-bold text-foreground">
          {formatMonth(selectedMonth)}
        </h2>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border-white py-20 text-center text-sm text-muted-foreground">
          Loading monthly report...
        </div>
      ) : report ? (
        <>
          {/* Main Profit Card */}
          <div
            className={`rounded-2xl border p-6 sm:p-8 ${
              isProfit
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your Profit This Month
                </p>

                <h2
                  className={`mt-3 text-3xl font-bold sm:text-4xl ${
                    isProfit ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {money(report.net_operating_profit)}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {isProfit
                    ? "Your shop made a profit this month."
                    : "Your shop recorded a loss this month."}
                </p>
              </div>

              <div
                className={`rounded-full p-4 ${
                  isProfit
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isProfit ? (
                  <TrendingUp size={30} />
                ) : (
                  <TrendingDown size={30} />
                )}
              </div>
            </div>
          </div>

          {/* Simple Financial Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Items Sold */}
            <div className="rounded-xl border border-border-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Items Sold
                </p>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <Package size={22} />
                </div>
              </div>

              <h3 className="mt-4 text-2xl font-bold text-foreground">
                {Number(report.items_sold).toLocaleString("en-PK")}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Furniture items sold this month
              </p>
            </div>

            {/* Total Sales */}
            <div className="rounded-xl border border-border-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </p>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <ShoppingBag size={22} />
                </div>
              </div>

              <h3 className="mt-4 text-2xl font-bold text-foreground">
                {money(report.sales_revenue)}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                {report.total_sales_count} sales recorded
              </p>
            </div>

            {/* Total Expenses */}
            <div className="rounded-xl border border-border-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </p>

                <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                  <Wallet size={22} />
                </div>
              </div>

              <h3 className="mt-4 text-2xl font-bold text-foreground">
                {money(report.business_expenses)}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Shop expenses this month
              </p>
            </div>
          </div>

          {/* Simple Explanation */}
          <div className="rounded-xl border border-border-white p-5">
            <h3 className="font-semibold text-foreground">Monthly Summary</h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Total Sales</span>

                <span className="font-medium text-foreground">
                  {money(report.sales_revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Furniture Cost</span>

                <span className="font-medium text-red-600">
                  - {money(report.cost_of_goods_sold)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Shop Expenses</span>

                <span className="font-medium text-red-600">
                  - {money(report.business_expenses)}
                </span>
              </div>

              <div className="border-t border-border-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">
                    Final Profit
                  </span>

                  <span
                    className={`text-lg font-bold ${
                      isProfit ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {money(report.net_operating_profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border-white py-16 text-center text-sm text-muted-foreground">
          No report data available for this month.
        </div>
      )}
    </div>
  );
}
