"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Eye,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

interface Customer {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  email: string | null;
  address: string | null;
  total_purchases: number | string;
  total_spent: number | string;
  total_paid: number | string;
  outstanding_balance: number | string;
}

interface CustomersResponse {
  success: boolean;
  message: string;
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const money = (value: number | string) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomers = useCallback(async () => {
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

      const response = await apiRequest<CustomersResponse>(
        `/customers?${params.toString()}`,
      );

      setCustomers(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
            <Users className="h-6 w-6 text-foreground" />

            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customers, purchases, and outstanding balances.
          </p>
        </div>

        <Link
          href="/customers/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Link>
      </div>

      {/* Total customers */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total Customers</p>

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
            placeholder="Search by customer name, phone or email..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
          />
        </div>

        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
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

      {/* Customers table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Purchases</th>
                <th className="px-5 py-4 font-semibold">Total Spent</th>
                <th className="px-5 py-4 font-semibold">Balance Due</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users className="mx-auto mb-3 h-9 w-9 text-slate-300" />

                    <p className="font-medium text-foreground">
                      No customers found
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Add your first customer to start managing customer
                      records.
                    </p>

                    <Link
                      href="/customers/new"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Customer
                    </Link>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="transition hover:bg-muted">
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {customer.customer_name}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      {customer.customer_phone ? (
                        <div className="flex items-center gap-2 text-foreground">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {customer.customer_phone}
                        </div>
                      ) : (
                        <span className="text-slate-400">No phone</span>
                      )}

                      {customer.email && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                    </td>

                    {/* Purchases */}
                    <td className="px-5 py-4 text-foreground">
                      {customer.total_purchases ?? 0}
                    </td>

                    {/* Total spent */}
                    <td className="px-5 py-4 font-medium text-foreground">
                      {money(customer.total_spent)}
                    </td>

                    {/* Outstanding balance */}
                    <td className="px-5 py-4">
                      <span
                        className={
                          Number(customer.outstanding_balance) > 0
                            ? "font-semibold text-red-600"
                            : "font-medium text-green-600"
                        }
                      >
                        {money(customer.outstanding_balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/customers/${customer.id}`}
                          title="View customer"
                          className="rounded-lg border border-border p-2 text-muted-foreground bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/customers/${customer.id}/edit`}
                          title="Edit customer"
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
        {!loading && customers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {Math.max(totalPages, 1)} · {total} customers
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
