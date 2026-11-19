"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { SalesResponse, Sale } from "@/types/sales";
import { useLanguage } from "@/context/language-context";
import SalesSkeleton from "@/components/skeletons/SalesSkeleton";

const formatMoney = (value: number | string) =>
  `Rs. ${Number(value).toLocaleString("en-PK")}`;

export default function SalesPage() {
  const { isUrdu } = useLanguage();

  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const result = await apiRequest<SalesResponse>(
        `/sales?${params.toString()}`,
      );

      setSales(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isUrdu
            ? "فروخت کی معلومات حاصل نہیں ہو سکیں۔"
            : "Failed to load sales.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, from, to, isUrdu]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  function resetFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function translateStatus(status: string) {
    if (!isUrdu) return status;

    const translations: Record<string, string> = {
      completed: "مکمل",
      cancelled: "منسوخ",
      pending: "زیر التوا",
      refunded: "واپس کیا گیا",
    };

    return translations[status.toLowerCase()] || status;
  }

  function getStatusStyle(status: string) {
    const styles: Record<string, string> = {
      completed:
        "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400",
      cancelled:
        "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-400",
      pending:
        "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400",
      refunded:
        "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20 dark:text-blue-400",
    };

    return styles[status.toLowerCase()] || "bg-muted text-muted-foreground";
  }

  function getReturnStatusLabel(status: Sale["return_status"]) {
    const labels = {
      none: isUrdu ? "کوئی واپسی نہیں" : "No Return",
      partially_returned: isUrdu ? "جزوی واپسی" : "Partial Return",
      fully_returned: isUrdu ? "مکمل واپسی" : "Full Return",
    };

    return labels[status];
  }

  function getReturnStatusStyle(status: Sale["return_status"]) {
    const styles = {
      none: "bg-muted text-muted-foreground",
      partially_returned:
        "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400",
      fully_returned:
        "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20 dark:text-blue-400",
    };

    return styles[status];
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

  const secondaryButtonClass =
    "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

  if (loading) {
    return <SalesSkeleton />;
  }
  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      className="space-y-6"
    >
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isUrdu ? "فروخت" : "Sales"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu
              ? "گاہکوں کے بل اور ادائیگیوں کا ریکارڈ دیکھیں۔"
              : "Manage customer bills and payment history."}
          </p>
        </div>

        <Link
          href="/sales/new"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          <Plus size={18} />
          {isUrdu ? "نئی فروخت" : "New Sale"}
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
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
                  ? "بل نمبر، گاہک یا فون تلاش کریں..."
                  : "Search bill, customer or phone..."
              }
              className={`${inputClass} ${
                isUrdu ? "pr-10 pl-3" : "pl-10 pr-3"
              }`}
            />
          </div>

          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label={isUrdu ? "شروع کی تاریخ" : "From date"}
          />

          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label={isUrdu ? "آخری تاریخ" : "To date"}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {isUrdu
              ? `${total} فروخت کے ریکارڈ ملے`
              : `${total} sale records found`}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className={secondaryButtonClass}
            >
              {isUrdu ? "فلٹر ختم کریں" : "Clear filters"}
            </button>

            <button
              type="button"
              onClick={fetchSales}
              disabled={loading}
              className={secondaryButtonClass}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {isUrdu ? "تازہ کریں" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchSales}
            className="shrink-0 font-semibold underline underline-offset-4"
          >
            {isUrdu ? "دوبارہ کوشش کریں" : "Retry"}
          </button>
        </div>
      )}

      {/* Sales List */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            {isUrdu ? "فروخت کی معلومات لوڈ ہو رہی ہیں..." : "Loading sales..."}
          </div>
        ) : sales.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ShoppingCart
              size={36}
              className="mx-auto mb-3 text-muted-foreground/50"
            />

            <p className="font-semibold text-foreground">
              {isUrdu ? "کوئی فروخت نہیں ملی۔" : "No sales found."}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {isUrdu
                ? "فروخت ریکارڈ کرنے کے لیے نیا بل بنائیں۔"
                : "Create your first sale to get started."}
            </p>

            <Link
              href="/sales/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus size={16} />
              {isUrdu ? "نئی فروخت" : "Create Sale"}
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table dir="ltr" className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-4">{isUrdu ? "بل نمبر" : "Bill"}</th>
                    <th className="px-5 py-4">
                      {isUrdu ? "گاہک" : "Customer"}
                    </th>
                    <th className="px-5 py-4">{isUrdu ? "تاریخ" : "Date"}</th>
                    <th className="px-5 py-4 text-right">
                      {isUrdu ? "کل رقم" : "Total"}
                    </th>
                    <th className="px-5 py-4 text-right">
                      {isUrdu ? "وصول شدہ" : "Paid"}
                    </th>
                    <th className="px-5 py-4 text-right">
                      {isUrdu ? "بقایا" : "Balance"}
                    </th>
                    <th className="px-5 py-4">{isUrdu ? "حیثیت" : "Status"}</th>
                    <th className="px-5 py-4 text-center">
                      {isUrdu ? "تفصیل" : "Action"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-foreground">
                          {sale.sale_number}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {sale.customer_name ||
                            (isUrdu ? "نامعلوم گاہک" : "Walk-in Customer")}
                        </p>
                        <p
                          className="mt-0.5 text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {sale.phone ||
                            (isUrdu ? "فون نمبر موجود نہیں" : "No phone")}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {new Date(sale.sale_date).toLocaleDateString("en-PK")}
                      </td>

                      <td
                        className="whitespace-nowrap px-5 py-4 text-right font-semibold text-foreground"
                        dir="ltr"
                      >
                        {formatMoney(sale.total_amount)}
                      </td>

                      <td
                        className="whitespace-nowrap px-5 py-4 text-right font-medium text-green-700 dark:text-green-400"
                        dir="ltr"
                      >
                        {formatMoney(sale.paid_amount)}
                      </td>

                      <td
                        className="whitespace-nowrap px-5 py-4 text-right font-medium text-destructive"
                        dir="ltr"
                      >
                        {formatMoney(sale.remaining_balance)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(sale.status)}`}
                          >
                            {translateStatus(sale.status)}
                          </span>

                          {sale.return_status !== "none" && (
                            <div className="space-y-1">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getReturnStatusStyle(sale.return_status)}`}
                              >
                                {getReturnStatusLabel(sale.return_status)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {sale.returned_item_count}/
                                {sale.total_item_count}{" "}
                                {isUrdu ? "آئٹمز واپس" : "items returned"}
                              </p>
                              <p
                                className="text-xs font-medium text-muted-foreground"
                                dir="ltr"
                              >
                                {formatMoney(sale.returned_amount)}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
                        >
                          <Eye size={14} />
                          {isUrdu ? "تفصیل" : "Details"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-border md:hidden">
              {sales.map((sale) => (
                <div key={sale.id} className="space-y-3 p-4">
                  {/* Bill and Date */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {isUrdu ? "بل نمبر" : "Bill Number"}
                      </p>
                      <p className="mt-0.5 font-bold text-foreground" dir="ltr">
                        {sale.sale_number}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(sale.sale_date).toLocaleDateString("en-PK")}
                      </p>
                    </div>

                    <div className="flex max-w-[55%] flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(sale.status)}`}
                      >
                        {translateStatus(sale.status)}
                      </span>

                      {sale.return_status !== "none" && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium text-center ${getReturnStatusStyle(sale.return_status)}`}
                        >
                          {getReturnStatusLabel(sale.return_status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      {isUrdu ? "گاہک" : "Customer"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {sale.customer_name ||
                        (isUrdu ? "نامعلوم گاہک" : "Walk-in Customer")}
                    </p>
                    <p
                      className="mt-0.5 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {sale.phone ||
                        (isUrdu ? "فون نمبر موجود نہیں" : "No phone")}
                    </p>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isUrdu ? "کل رقم" : "Total Amount"}
                      </p>
                      <p
                        className="mt-1 text-sm font-bold text-foreground"
                        dir="ltr"
                      >
                        {formatMoney(sale.total_amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isUrdu ? "وصول شدہ" : "Paid"}
                      </p>
                      <p
                        className="mt-1 text-sm font-semibold text-green-700 dark:text-green-400"
                        dir="ltr"
                      >
                        {formatMoney(sale.paid_amount)}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        {isUrdu ? "باقی رقم" : "Remaining Balance"}
                      </span>
                      <span
                        className="text-sm font-bold text-destructive"
                        dir="ltr"
                      >
                        {formatMoney(sale.remaining_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Return Details */}
                  {sale.return_status !== "none" && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {isUrdu ? "واپس کیے گئے آئٹمز" : "Returned Items"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sale.returned_item_count}/{sale.total_item_count}{" "}
                          {isUrdu ? "آئٹمز" : "items"}
                        </p>
                      </div>
                      <p
                        className="text-sm font-semibold text-foreground"
                        dir="ltr"
                      >
                        {formatMoney(sale.returned_amount)}
                      </p>
                    </div>
                  )}

                  {/* Action */}
                  <Link
                    href={`/sales/${sale.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <Eye size={16} />
                    {isUrdu ? "فروخت کی تفصیل دیکھیں" : "View Sale Details"}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && sales.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              {isUrdu
                ? `صفحہ ${page} از ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-border p-2 text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isUrdu ? "پچھلا صفحہ" : "Previous page"}
              >
                {isUrdu ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-border p-2 text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isUrdu ? "اگلا صفحہ" : "Next page"}
              >
                {isUrdu ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
