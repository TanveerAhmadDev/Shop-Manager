"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Power,
  Printer,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

// Shop returned by the backend.
interface Shop {
  id: string;
  shop_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  model_code_prefix: string | null;
  printing_enabled: boolean;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

// API response.
interface ShopsResponse {
  success: boolean;
  message: string;
  data: Shop[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AdminProfileResponse {
  success: boolean;
  data: {
    admin: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

export default function SystemAdminShopsPage() {
  const router = useRouter();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  // Search and filters.
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Pagination.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShops, setTotalShops] = useState(0);

  // Track which shop is being updated.
  const [updatingShopId, setUpdatingShopId] = useState<string | null>(null);
  const [updatingAction, setUpdatingAction] = useState<
    "status" | "printing" | null
  >(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Check System Admin authentication.
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        await apiRequest<AdminProfileResponse>("/system-admin/auth/me");

        if (mounted) {
          setCheckingAuth(false);
        }
      } catch {
        if (mounted) {
          router.replace("/system-admin/login");
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Fetch shops.
  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status,
      });

      if (appliedSearch) {
        params.set("search", appliedSearch);
      }

      const result = await apiRequest<ShopsResponse>(
        `/system-admin/shops?${params.toString()}`,
      );

      setShops(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalShops(result.pagination.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load shops.";

      setError(message);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, appliedSearch]);

  // Load shops after authentication.
  useEffect(() => {
    if (checkingAuth) return;

    fetchShops();
  }, [checkingAuth, fetchShops, refreshKey]);

  // Search form submission.
  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPage(1);
    setAppliedSearch(search.trim());
  }

  // Activate or deactivate a shop.
  async function handleStatusChange(shop: Shop) {
    const newStatus = !shop.is_active;

    const confirmed = window.confirm(
      newStatus
        ? `Are you sure you want to activate ${shop.shop_name}?`
        : `Are you sure you want to deactivate ${shop.shop_name}?`,
    );

    if (!confirmed) return;

    setUpdatingShopId(shop.id);
    setUpdatingAction("status");

    try {
      await apiRequest(`/system-admin/shops/${shop.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      toast.add({
        title: "Shop status updated",
        description: `${shop.shop_name} has been ${
          newStatus ? "activated" : "deactivated"
        }.`,
        type: "success",
      });

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      toast.add({
        title: "Update failed",
        description:
          err instanceof Error ? err.message : "Unable to update shop status.",
        type: "error",
      });
    } finally {
      setUpdatingShopId(null);
      setUpdatingAction(null);
    }
  }

  // Enable or disable printing for a shop.
  async function handlePrintingChange(shop: Shop) {
    const newValue = !shop.printing_enabled;

    const confirmed = window.confirm(
      newValue
        ? `Enable barcode and bill printing for ${shop.shop_name}?`
        : `Disable barcode and bill printing for ${shop.shop_name}?`,
    );

    if (!confirmed) return;

    setUpdatingShopId(shop.id);
    setUpdatingAction("printing");

    try {
      await apiRequest(`/system-admin/shops/${shop.id}/printing`, {
        method: "PATCH",
        body: JSON.stringify({
          printing_enabled: newValue,
        }),
      });

      toast.add({
        title: "Printing permission updated",
        description: `Printing has been ${
          newValue ? "enabled" : "disabled"
        } for ${shop.shop_name}.`,
        type: "success",
      });

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      toast.add({
        title: "Update failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to update printing permission.",
        type: "error",
      });
    } finally {
      setUpdatingShopId(null);
      setUpdatingAction(null);
    }
  }

  // Format dates.
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // Authentication loading screen.
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">Shops</h1>
              <p className="text-sm text-muted-foreground">
                Manage all registered furniture shops.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <Link
              href="/system-admin/shops/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Store size={18} />
              Add New Shop
            </Link>
          </div>
        </div>

        {/* Total Shops */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Total Registered Shops
          </p>

          <p className="mt-2 text-3xl font-bold text-foreground">
            {totalShops}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="rounded-xl border border-border bg-card p-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shop name, email or phone..."
                className="h-11 w-full rounded-lg border border-input bg-background py-2.5 pr-4 pl-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Shops</option>
              <option value="active">Active Shops</option>
              <option value="inactive">Inactive Shops</option>
            </select>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Search size={16} />
              Search
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="shrink-0 font-medium underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {/* Shops Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Registered Shops</h2>

            <span className="text-xs text-muted-foreground">
              {totalShops} shops found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Shop</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Model Prefix</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Printing</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      <RefreshCw
                        size={20}
                        className="mx-auto mb-2 animate-spin"
                      />
                      Loading shops...
                    </td>
                  </tr>
                ) : shops.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      <Store size={28} className="mx-auto mb-2 opacity-40" />
                      No shops found.
                    </td>
                  </tr>
                ) : (
                  shops.map((shop) => (
                    <tr key={shop.id} className="transition hover:bg-muted/50">
                      {/* Shop */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">
                          {shop.shop_name}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {shop.address || "No address"}
                        </p>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="text-foreground">
                          {shop.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {shop.phone || "No phone"}
                        </p>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">
                          {shop.owner_name || "No owner"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {shop.owner_email || "-"}
                        </p>
                      </td>

                      {/* Prefix */}
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                          {shop.model_code_prefix || "-"}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDate(shop.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {shop.is_active ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Printing Permission */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handlePrintingChange(shop)}
                          disabled={updatingShopId === shop.id}
                          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            shop.printing_enabled
                              ? "bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {updatingShopId === shop.id &&
                          updatingAction === "printing" ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Printer size={14} />
                          )}

                          {shop.printing_enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(shop)}
                          disabled={updatingShopId === shop.id}
                          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            shop.is_active
                              ? "bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                              : "bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400"
                          }`}
                        >
                          {updatingShopId === shop.id &&
                          updatingAction === "status" ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}

                          {shop.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && shops.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages || 1} ({totalShops} shops)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages || totalPages === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
