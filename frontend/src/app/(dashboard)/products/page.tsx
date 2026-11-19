"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Package, Pencil, RefreshCw } from "lucide-react";

import type { Product, ProductsResponse } from "@/types/products";
import { getOfflineShopId } from "@/lib/offline-db";
import { apiRequestWithOfflineFallback } from "@/lib/offline-query";
import ProductsPageSkeleton from "@/components/skeletons/ProductsPageSkeleton";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [trackingType, setTrackingType] = useState("all");
  const [page, setPage] = useState(1);

  const [shopId, setShopId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Load saved shop session.
  useEffect(() => {
    let mounted = true;

    async function loadOfflineSession() {
      try {
        const offlineShopId = await getOfflineShopId();

        if (mounted) {
          setShopId(offlineShopId);
        }
      } catch (error) {
        console.error("Could not load offline shop session:", error);
      } finally {
        if (mounted) {
          setSessionReady(true);
        }
      }
    }

    loadOfflineSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch products.
  const { data, isLoading, isFetching, error, refetch } =
    useQuery<ProductsResponse>({
      queryKey: ["products", shopId, page, search.trim(), status, trackingType],

      enabled: sessionReady && !!shopId,

      queryFn: async () => {
        if (!shopId) {
          throw new Error("Shop session is unavailable.");
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (status !== "all") {
          params.set("status", status);
        }

        if (trackingType !== "all") {
          params.set("tracking_type", trackingType);
        }

        const queryKey = [
          "products",
          shopId,
          page,
          search.trim(),
          status,
          trackingType,
        ] as const;

        return apiRequestWithOfflineFallback<ProductsResponse>(
          `/products?${params.toString()}`,
          shopId,
          queryKey,
        );
      },

      placeholderData: (previousData) => previousData,
    });

  const products: Product[] = data?.data || [];
  const totalPages = data?.pagination.totalPages || 1;

  const errorMessage =
    error instanceof Error ? error.message : "Unable to load products.";

  if (!sessionReady || (isLoading && !data)) {
    return <ProductsPageSkeleton />;
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  function handleTrackingChange(value: string) {
    setTrackingType(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your furniture product catalog.
          </p>
        </div>

        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={17} />
          Add Product
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, brand, code..."
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`${inputClass} sm:w-40`}
        >
          <option value="all">All Products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={trackingType}
          onChange={(e) => handleTrackingChange(e.target.value)}
          className={`${inputClass} sm:w-44`}
        >
          <option value="all">All Tracking Types</option>
          <option value="individual">Individual</option>
          <option value="bulk">Bulk</option>
        </select>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching || !shopId}
          className={secondaryButtonClass}
        >
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{errorMessage}</span>

          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-5">
          <Package size={19} className="text-muted-foreground" />

          <h2 className="font-semibold text-foreground">Furniture Catalog</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Brand</th>
                <th className="px-5 py-4">Material</th>
                <th className="px-5 py-4">Color</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {!sessionReady || (isLoading && !data) ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : !shopId ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Shop session is unavailable. Please log in again.
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Package
                      size={32}
                      className="mx-auto mb-3 text-muted-foreground/50"
                    />

                    <p className="font-medium text-foreground">
                      No products found
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Add your first furniture product to get started.
                    </p>

                    <Link
                      href="/products/new"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      <Plus size={16} />
                      Add Product
                    </Link>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {product.product_name}
                      </p>

                      {product.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {product.category_name || "Uncategorized"}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {product.brand || "—"}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {product.material || "—"}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {product.color || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.is_active
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
                      >
                        <Pencil size={14} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && sessionReady && shopId && products.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((previous) => previous - 1)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
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
