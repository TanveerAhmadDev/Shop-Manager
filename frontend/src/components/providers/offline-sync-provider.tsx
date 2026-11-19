"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, CloudOff, RefreshCw, CheckCircle } from "lucide-react";

import {
  getOfflineShopId,
  getPendingProductUpdates,
  getPendingSales,
} from "@/lib/offline-db";

import { syncPendingChanges } from "@/lib/offline-sync";

interface OfflineSyncProviderProps {
  children: React.ReactNode;
}

export default function OfflineSyncProvider({
  children,
}: OfflineSyncProviderProps) {
  const queryClient = useQueryClient();

  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [pendingProducts, setPendingProducts] = useState(0);
  const [pendingSales, setPendingSales] = useState(0);

  const [lastSyncedProducts, setLastSyncedProducts] = useState(0);
  const [lastSyncedSales, setLastSyncedSales] = useState(0);

  const pendingCount = pendingProducts + pendingSales;
  const lastSyncedCount = lastSyncedProducts + lastSyncedSales;

  useEffect(() => {
    let mounted = true;
    let currentShopId: string | null = null;
    let syncInProgress = false;

    // ----------------------------------------
    // Refresh pending queue counts
    // ----------------------------------------

    async function refreshPendingCount() {
      if (!currentShopId) return;

      try {
        const [products, sales] = await Promise.all([
          getPendingProductUpdates(currentShopId),
          getPendingSales(currentShopId),
        ]);

        if (mounted) {
          setPendingProducts(products.length);
          setPendingSales(sales.length);
        }
      } catch (error) {
        console.error("Unable to read pending offline changes:", error);
      }
    }

    // ----------------------------------------
    // Synchronize pending changes
    // ----------------------------------------

    async function synchronize() {
      if (!mounted || !currentShopId || !navigator.onLine) return;

      // Avoid duplicate synchronization attempts.
      if (syncInProgress) return;

      syncInProgress = true;
      setSyncing(true);

      try {
        const result = await syncPendingChanges(currentShopId);

        if (!mounted) return;

        setPendingProducts(result.remainingProducts);
        setPendingSales(result.remainingSales);

        setLastSyncedProducts(result.syncedProducts);
        setLastSyncedSales(result.syncedSales);

        // Refresh application data after successful synchronization.
        if (result.syncedProducts > 0) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["products", currentShopId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["product", currentShopId],
            }),
          ]);
        }

        if (result.syncedSales > 0) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["sales", currentShopId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["inventory", currentShopId],
            }),
          ]);
        }
      } catch (error) {
        console.error("Global offline synchronization failed:", error);

        await refreshPendingCount();
      } finally {
        syncInProgress = false;

        if (mounted) {
          setSyncing(false);
        }
      }
    }

    // ----------------------------------------
    // Initialize provider
    // ----------------------------------------

    async function initialize() {
      try {
        currentShopId = await getOfflineShopId();

        if (!mounted || !currentShopId) return;

        await refreshPendingCount();

        // Synchronize pending changes when dashboard opens.
        if (navigator.onLine) {
          await synchronize();
        }
      } catch (error) {
        console.error("Offline sync initialization failed:", error);
      }
    }

    // ----------------------------------------
    // Browser online/offline events
    // ----------------------------------------

    function handleOnline() {
      setIsOnline(true);
      void synchronize();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    // Fired when another component saves offline changes.
    function handleOfflineDataChanged() {
      void refreshPendingCount();

      if (navigator.onLine) {
        void synchronize();
      }
    }

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    window.addEventListener("offline-data-changed", handleOfflineDataChanged);

    void initialize();

    return () => {
      mounted = false;

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      window.removeEventListener(
        "offline-data-changed",
        handleOfflineDataChanged,
      );
    };
  }, [queryClient]);

  return (
    <>
      {children}

      {/* Global offline synchronization status */}
      {(!isOnline || syncing || pendingCount > 0) && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
          {!isOnline ? (
            <>
              <CloudOff size={18} className="shrink-0 text-amber-600" />

              <div>
                <p className="font-semibold text-slate-800">You are offline</p>

                <p className="text-xs text-muted-foreground">
                  {pendingProducts} product update(s), {pendingSales} sale(s)
                  pending
                </p>
              </div>
            </>
          ) : syncing ? (
            <>
              <RefreshCw
                size={18}
                className="shrink-0 animate-spin text-blue-600"
              />

              <div>
                <p className="font-semibold text-slate-800">Synchronizing...</p>

                <p className="text-xs text-muted-foreground">
                  Sending pending products and sales
                </p>
              </div>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Cloud size={18} className="shrink-0 text-amber-600" />

              <div>
                <p className="font-semibold text-slate-800">
                  {pendingCount} pending change(s)
                </p>

                <p className="text-xs text-muted-foreground">
                  {pendingProducts} product update(s), {pendingSales} sale(s)
                  waiting to synchronize
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Successful synchronization message */}
      {isOnline && !syncing && lastSyncedCount > 0 && pendingCount === 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-green-200 bg-card px-4 py-3 text-sm shadow-lg">
          <CheckCircle size={18} className="text-green-600" />

          <div>
            <p className="font-medium text-foreground">
              Changes synchronized successfully
            </p>

            <p className="text-xs text-muted-foreground">
              {lastSyncedProducts} product update(s), {lastSyncedSales} sale(s)
            </p>
          </div>
        </div>
      )}
    </>
  );
}
