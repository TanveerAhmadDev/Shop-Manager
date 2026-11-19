"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Package,
  ShoppingCart,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import type { Purchase, PurchasesResponse } from "@/types/purchases";
import PurchasesSkeleton from "@/components/skeletons/PurchasesSkeleton";

const money = (value: number | string) =>
  `Rs. ${Number(value).toLocaleString("en-PK")}`;

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchPurchases() {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });

      if (from) query.set("from", from);
      if (to) query.set("to", to);

      const result = await apiRequest<PurchasesResponse>(
        `/purchases?${query.toString()}`,
      );

      setPurchases(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load purchases.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPurchases();
  }, [page, search, from, to]);

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  const inputClass =
    "h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

  const secondaryButtonClass =
    "flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

  if (loading) {
    return <PurchasesSkeleton />;
  }
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage supplier purchases and incoming inventory.
          </p>
        </div>

        <Link
          href="/purchases/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={17} />
          New Purchase
        </Link>
      </div>

      {/* Total Purchases */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Package size={22} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <h2 className="text-2xl font-bold text-foreground">{total}</h2>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            type="text"
            placeholder="Search purchase number or suppliers..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
            className={`${inputClass} w-full pl-10`}
          />
        </div>

        <input
          type="date"
          value={from}
          onChange={(e) => handleFilterChange(setFrom, e.target.value)}
          className={inputClass}
        />

        <input
          type="date"
          value={to}
          onChange={(e) => handleFilterChange(setTo, e.target.value)}
          className={inputClass}
        />

        <button
          type="button"
          onClick={() => void fetchPurchases()}
          disabled={loading}
          className={secondaryButtonClass}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Purchases Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Purchase History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Purchase No.</th>
                <th className="px-5 py-3">Suppliers</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <ShoppingCart
                        className="mb-3 text-muted-foreground"
                        size={40}
                      />

                      <p className="font-medium text-foreground">
                        No purchases found.
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Add your first purchase to start tracking your stock.
                      </p>

                      <Link
                        href="/purchases/new"
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition bg-primary text-primary-foreground hover:bg-primary/90`}
                      >
                        <Plus size={18} />
                        Add Purchase
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {purchase.purchase_number}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        {purchase.suppliers?.length > 0 ? (
                          purchase.suppliers.map((supplier) => (
                            <div key={supplier.id}>
                              <p className="font-medium text-foreground">
                                {supplier.supplier_name}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {supplier.phone || "No phone"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div>
                            <p className="font-medium text-foreground">
                              {purchase.supplier_name || "No supplier"}
                            </p>
                          </div>
                        )}

                        {Number(purchase.supplier_count) > 1 && (
                          <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {purchase.supplier_count} suppliers
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(purchase.purchase_date).toLocaleDateString(
                        "en-PK",
                      )}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {purchase.total_quantity} units
                      <p className="text-xs text-muted-foreground">
                        {purchase.total_lines} product types
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-foreground">
                      {money(purchase.total_amount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          purchase.status === "received"
                            ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                            : purchase.status === "cancelled"
                              ? "border-destructive/20 bg-destructive/10 text-destructive"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/purchases/${purchase.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
                      >
                        <Eye size={15} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && purchases.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} purchases)
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className={`${secondaryButtonClass} px-3`}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages}
                className={`${secondaryButtonClass} px-3`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
