import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// User information returned by the backend.
export interface OfflineUser {
  id: string;
  shop_id: string;
  full_name: string;
  email: string;
  role: "owner" | "helper";
}

// One cached API response.
interface CachedQuery {
  key: string;
  shopId: string;
  queryKey: readonly unknown[];
  data: unknown;
  savedAt: number;
}

// Last successfully authenticated user.
interface CachedSession {
  key: "current";
  user: OfflineUser;
  savedAt: number;
}

// Product fields that can be edited.
export interface ProductUpdatePayload {
  product_name: string;
  category_id: string | null;
  description: string;
  brand: string;
  material: string;
  color: string;
}

// A product update waiting to be synchronized.
export interface PendingProductUpdate {
  key: string;
  shopId: string;
  productId: string;
  body: ProductUpdatePayload;
  queuedAt: number;
}

// Payment methods supported by the backend.
export type OfflinePaymentMethod =
  | "cash"
  | "bank"
  | "easypaisa"
  | "jazzcash"
  | "other";

// One item in a sale.
// Individual and bulk items supported in offline sales.
export type SaleItemPayload =
  | {
      model_number: string;
      unit_sale_price: number;
    }
  | {
      type: "bulk";
      product_code: string;
      quantity: number;
      unit_sale_price: number;
    };

// Customer details for a new customer.
export interface SaleCustomerPayload {
  customer_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Initial payment information.
export interface SalePaymentPayload {
  amount: number;
  payment_method: OfflinePaymentMethod;
  reference_number?: string;
  notes?: string;
}

// Complete sale request body.
// Keep this structure consistent with CreateSaleBody on the backend.
export interface SalePayload {
  client_request_id: string;

  customer_id?: string;

  customer?: SaleCustomerPayload;

  items: SaleItemPayload[];

  discount?: number;
  tax?: number;

  payment?: SalePaymentPayload;

  notes?: string;
}

// A sale waiting to be synchronized with the backend.
export interface PendingSale {
  key: string;
  shopId: string;
  clientRequestId: string;
  body: SalePayload;
  queuedAt: number;
}

// IndexedDB structure.
interface FurnitureOfflineDB extends DBSchema {
  "query-cache": {
    key: string;
    value: CachedQuery;
    indexes: {
      "by-shop": string;
    };
  };

  "offline-session": {
    key: string;
    value: CachedSession;
  };

  "pending-product-updates": {
    key: string;
    value: PendingProductUpdate;
    indexes: {
      "by-shop": string;
    };
  };

  "pending-sales": {
    key: string;
    value: PendingSale;
    indexes: {
      "by-shop": string;
    };
  };
}

const DATABASE_NAME = "furniture-manager-offline";

// Version 4 adds the pending-sales store.
const DATABASE_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FurnitureOfflineDB>> | null = null;

// Open or create the offline database.
function getOfflineDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }

  if (!dbPromise) {
    dbPromise = openDB<FurnitureOfflineDB>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        // API response cache.
        if (!db.objectStoreNames.contains("query-cache")) {
          const store = db.createObjectStore("query-cache", {
            keyPath: "key",
          });

          store.createIndex("by-shop", "shopId");
        }

        // Offline user session.
        if (!db.objectStoreNames.contains("offline-session")) {
          db.createObjectStore("offline-session", {
            keyPath: "key",
          });
        }

        // Pending product updates.
        if (!db.objectStoreNames.contains("pending-product-updates")) {
          const store = db.createObjectStore("pending-product-updates", {
            keyPath: "key",
          });

          store.createIndex("by-shop", "shopId");
        }

        // Pending sales.
        // Existing records in other stores are preserved.
        if (!db.objectStoreNames.contains("pending-sales")) {
          const store = db.createObjectStore("pending-sales", {
            keyPath: "key",
          });

          store.createIndex("by-shop", "shopId");
        }
      },
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

// Save user information after successful authentication.
export async function saveOfflineSession(user: OfflineUser): Promise<void> {
  const db = await getOfflineDB();

  await db.put("offline-session", {
    key: "current",
    user,
    savedAt: Date.now(),
  });
}

// Read the saved offline user.
export async function getOfflineSession(): Promise<OfflineUser | null> {
  const db = await getOfflineDB();

  const cached = await db.get("offline-session", "current");

  return cached?.user ?? null;
}

// Remove the saved offline user.
export async function clearOfflineSession(): Promise<void> {
  const db = await getOfflineDB();

  await db.delete("offline-session", "current");
}

// Get shop ID from saved session.
export async function getOfflineShopId(): Promise<string | null> {
  const user = await getOfflineSession();

  return user?.shop_id ?? null;
}

// Create a unique cache key.
function createCacheKey(shopId: string, queryKey: readonly unknown[]) {
  return `${shopId}:${JSON.stringify(queryKey)}`;
}

// Save API response in IndexedDB.
export async function saveOfflineQuery<T>(
  shopId: string,
  queryKey: readonly unknown[],
  data: T,
): Promise<void> {
  if (!shopId) return;

  const db = await getOfflineDB();
  const key = createCacheKey(shopId, queryKey);

  await db.put("query-cache", {
    key,
    shopId,
    queryKey,
    data,
    savedAt: Date.now(),
  });
}

// Read saved API response.
export async function getOfflineQuery<T>(
  shopId: string,
  queryKey: readonly unknown[],
): Promise<T | undefined> {
  if (!shopId) return undefined;

  const db = await getOfflineDB();
  const key = createCacheKey(shopId, queryKey);

  const cached = await db.get("query-cache", key);

  return cached ? (cached.data as T) : undefined;
}

// Clear cached API data for one shop.
export async function clearShopOfflineData(shopId: string): Promise<void> {
  if (!shopId) return;

  const db = await getOfflineDB();

  const transaction = db.transaction("query-cache", "readwrite");

  const keys = await transaction.store.index("by-shop").getAllKeys(shopId);

  await Promise.all(keys.map((key) => transaction.store.delete(key)));

  await transaction.done;
}

// ----------------------------------------
// PENDING PRODUCT UPDATES
// ----------------------------------------

// Save or replace a pending product update.
// Repeated edits to the same product replace its previous queued data.
export async function savePendingProductUpdate(
  shopId: string,
  productId: string,
  body: ProductUpdatePayload,
): Promise<void> {
  if (!shopId || !productId) {
    throw new Error("Shop ID and product ID are required.");
  }

  const db = await getOfflineDB();

  const key = `${shopId}:${productId}`;

  await db.put("pending-product-updates", {
    key,
    shopId,
    productId,
    body,
    queuedAt: Date.now(),
  });
}

// Get pending updates for one shop.
export async function getPendingProductUpdates(
  shopId: string,
): Promise<PendingProductUpdate[]> {
  if (!shopId) return [];

  const db = await getOfflineDB();

  const updates = await db.getAllFromIndex(
    "pending-product-updates",
    "by-shop",
    shopId,
  );

  return updates.sort((a, b) => a.queuedAt - b.queuedAt);
}

// Delete an update after successful synchronization.
export async function deletePendingProductUpdate(key: string): Promise<void> {
  const db = await getOfflineDB();

  await db.delete("pending-product-updates", key);
}

// ----------------------------------------
// PENDING SALES
// ----------------------------------------

// Save a sale for synchronization.
// The same clientRequestId must be reused for every retry.
export async function savePendingSale(
  shopId: string,
  clientRequestId: string,
  body: SalePayload,
): Promise<void> {
  if (!shopId || !clientRequestId) {
    throw new Error("Shop ID and client request ID are required.");
  }

  if (body.client_request_id !== clientRequestId) {
    throw new Error("Sale request ID does not match its payload.");
  }

  const db = await getOfflineDB();

  const key = `${shopId}:${clientRequestId}`;

  await db.put("pending-sales", {
    key,
    shopId,
    clientRequestId,
    body,
    queuedAt: Date.now(),
  });
}

// Get pending sales for one shop, oldest first.
export async function getPendingSales(shopId: string): Promise<PendingSale[]> {
  if (!shopId) return [];

  const db = await getOfflineDB();

  const sales = await db.getAllFromIndex("pending-sales", "by-shop", shopId);

  return sales.sort((a, b) => a.queuedAt - b.queuedAt);
}

// Delete a sale only after the backend confirms success.
export async function deletePendingSale(key: string): Promise<void> {
  const db = await getOfflineDB();

  await db.delete("pending-sales", key);
}

// ----------------------------------------
// UPDATE CACHED PRODUCT RESPONSES
// ----------------------------------------

// Update already-cached product responses.
// This keeps the Products list and Edit page consistent while offline.
export async function updateOfflineProductCaches(
  shopId: string,
  productId: string,
  updates: ProductUpdatePayload,
): Promise<void> {
  const db = await getOfflineDB();

  const transaction = db.transaction("query-cache", "readwrite");

  const store = transaction.objectStore("query-cache");

  const cachedQueries = await store.index("by-shop").getAll(shopId);

  for (const cached of cachedQueries) {
    const response = cached.data as {
      data?: unknown;
      [key: string]: unknown;
    };

    if (!response || !("data" in response)) continue;

    let updatedData: unknown = response.data;
    let changed = false;

    // Products list response.
    if (Array.isArray(response.data)) {
      updatedData = response.data.map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "id" in item &&
          item.id === productId
        ) {
          changed = true;

          return {
            ...item,
            ...updates,
          };
        }

        return item;
      });
    }
    // Individual product response.
    else if (
      response.data &&
      typeof response.data === "object" &&
      "id" in response.data &&
      response.data.id === productId
    ) {
      changed = true;

      updatedData = {
        ...response.data,
        ...updates,
      };
    }

    if (changed) {
      await store.put({
        ...cached,
        data: {
          ...response,
          data: updatedData,
        },
        savedAt: Date.now(),
      });
    }
  }

  await transaction.done;
}

// ----------------------------------------
// CLEAR OFFLINE DATA
// ----------------------------------------

// Clear cached API data and session.
// Pending product updates and pending sales are deliberately
// preserved so logout does not silently destroy unsynchronized work.
export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDB();

  const transaction = db.transaction(
    ["query-cache", "offline-session"],
    "readwrite",
  );

  await Promise.all([
    transaction.objectStore("query-cache").clear(),
    transaction.objectStore("offline-session").clear(),
  ]);

  await transaction.done;
}
