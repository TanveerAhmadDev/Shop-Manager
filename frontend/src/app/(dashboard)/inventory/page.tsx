"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Package,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";

import {
  getOfflineShopId,
  getOfflineQuery,
  saveOfflineQuery,
} from "@/lib/offline-db";

import type {
  InventoryItem,
  InventoryStatus,
  InventoryResponse,
} from "@/types/inventory";
import InventorySkeleton from "@/components/skeletons/InventorySkeleton";

// Number of items displayed per page.
const ITEMS_PER_PAGE = 10;

// Use a larger batch when downloading inventory for offline use.
const API_PAGE_LIMIT = 100;

const money = (value: string | number) =>
  `Rs. ${Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

const statusStyles: Record<InventoryStatus, string> = {
  in_stock: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  damaged: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  damaged: "Damaged",
  returned: "Returned",
  cancelled: "Cancelled",
};

// Fetch all inventory pages from the backend.
async function fetchCompleteInventory(): Promise<InventoryItem[]> {
  const firstPage = await apiRequest<InventoryResponse>(
    `/inventory?page=1&limit=${API_PAGE_LIMIT}`,
  );

  const allItems: InventoryItem[] = [...firstPage.data];

  const totalPages = firstPage.pagination.total_pages || 1;

  // Fetch remaining pages.
  for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
    const response = await apiRequest<InventoryResponse>(
      `/inventory?page=${currentPage}&limit=${API_PAGE_LIMIT}`,
    );

    allItems.push(...response.data);
  }

  return allItems;
}

export default function InventoryPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [isOnline, setIsOnline] = useState(true);
  const [sessionError, setSessionError] = useState("");

  // Load the saved shop session from IndexedDB.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const id = await getOfflineShopId();

        if (!active) return;

        if (!id) {
          setSessionError("Shop session is unavailable. Please log in again.");
        }

        setShopId(id);
        setIsOnline(navigator.onLine);
      } catch (error) {
        console.error("Unable to load offline shop session:", error);

        if (active) {
          setSessionError("Unable to access your offline shop session.");
        }
      } finally {
        if (active) {
          setMounted(true);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  // Monitor internet connection.
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load complete inventory and save it in IndexedDB.
  const {
    data: inventoryData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<{
    items: InventoryItem[];
    fromCache: boolean;
  }>({
    queryKey: ["inventory-all", shopId],

    enabled: mounted && !!shopId,

    // Keep data available in TanStack Query while navigating.
    staleTime: 1000 * 60 * 5,

    queryFn: async () => {
      if (!shopId) {
        throw new Error("Shop session is unavailable.");
      }

      const queryKey = ["inventory-all", shopId] as const;

      // If offline, immediately read from IndexedDB.
      if (!navigator.onLine) {
        const cachedItems = await getOfflineQuery<InventoryItem[]>(
          shopId,
          queryKey,
        );

        if (!cachedItems) {
          throw new Error(
            "No offline inventory is available. Connect to the internet and synchronize your inventory first.",
          );
        }

        return {
          items: cachedItems,
          fromCache: true,
        };
      }

      try {
        // Download every inventory page.
        const items = await fetchCompleteInventory();

        // Save the complete inventory for offline use.
        await saveOfflineQuery(shopId, queryKey, items);

        return {
          items,
          fromCache: false,
        };
      } catch (onlineError) {
        console.warn(
          "Unable to fetch inventory online. Trying offline cache:",
          onlineError,
        );

        useEffect(() => {
          if (page > totalPages) {
            setPage(totalPages);
          }
        }, [page, totalPages]);

        // If the API fails, use previously saved inventory.
        const cachedItems = await getOfflineQuery<InventoryItem[]>(
          shopId,
          queryKey,
        );

        if (cachedItems) {
          return {
            items: cachedItems,
            fromCache: true,
          };
        }

        throw onlineError;
      }
    },

    // Keep the previous inventory visible during refresh.
    placeholderData: (previousData) => previousData,
  });

  // Complete locally cached inventory.
  const allInventory = inventoryData?.items || [];

  // Search and filter locally.
  const filteredInventory = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return allInventory.filter((item) => {
      const matchesSearch =
        !searchValue ||
        [
          item.model_number,
          item.product_name,
          item.brand,
          item.category_name,
          item.material,
          item.color,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchValue),
        );

      const matchesStatus = status === "all" || item.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [allInventory, search, status]);

  // Calculate local pagination.
  const total = filteredInventory.length;

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const inventory = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;

    return filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInventory, page]);

  // Whether displayed inventory came from IndexedDB.
  const isOfflineData = inventoryData?.fromCache === true;

  // Reset page when search changes.
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  // Reset page when status changes.
  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  if (!mounted || (isLoading && !inventoryData)) {
    return <InventorySkeleton />;
  }

  // Shop session error.
  if (sessionError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          Shop session unavailable
        </div>

        <p className="mt-2">{sessionError}</p>

        <p className="mt-2">
          Please log in again while connected to the internet.
        </p>
      </div>
    );
  }

  const errorMessage =
    error instanceof Error ? error.message : "Unable to load inventory.";

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage individual furniture items and their stock status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching || !isOnline}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div
        className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
          isOnline
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-orange-200 bg-orange-50 text-orange-700"
        }`}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 shrink-0" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}

        <div>
          {!isOnline
            ? "You are offline. Showing locally saved inventory."
            : isOfflineData
              ? "Showing cached inventory. The latest online refresh was unsuccessful."
              : "You are online. Inventory is synchronized with the server."}
        </div>
      </div>

      {/* Inventory count */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total inventory items
              </p>

              <p className="mt-2 text-2xl font-bold">
                {allInventory.length.toLocaleString("en-PK")}
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 p-3">
              <Boxes className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Matching items</p>

              <p className="mt-2 text-2xl font-bold">
                {total.toLocaleString("en-PK")}
              </p>
            </div>

            <div className="rounded-lg bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search model number or product..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary sm:w-48"
        >
          <option value="all">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="sold">Sold</option>
          <option value="damaged">Damaged</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error */}
      {error && !inventoryData && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={!isOnline}
            className="shrink-0 font-semibold underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Inventory table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Model Number</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Specifications</th>
                <th className="px-4 py-3 font-medium">Cost Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Added Date</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading inventory...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />

                    <p className="font-medium">No inventory found</p>

                    <p className="mt-1 text-muted-foreground">
                      Try changing your search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {item.model_number}
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium">{item.product_name}</p>

                      {item.brand && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.brand}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-muted-foreground">
                      {item.category_name || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>{item.material || "Material: —"}</p>
                        <p>{item.color || "Color: —"}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium whitespace-nowrap">
                      {money(item.cost_price)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[item.status]
                        }`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Local pagination */}
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "No items"
              : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                  page * ITEMS_PER_PAGE,
                  total,
                )} of ${total} items`}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isFetching}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || isFetching}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
