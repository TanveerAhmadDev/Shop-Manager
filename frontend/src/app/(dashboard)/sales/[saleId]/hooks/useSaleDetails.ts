import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { SaleDetailsResponse } from "@/types/sales";

export function useSaleDetails(saleId: string, isUrdu: boolean) {
  const [details, setDetails] = useState<SaleDetailsResponse["data"] | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<SaleDetailsResponse>(`/sales/${saleId}`);

      setDetails(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isUrdu
            ? "فروخت کی تفصیلات لوڈ نہیں ہو سکیں۔"
            : "Unable to load sale details.",
      );
    } finally {
      setLoading(false);
    }
  }, [saleId, isUrdu]);

  useEffect(() => {
    if (saleId) {
      fetchDetails();
    }
  }, [saleId, fetchDetails]);

  return {
    details,
    loading,
    error,
    fetchDetails,
  };
}
