import { useEffect } from "react";
import type {
  Customer,
  CustomersResponse,
  InventoryItem,
  InventoryResponse,
} from "@/types/sales";

import { apiRequest } from "@/lib/api";

// Copy this import from your existing page.tsx:
import {
  getOfflineShopId,
  getOfflineQuery,
  saveOfflineQuery,
  getPendingSales,
} from "@/lib/offline-db";

interface UseNewSaleDataProps {
  isUrdu: boolean;
  reservedModelNumbersRef: React.MutableRefObject<Set<string>>;
  setOfflineShopId: (shopId: string) => void;
  setCustomers: (customers: Customer[]) => void;
  setInventory: (inventory: InventoryItem[]) => void;
  setError: (error: string) => void;
  setLoadingData: (loading: boolean) => void;
}

export function useNewSaleData({
  isUrdu,
  reservedModelNumbersRef,
  setOfflineShopId,
  setCustomers,
  setInventory,
  setError,
  setLoadingData,
}: UseNewSaleDataProps) {
  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const shopId = await getOfflineShopId();

        if (!shopId) {
          throw new Error("Unable to identify your shop. Please log in again.");
        }

        if (cancelled) return;

        setOfflineShopId(shopId);

        const customerKey = ["sale-form-customers", shopId];
        const inventoryKey = ["sale-form-inventory", shopId];

        let customerResult: CustomersResponse;
        let inventoryResult: InventoryResponse;

        if (navigator.onLine) {
          try {
            const results = await Promise.all([
              apiRequest<CustomersResponse>("/customers?limit=100"),
              apiRequest<InventoryResponse>(
                "/inventory?status=in_stock&limit=100",
              ),
            ]);

            customerResult = results[0];
            inventoryResult = results[1];

            await Promise.all([
              saveOfflineQuery(shopId, customerKey, customerResult),
              saveOfflineQuery(shopId, inventoryKey, inventoryResult),
            ]);
          } catch (err) {
            if (!(err instanceof TypeError)) {
              throw err;
            }

            const [cachedCustomers, cachedInventory] = await Promise.all([
              getOfflineQuery<CustomersResponse>(shopId, customerKey),
              getOfflineQuery<InventoryResponse>(shopId, inventoryKey),
            ]);

            if (!cachedCustomers || !cachedInventory) {
              throw new Error(
                "No saved customer or inventory data is available offline. Connect to the internet and open this page first.",
              );
            }

            customerResult = cachedCustomers;
            inventoryResult = cachedInventory;
          }
        } else {
          const [cachedCustomers, cachedInventory] = await Promise.all([
            getOfflineQuery<CustomersResponse>(shopId, customerKey),
            getOfflineQuery<InventoryResponse>(shopId, inventoryKey),
          ]);

          if (!cachedCustomers || !cachedInventory) {
            throw new Error(
              "No saved customer or inventory data is available offline. Connect to the internet and open this page first.",
            );
          }

          customerResult = cachedCustomers;
          inventoryResult = cachedInventory;
        }

        const pendingSales = await getPendingSales(shopId);
        const reservedNumbers = new Set<string>();

        for (const pendingSale of pendingSales) {
          for (const item of pendingSale.body.items) {
            if ("model_number" in item) {
              reservedNumbers.add(item.model_number.toUpperCase());
            }
          }
        }

        if (cancelled) return;

        reservedModelNumbersRef.current = reservedNumbers;

        setCustomers(customerResult.data);

        const availableInventory = inventoryResult.data.filter(
          (item) =>
            item.status === "in_stock" &&
            !reservedNumbers.has(item.model_number.toUpperCase()),
        );

        setInventory(availableInventory);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : isUrdu
                ? "گاہکوں اور اسٹاک کی معلومات لوڈ نہیں ہو سکیں۔"
                : "Unable to load customers and inventory.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, [
    isUrdu,
    reservedModelNumbersRef,
    setOfflineShopId,
    setCustomers,
    setInventory,
    setError,
    setLoadingData,
  ]);
}
