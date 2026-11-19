"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";

import { apiRequest } from "@/lib/api";

import {
  getOfflineShopId,
  savePendingProductUpdate,
  updateOfflineProductCaches,
} from "@/lib/offline-db";

import { apiRequestWithOfflineFallback } from "@/lib/offline-query";

import type {
  Category,
  CategoriesResponse,
  Product,
  ProductFormData,
  ProductTrackingType,
} from "@/types/products";

interface ProductFormProps {
  product?: Product;
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEditing = Boolean(product);

  const [shopId, setShopId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<ProductFormData>({
    product_name: product?.product_name || "",
    category_id: product?.category_id || "",
    description: product?.description || "",
    brand: product?.brand || "",
    material: product?.material || "",
    color: product?.color || "",
    tracking_type: product?.tracking_type || "individual",
    product_code: product?.product_code || "",
  });

  // Track internet connection.
  useEffect(() => {
    function updateConnection() {
      setIsOnline(navigator.onLine);
    }

    updateConnection();

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  // Load shop session and categories.
  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setLoadingCategories(true);

        const currentShopId = await getOfflineShopId();

        if (!currentShopId) {
          throw new Error("Shop session is unavailable. Please log in.");
        }

        if (mounted) {
          setShopId(currentShopId);
        }

        const queryKey = ["categories", currentShopId] as const;

        const result = await apiRequestWithOfflineFallback<CategoriesResponse>(
          "/categories",
          currentShopId,
          queryKey,
        );

        if (mounted) {
          setCategories(result.data || []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load categories.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh cached product queries after synchronization.
  async function refreshProductQueries(currentShopId: string) {
    await queryClient.invalidateQueries({
      queryKey: ["products", currentShopId],
    });

    if (product) {
      await queryClient.invalidateQueries({
        queryKey: ["product", currentShopId, product.id],
      });
    }
  }

  // Update form fields.
  function updateField<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  // Change tracking type and clear product code for individual products.
  function handleTrackingTypeChange(value: ProductTrackingType) {
    setForm((previous) => ({
      ...previous,
      tracking_type: value,
      product_code: value === "individual" ? "" : previous.product_code,
    }));

    setError("");
    setSuccess("");
  }

  // Save an edit to IndexedDB.
  async function saveOfflineChanges(
    currentShopId: string,
    body: {
      product_name: string;
      category_id: string | null;
      description: string;
      brand: string;
      material: string;
      color: string;
    },
  ) {
    if (!product) {
      throw new Error("Creating new products offline is not supported yet.");
    }

    // Save the pending update.
    await savePendingProductUpdate(currentShopId, product.id, body);

    // Update cached product lists and individual product data.
    await updateOfflineProductCaches(currentShopId, product.id, body);

    window.dispatchEvent(new Event("offline-data-changed"));

    setSuccess(
      "Changes saved on this device. They will sync automatically when internet returns.",
    );
  }

  // Submit product form.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.product_name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (form.tracking_type === "bulk" && !form.product_code.trim()) {
      setError("Product code is required for bulk products.");
      return;
    }

    if (!shopId) {
      setError("Shop session is unavailable. Please log in again.");
      return;
    }

    if (!product && !navigator.onLine) {
      setError("Creating new products requires an internet connection.");
      return;
    }

    // Do not allow tracking changes to be silently lost in offline mode.
    if (
      product &&
      !navigator.onLine &&
      (form.tracking_type !== product.tracking_type ||
        (form.product_code.trim().toUpperCase() || null) !==
          (product.product_code?.toUpperCase() || null))
    ) {
      setError(
        "Tracking type and product code can only be changed while online.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        ...form,
        product_name: form.product_name.trim(),
        category_id: form.category_id || null,
        description: form.description.trim(),
        brand: form.brand.trim(),
        material: form.material.trim(),
        color: form.color.trim(),

        // Individual products do not use a product-level code.
        tracking_type: form.tracking_type,
        product_code:
          form.tracking_type === "bulk"
            ? form.product_code.trim().toUpperCase()
            : null,
      };

      // Existing offline editing only queues the original product fields.
      const offlineBody = {
        product_name: body.product_name,
        category_id: body.category_id,
        description: body.description,
        brand: body.brand,
        material: body.material,
        color: body.color,
      };

      // Editing an existing product while offline.
      if (product && !navigator.onLine) {
        await saveOfflineChanges(shopId, offlineBody);
        return;
      }

      try {
        if (product) {
          // Update existing product online.
          await apiRequest(`/products/${product.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        } else {
          // Create new product online.
          await apiRequest("/products", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }

        await refreshProductQueries(shopId);

        router.push("/products");
        router.refresh();
      } catch (apiError) {
        // If the network disappears during the request,
        // queue ordinary product edits only.
        if (product && apiError instanceof TypeError) {
          const trackingSettingsChanged =
            body.tracking_type !== product.tracking_type ||
            (body.product_code || null) !==
              (product.product_code?.toUpperCase() || null);

          if (trackingSettingsChanged) {
            throw new Error(
              "Connection lost. Tracking settings were not saved. Please reconnect and try again.",
            );
          }

          await saveOfflineChanges(shopId, offlineBody);
          setIsOnline(false);
          return;
        }

        throw apiError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="rounded-lg border border-border bg-muted p-2"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Product" : "Add New Product"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update your furniture product information."
              : "Add a furniture type to your product catalog."}
          </p>
        </div>
      </div>

      {/* Connection Status */}
      {!isOnline && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You are offline. You can edit and save this product on your device.
          Changes will synchronize when internet returns.
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Product Information</h2>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Product Name *
          </label>

          <input
            required
            value={form.product_name}
            onChange={(e) => updateField("product_name", e.target.value)}
            placeholder="e.g. Office Chair"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Category</label>

          <select
            value={form.category_id || ""}
            onChange={(e) => updateField("category_id", e.target.value)}
            disabled={loadingCategories}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
          >
            <option value="">
              {loadingCategories
                ? "Loading categories..."
                : "Select category (optional)"}
            </option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {!loadingCategories && categories.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              No categories found. You can still create a product without a
              category.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>

          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the furniture product..."
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </section>

      {/* Tracking Information */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-semibold text-foreground">Product Tracking</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you want to manage the stock of this product.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Tracking Type *
          </label>

          <select
            value={form.tracking_type}
            onChange={(e) =>
              handleTrackingTypeChange(e.target.value as ProductTrackingType)
            }
            disabled={!isOnline || submitting}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-muted"
          >
            <option value="individual">Individual Tracking</option>
            <option value="bulk">Bulk Tracking</option>
          </select>

          <p className="mt-2 text-xs text-muted-foreground">
            {form.tracking_type === "individual"
              ? "Each physical item gets its own unique model number. Quantity is always one per item."
              : "Use one product code for multiple identical items. Enter the quantity when purchasing or selling."}
          </p>
        </div>

        {form.tracking_type === "bulk" && (
          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Code / Barcode *
            </label>

            <input
              required
              value={form.product_code}
              onChange={(e) =>
                updateField("product_code", e.target.value.toUpperCase())
              }
              disabled={!isOnline || submitting}
              placeholder="e.g. BULK-CHAIR-001"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-muted"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              This code identifies the product when scanning or entering a bulk
              sale. It must be unique within your shop.
            </p>
          </div>
        )}

        {!isOnline && (
          <p className="text-xs text-amber-700">
            Tracking settings can only be changed while connected to the
            internet.
          </p>
        )}
      </section>

      {/* Specifications */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">
          Product Specifications
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Brand</label>

            <input
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="e.g. Local Brand"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Material</label>

            <input
              value={form.material}
              onChange={(e) => updateField("material", e.target.value)}
              placeholder="e.g. Wood, Metal"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Color</label>

            <input
              value={form.color}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="e.g. Black, Brown"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link
          href="/products"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={submitting || loadingCategories || !shopId}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={17} />

          {submitting
            ? "Saving..."
            : isEditing
              ? isOnline
                ? "Update Product"
                : "Save Offline Changes"
              : "Save Product"}
        </button>
      </div>
    </form>
  );
}
