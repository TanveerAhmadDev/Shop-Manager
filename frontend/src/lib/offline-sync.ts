import { apiRequest } from "@/lib/api";

import {
  getOfflineSession,
  getPendingProductUpdates,
  deletePendingProductUpdate,
  getPendingSales,
  deletePendingSale,
} from "@/lib/offline-db";

// Result returned after synchronization.
export interface SyncResult {
  syncedProducts: number;
  remainingProducts: number;
  syncedSales: number;
  remainingSales: number;
}

// Prevent multiple synchronization processes from running simultaneously.
let syncPromise: Promise<SyncResult> | null = null;

export async function syncPendingChanges(shopId: string): Promise<SyncResult> {
  if (syncPromise) {
    return syncPromise;
  }

  const task = (async (): Promise<SyncResult> => {
    const result: SyncResult = {
      syncedProducts: 0,
      remainingProducts: 0,
      syncedSales: 0,
      remainingSales: 0,
    };

    if (!navigator.onLine || !shopId) {
      return result;
    }

    try {
      // Verify that the saved offline session belongs to this shop.
      const session = await getOfflineSession();

      if (!session || session.shop_id !== shopId) {
        return result;
      }

      // ----------------------------------------
      // 1. Synchronize pending product updates
      // ----------------------------------------

      const pendingUpdates = await getPendingProductUpdates(shopId);

      for (const update of pendingUpdates) {
        if (!navigator.onLine) break;

        try {
          await apiRequest(`/products/${update.productId}`, {
            method: "PATCH",
            body: JSON.stringify(update.body),
          });

          // Remove only after backend success.
          await deletePendingProductUpdate(update.key);

          result.syncedProducts++;
        } catch (error) {
          console.warn(
            `Could not synchronize product ${update.productId}:`,
            error,
          );

          // Stop this queue and retry later.
          break;
        }
      }

      // ----------------------------------------
      // 2. Synchronize pending sales
      // ----------------------------------------

      const pendingSales = await getPendingSales(shopId);

      for (const sale of pendingSales) {
        if (!navigator.onLine) break;

        try {
          // The original client_request_id is retained.
          // Backend idempotency prevents duplicate sales.
          await apiRequest("/sales", {
            method: "POST",
            body: JSON.stringify(sale.body),
          });

          // Delete only after backend confirms success.
          await deletePendingSale(sale.key);

          result.syncedSales++;
        } catch (error) {
          console.warn(
            `Could not synchronize sale ${sale.clientRequestId}:`,
            error,
          );

          // Keep this sale and the remaining sales in IndexedDB.
          // They can be retried later.
          break;
        }
      }

      // ----------------------------------------
      // 3. Count remaining pending work
      // ----------------------------------------

      const remainingUpdates = await getPendingProductUpdates(shopId);
      const remainingSales = await getPendingSales(shopId);

      result.remainingProducts = remainingUpdates.length;
      result.remainingSales = remainingSales.length;

      return result;
    } catch (error) {
      console.error("Offline synchronization error:", error);

      // Pending records remain in IndexedDB.
      const remainingUpdates = await getPendingProductUpdates(shopId);
      const remainingSales = await getPendingSales(shopId);

      result.remainingProducts = remainingUpdates.length;
      result.remainingSales = remainingSales.length;

      return result;
    }
  })();

  syncPromise = task;

  try {
    return await task;
  } finally {
    syncPromise = null;
  }
}

// Backward-compatible function for the existing provider.
// It now synchronizes both products and sales.
export async function syncPendingProductUpdates(
  shopId: string,
): Promise<{ synced: number; remaining: number }> {
  const result = await syncPendingChanges(shopId);

  return {
    synced: result.syncedProducts + result.syncedSales,
    remaining: result.remainingProducts + result.remainingSales,
  };
}
