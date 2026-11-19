"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { useLanguage } from "@/context/language-context";
import type {
  SaleReturn,
  SaleReturnStatus,
  SaleReturnType,
  SaleReturnsResponse,
} from "@/types/sales";

export default function SaleReturnsPage() {
  const { isUrdu } = useLanguage();

  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [returnType, setReturnType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (returnType) params.set("return_type", returnType);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const result = await apiRequest<SaleReturnsResponse>(
        `/sales/returns?${params.toString()}`,
      );

      setReturns(result.data);
      setTotalPages(Math.max(1, result.pagination.totalPages));
      setTotal(result.pagination.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isUrdu
            ? "واپسیوں کی فہرست لوڈ نہیں ہو سکی۔"
            : "Unable to load sales returns.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, returnType, dateFrom, dateTo, isUrdu]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setReturnType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function formatCurrency(amount: number | string) {
    return `Rs. ${Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusStyle(value: SaleReturnStatus) {
    switch (value) {
      case "completed":
        return "bg-green-500/10 text-green-600";
      case "cancelled":
        return "bg-red-500/10 text-red-600";
      default:
        return "bg-amber-500/10 text-amber-600";
    }
  }

  function translateStatus(value: SaleReturnStatus) {
    if (!isUrdu) return value.charAt(0).toUpperCase() + value.slice(1);

    return value === "completed"
      ? "مکمل"
      : value === "cancelled"
        ? "منسوخ"
        : "زیر التواء";
  }

  function translateType(value: SaleReturnType) {
    if (!isUrdu) {
      return value === "refund" ? "Refund" : "Exchange";
    }

    return value === "refund" ? "رقم واپسی" : "تبدیلی";
  }

  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-7xl space-y-5 pb-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isUrdu ? "سیلز ریٹرنز" : "Sales Returns"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu
              ? "تمام واپسی کی درخواستیں دیکھیں اور منظم کریں۔"
              : "View and manage all furniture return requests."}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReturns}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {isUrdu ? "ریفریش" : "Refresh"}
        </button>
      </div>

      {/* Filters */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search
            size={18}
            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
              isUrdu ? "right-3" : "left-3"
            }`}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              isUrdu
                ? "ریٹرن نمبر، سیل، کسٹمر یا ماڈل تلاش کریں..."
                : "Search return, sale, customer or model..."
            }
            className={`w-full rounded-xl border border-border bg-background py-3 text-sm text-foreground outline-none focus:border-primary ${
              isUrdu ? "pr-10 pl-3" : "pl-10 pr-3"
            }`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background p-3 text-sm text-foreground"
          >
            <option value="">{isUrdu ? "تمام اسٹیٹس" : "All Statuses"}</option>
            <option value="pending">{isUrdu ? "زیر التواء" : "Pending"}</option>
            <option value="completed">{isUrdu ? "مکمل" : "Completed"}</option>
            <option value="cancelled">{isUrdu ? "منسوخ" : "Cancelled"}</option>
          </select>

          <select
            value={returnType}
            onChange={(e) => {
              setReturnType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background p-3 text-sm text-foreground"
          >
            <option value="">{isUrdu ? "تمام اقسام" : "All Types"}</option>
            <option value="refund">{isUrdu ? "رقم واپسی" : "Refund"}</option>
            <option value="exchange">{isUrdu ? "تبدیلی" : "Exchange"}</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            aria-label="Date from"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            aria-label="Date to"
          />
        </div>

        <div className="flex justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {total} {isUrdu ? "ریکارڈز ملے" : "records found"}
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {isUrdu ? "فلٹر صاف کریں" : "Clear Filters"}
          </button>
        </div>
      </section>

      {/* Return list */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
            <RefreshCw size={18} className="animate-spin" />
            {isUrdu ? "لوڈ ہو رہا ہے..." : "Loading returns..."}
          </div>
        ) : error ? (
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchReturns}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {isUrdu ? "دوبارہ کوشش کریں" : "Try Again"}
            </button>
          </div>
        ) : returns.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <RotateCcw size={32} className="text-muted-foreground" />
            <p className="font-semibold text-foreground">
              {isUrdu ? "کوئی ریٹرن نہیں ملا" : "No returns found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isUrdu
                ? "واپسی کی درخواستیں یہاں نظر آئیں گی۔"
                : "Return requests will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "ریٹرن نمبر" : "Return"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "اصل سیل" : "Original Sale"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "کسٹمر" : "Customer"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "قسم" : "Type"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "رقم" : "Amount"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "آئٹمز" : "Items"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "تاریخ" : "Date"}
                    </th>
                    <th className="p-4 text-start font-semibold">
                      {isUrdu ? "اسٹیٹس" : "Status"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {returns.map((item) => (
                    <tr key={item.id} className="transition hover:bg-muted/30">
                      <td className="p-4">
                        <Link
                          href={`/sales/returns/${item.id}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {item.return_number}
                        </Link>
                      </td>

                      <td className="p-4 font-medium text-foreground">
                        {item.sale_number || "—"}
                      </td>

                      <td className="p-4">
                        <p className="font-medium text-foreground">
                          {item.customer_name || "Walk-in Customer"}
                        </p>
                        {item.customer_phone && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.customer_phone}
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-foreground">
                        {translateType(item.return_type)}
                      </td>

                      <td className="p-4 font-semibold text-foreground">
                        {formatCurrency(item.return_total)}
                      </td>

                      <td className="p-4 text-foreground">{item.item_count}</td>

                      <td className="p-4 text-foreground">
                        {formatDate(item.return_date)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            item.status,
                          )}`}
                        >
                          {translateStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                {isUrdu ? "صفحہ" : "Page"} {page} / {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-border p-2 text-foreground hover:bg-muted disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-border p-2 text-foreground hover:bg-muted disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
