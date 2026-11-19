import { apiRequest } from "@/lib/api";

import { saveOfflineQuery, getOfflineQuery } from "@/lib/offline-db";

// Fetch data online and save it for offline use.
export async function apiRequestWithOfflineFallback<T>(
  endpoint: string,
  shopId: string,
  queryKey: readonly unknown[],
): Promise<T> {
  try {
    // First, try to get fresh data from the backend.
    const result = await apiRequest<T>(endpoint);

    // Save the response locally.
    // A cache-saving failure should not break a successful API request.
    try {
      await saveOfflineQuery(shopId, queryKey, result);
    } catch (cacheError) {
      console.warn("Could not save offline data:", cacheError);
    }

    return result;
  } catch (error) {
    // Only use offline data for network failures.
    // Do not hide HTTP errors such as 401 or 403.
    if (!(error instanceof TypeError)) {
      throw error;
    }

    try {
      const cachedData = await getOfflineQuery<T>(shopId, queryKey);

      if (cachedData !== undefined) {
        console.log("Showing saved offline data.");
        return cachedData;
      }
    } catch (cacheError) {
      console.warn("Could not read offline data:", cacheError);
    }

    // No saved data exists, so show the original network error.
    throw error;
  }
}
