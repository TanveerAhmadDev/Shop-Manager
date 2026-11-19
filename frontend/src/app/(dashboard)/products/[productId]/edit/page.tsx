"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { getOfflineShopId } from "@/lib/offline-db";
import { apiRequestWithOfflineFallback } from "@/lib/offline-query";

import type { Product, ProductDetailsResponse } from "@/types/products";

import ProductForm from "@/components/products/product-form";

export default function EditProductPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        // Get the current shop ID from IndexedDB.
        const shopId = await getOfflineShopId();

        if (!shopId) {
          throw new Error("Shop session is unavailable. Please log in.");
        }

        // Cache key for this individual product.
        const queryKey = ["product", shopId, productId] as const;

        // Fetch from backend or use cached IndexedDB data.
        const result =
          await apiRequestWithOfflineFallback<ProductDetailsResponse>(
            `/products/${productId}`,
            shopId,
            queryKey,
          );

        if (mounted) {
          setProduct(result.data);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load product.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (productId) {
      loadProduct();
    }

    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading product...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Product not found."}
      </div>
    );
  }

  return <ProductForm product={product} />;
}
