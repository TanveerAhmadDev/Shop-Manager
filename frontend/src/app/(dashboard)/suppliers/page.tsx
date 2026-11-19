"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Truck,
  Eye,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  total_purchases: number;
  total_purchase_amount: number | string;
  last_purchase_date: string | null;
}

interface SuppliersResponse {
  success: boolean;
  message: string;
  data: Supplier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const money = (value: number | string) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await apiRequest<SuppliersResponse>(
        `/suppliers?${params.toString()}`,
      );

      setSuppliers(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load suppliers.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Reset to first page when searching.
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-foregroundd" />
            <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your furniture suppliers and their purchase records.
          </p>
        </div>

        <Link
          href="/suppliers/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Link>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total Suppliers</p>
        <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by supplier name, phone or email..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
          />
        </div>

        <button
          onClick={fetchSuppliers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foregroundd hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Suppliers table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-semibold">Supplier</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Purchases</th>
                <th className="px-5 py-4 font-semibold">Total Amount</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Truck className="mx-auto mb-3 h-9 w-9 text-slate-300" />

                    <p className="font-medium text-foregroundd">
                      No suppliers found
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Add your first supplier to start recording purchases.
                    </p>

                    <Link
                      href="/suppliers/new"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Supplier
                    </Link>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="transition hover:bg-muted">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {supplier.supplier_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplier.email || "No email"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-foregroundd">
                        {supplier.contact_person || "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplier.phone || "No phone"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-foregroundd">
                      {supplier.total_purchases ?? 0}
                    </td>

                    <td className="px-5 py-4 font-medium text-foreground">
                      {money(supplier.total_purchase_amount)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          title="View supplier"
                          className="rounded-lg border border-border p-2 text-muted-foreground bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/suppliers/${supplier.id}/edit`}
                          title="Edit supplier"
                          className="rounded-lg border border-border p-2 text-muted-foreground bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && suppliers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {Math.max(totalPages, 1)} · {total} suppliers
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
