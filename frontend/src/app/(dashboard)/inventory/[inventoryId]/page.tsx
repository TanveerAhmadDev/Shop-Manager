"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Package,
  RefreshCw,
  AlertCircle,
  Clock,
  Truck,
  User,
  History,
  Wrench,
  Wifi,
  WifiOff,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

import {
  getOfflineShopId,
  getOfflineQuery,
  saveOfflineQuery,
} from "@/lib/offline-db";

import type {
  InventoryDetails,
  InventoryDetailsResponse,
  InventoryAdjustment,
  InventoryAdjustmentsResponse,
  InventoryStatus,
  UpdateInventoryStatusResponse,
} from "@/types/inventory";

// Cached inventory details and adjustment history.
interface CachedInventoryDetails {
  item: InventoryDetails;
  adjustments: InventoryAdjustment[];
}

const money = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  return `Rs. ${Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
};

const statusLabels: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  damaged: "Damaged",
  returned: "Returned",
  cancelled: "Cancelled",
};

const statusStyles: Record<InventoryStatus, string> = {
  in_stock: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  damaged: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function InventoryDetailsPage() {
  const params = useParams();

  const inventoryId = params.inventoryId as string;

  const [shopId, setShopId] = useState<string | null>(null);

  const [item, setItem] = useState<InventoryDetails | null>(null);

  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isOnline, setIsOnline] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load the current shop ID from the offline session.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const id = await getOfflineShopId();

        if (!active) return;

        if (!id) {
          setError(
            "Shop session is unavailable. Please log in again while connected to the internet.",
          );
          setLoading(false);
          return;
        }

        setShopId(id);
        setIsOnline(navigator.onLine);
      } catch (err) {
        console.error("Unable to load offline shop session:", err);

        if (active) {
          setError("Unable to access your offline shop session.");
          setLoading(false);
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

  // Fetch inventory details and adjustment history.
  const fetchDetails = useCallback(async () => {
    if (!shopId || !inventoryId) return;

    const queryKey = ["inventory-details", shopId, inventoryId] as const;

    try {
      setLoading(true);
      setError("");

      // Offline: read both details and history from IndexedDB.
      if (!navigator.onLine) {
        const cachedData = await getOfflineQuery<CachedInventoryDetails>(
          shopId,
          queryKey,
        );

        if (!cachedData) {
          throw new Error(
            "No offline details are available for this item. Connect to the internet and open this item first.",
          );
        }

        setItem(cachedData.item);
        setAdjustments(cachedData.adjustments);
        setFromCache(true);

        return;
      }

      try {
        // Online: fetch both resources.
        const [detailsResponse, historyResponse] = await Promise.all([
          apiRequest<InventoryDetailsResponse>(`/inventory/${inventoryId}`),
          apiRequest<InventoryAdjustmentsResponse>(
            `/inventory/${inventoryId}/adjustments?page=1&limit=20`,
          ),
        ]);

        const cachedData: CachedInventoryDetails = {
          item: detailsResponse.data,
          adjustments: historyResponse.data.adjustments,
        };

        // Save the combined data for offline viewing.
        await saveOfflineQuery(shopId, queryKey, cachedData);

        setItem(cachedData.item);
        setAdjustments(cachedData.adjustments);
        setFromCache(false);
      } catch (onlineError) {
        console.warn(
          "Unable to fetch inventory details online. Trying IndexedDB:",
          onlineError,
        );

        // Try previously cached data if the server is unavailable.
        const cachedData = await getOfflineQuery<CachedInventoryDetails>(
          shopId,
          queryKey,
        );

        if (!cachedData) {
          throw onlineError;
        }

        setItem(cachedData.item);
        setAdjustments(cachedData.adjustments);
        setFromCache(true);
      }
    } catch (err) {
      console.error("Inventory details error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory details.",
      );
    } finally {
      setLoading(false);
    }
  }, [shopId, inventoryId]);

  // Load details after the shop session is available.
  useEffect(() => {
    if (shopId && inventoryId) {
      fetchDetails();
    }
  }, [shopId, inventoryId, fetchDetails]);

  // Update inventory status.
  const handleStatusUpdate = async () => {
    if (!item) return;

    if (!navigator.onLine) {
      setFormError(
        "Status adjustments require an internet connection. Your changes have not been saved.",
      );
      return;
    }

    if (!reason.trim()) {
      setFormError("Please enter a reason for this adjustment.");
      return;
    }

    const newStatus: InventoryStatus =
      item.status === "in_stock" ? "damaged" : "in_stock";

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const response = await apiRequest<UpdateInventoryStatusResponse>(
        `/inventory/${inventoryId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            new_status: newStatus,
            reason: reason.trim(),
            notes: notes.trim() || null,
          }),
        },
      );

      setSuccessMessage(response.message);

      setReason("");
      setNotes("");

      // Fetch the updated item and history from the backend.
      await fetchDetails();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to update inventory status.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Initial loading.
  if (loading && !item) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />

        <span className="text-sm text-muted-foreground">
          Loading inventory details...
        </span>
      </div>
    );
  }

  // Error or missing item.
  if (error && !item) {
    return (
      <div className="space-y-4">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5" />
            Unable to load inventory details
          </div>

          <p className="mt-2">{error}</p>

          <button
            onClick={fetchDetails}
            disabled={!isOnline}
            className="mt-4 font-semibold underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const canAdjust = item.status === "in_stock" || item.status === "damaged";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {item.model_number}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  statusStyles[item.status]
                }`}
              >
                {statusLabels[item.status]}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {item.product_name}
            </p>
          </div>

          <button
            onClick={fetchDetails}
            disabled={loading || !isOnline}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div
        className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
          isOnline && !fromCache
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-orange-200 bg-orange-50 text-orange-700"
        }`}
      >
        {isOnline && !fromCache ? (
          <Wifi className="h-4 w-4 shrink-0" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}

        <p>
          {!isOnline
            ? "You are offline. Showing locally saved inventory details."
            : fromCache
              ? "Showing cached details. The latest online refresh was unsuccessful."
              : "You are online. Inventory details are synchronized with the server."}
        </p>
      </div>

      {/* Refresh warning */}
      {error && item && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Product and cost cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Furniture item</p>
              <h2 className="font-semibold">{item.product_name}</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <InfoRow label="Model number" value={item.model_number} />
            <InfoRow label="Category" value={item.category_name || "—"} />
            <InfoRow label="Brand" value={item.brand || "—"} />
            <InfoRow label="Material" value={item.material || "—"} />
            <InfoRow label="Color" value={item.color || "—"} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Recorded landed unit cost
          </p>

          <p className="mt-2 text-3xl font-bold">{money(item.cost_price)}</p>

          <div className="mt-5 space-y-3 text-sm">
            <InfoRow
              label="Original unit purchase price"
              value={money(item.unit_purchase_price)}
            />

            <InfoRow
              label="Allocated extra cost"
              value={money(item.allocated_extra_cost)}
            />

            <InfoRow
              label="Recorded inventory cost"
              value={money(item.cost_price)}
              strong
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            The recorded inventory cost is the cost used for this individual
            furniture item.
          </p>
        </div>
      </div>

      {/* Product description */}
      {item.product_description && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Description</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {item.product_description}
          </p>
        </section>
      )}

      {/* Purchase information */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <h2 className="font-semibold">Purchase information</h2>

            <p className="text-sm text-muted-foreground">
              Original purchase and supplier details
            </p>
          </div>
        </div>

        {item.purchase_id ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              label="Purchase number"
              value={item.purchase_number || "—"}
            />

            <InfoCard label="Supplier" value={item.supplier_name || "—"} />

            <InfoCard
              label="Purchase date"
              value={item.purchase_date ? formatDate(item.purchase_date) : "—"}
            />

            <InfoCard
              label="Purchase quantity"
              value={
                item.purchase_quantity !== null
                  ? String(item.purchase_quantity)
                  : "—"
              }
            />

            <InfoCard
              label="Purchase status"
              value={item.purchase_status || "—"}
            />

            <InfoCard
              label="Allocated extra cost"
              value={money(item.allocated_extra_cost)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No purchase information is available for this item.
          </p>
        )}
      </section>

      {/* Dates */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Record timestamps</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            label="Inventory created"
            value={formatDate(item.created_at)}
          />

          <InfoCard label="Last updated" value={formatDate(item.updated_at)} />
        </div>
      </section>

      {/* Status adjustment */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2">
            <Wrench className="h-5 w-5 text-orange-600" />
          </div>

          <div>
            <h2 className="font-semibold">Inventory status adjustment</h2>

            <p className="text-sm text-muted-foreground">
              Record damage or restore an item to stock.
            </p>
          </div>
        </div>

        {!isOnline ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            Status adjustments are temporarily unavailable offline. Connect to
            the internet to update this item's status.
          </div>
        ) : canAdjust ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              Current status: <strong>{statusLabels[item.status]}</strong>
              <p className="mt-1 text-muted-foreground">
                New status:{" "}
                <strong>
                  {item.status === "in_stock" ? "Damaged" : "In Stock"}
                </strong>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Reason <span className="text-red-500">*</span>
              </label>

              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={255}
                placeholder="e.g. Furniture damaged during transportation"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Maximum 255 characters.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Additional notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional details..."
                className="w-full rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              onClick={handleStatusUpdate}
              disabled={saving || !reason.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}

              {item.status === "in_stock"
                ? "Mark as Damaged"
                : "Restore to In Stock"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Manual status adjustment is unavailable for items with status{" "}
            <strong>{statusLabels[item.status]}</strong>.
          </div>
        )}
      </section>

      {/* Status history */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <History className="h-5 w-5 text-purple-600" />
          </div>

          <div>
            <h2 className="font-semibold">Status history</h2>

            <p className="text-sm text-muted-foreground">
              Previous inventory status changes
            </p>
          </div>
        </div>

        {adjustments.length === 0 ? (
          <div className="py-8 text-center">
            <History className="mx-auto h-8 w-8 text-muted-foreground" />

            <p className="mt-3 font-medium">No status changes yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Inventory adjustments will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {adjustments.map((adjustment, index) => (
              <div key={adjustment.adjustment_id} className="relative pl-8">
                {index !== adjustments.length - 1 && (
                  <div className="absolute left-[9px] top-6 h-full w-px bg-border" />
                )}

                <div className="absolute left-0 top-1 h-5 w-5 rounded-full border-4 border-background bg-primary" />

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {statusLabels[adjustment.previous_status]}
                      {" → "}
                      {statusLabels[adjustment.new_status]}
                    </p>

                    <span className="text-xs text-muted-foreground">
                      {formatDate(adjustment.created_at)}
                    </span>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm">
                      <span className="font-medium">Reason:</span>{" "}
                      {adjustment.reason}
                    </p>

                    {adjustment.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {adjustment.notes}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />

                      {adjustment.adjusted_by_name || "Unknown user"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Reusable information row.
function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>

      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

// Reusable information card.
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
