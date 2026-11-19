"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import JsBarcode from "jsbarcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Truck,
  Package,
  Printer,
  CheckCircle2,
  Eye,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

import type {
  SupplierOption,
  SuppliersResponse,
  ProductOption,
  ProductsResponse,
  CreatePurchaseBody,
} from "@/types/purchases";
import { toast } from "@/components/ui/toast";

// One purchase row in the form
interface PurchaseRow {
  id: number;
  product_id: string;
  supplier_id: string;
  quantity: string;
  unit_purchase_price: string;
}

// Individual inventory item returned by backend
interface CreatedInventoryItem {
  id: string;
  model_number: string;
  cost_price: string | number;
  status: string;
}

// Purchase item returned by backend
interface CreatedPurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_purchase_price: string;
  allocated_extra_cost: string;
  landed_unit_cost: string;
  inventory: CreatedInventoryItem[];
}

// Complete purchase response
interface PurchaseResponse {
  success: boolean;
  message: string;
  data: {
    purchase_id: string;
    purchase_number: string;
    purchase_date: string;
    subtotal: string;
    transport_cost: string;
    other_cost: string;
    total_amount: string;
    total_quantity: number;
    items: CreatedPurchaseItem[];
  };
}

// Flattened barcode label data
interface BarcodeItem {
  id: string;
  model_number: string;
  product_name: string;
}

// Format currency
const money = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Shared input styling
const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

// Shared button styling
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

// --------------------------------------------------
// Barcode Label Component
// --------------------------------------------------

function BarcodeLabel({ item }: { item: BarcodeItem }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current || !item.model_number) return;

    try {
      JsBarcode(barcodeRef.current, item.model_number, {
        format: "CODE128",
        width: 2,
        height: 55,
        displayValue: true,
        fontSize: 14,
        font: "Arial",
        textMargin: 4,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (error) {
      console.error("Barcode generation error:", error);
    }
  }, [item.model_number]);

  return (
    <div className="barcode-label flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-3 text-center">
      <p className="mb-1 max-w-full truncate text-sm font-bold text-foreground">
        {item.product_name}
      </p>

      <svg
        ref={barcodeRef}
        className="h-auto max-w-full"
        aria-label={`Barcode for ${item.model_number}`}
      />

      <p className="mt-1 text-[10px] text-muted-foreground">
        Furniture Inventory
      </p>
    </div>
  );
}

// --------------------------------------------------
// Main Purchase Page
// --------------------------------------------------

export default function ManualPurchaseForm() {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [purchaseDate, setPurchaseDate] = useState("");

  const [transportCost, setTransportCost] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<PurchaseRow[]>([
    {
      id: 1,
      product_id: "",
      supplier_id: "",
      quantity: "1",
      unit_purchase_price: "",
    },
  ]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [completedPurchase, setCompletedPurchase] = useState<
    PurchaseResponse["data"] | null
  >(null);

  const queryClient = useQueryClient();

  // Set purchase date after mounting
  useEffect(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    setPurchaseDate(`${year}-${month}-${day}`);
  }, []);

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: (body: CreatePurchaseBody) =>
      apiRequest<PurchaseResponse>("/purchases", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
      ]);

      toast.add({
        title: "Purchase created successfully",
        description: `${result.data.purchase_number} has been recorded and inventory has been added.`,
        type: "success",
      });
    },

    onError: (err) => {
      toast.add({
        title: "Purchase creation failed",
        description:
          err instanceof Error ? err.message : "Unable to create purchase.",
        type: "error",
      });
    },
  });

  // Load suppliers and products
  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setError("");

      try {
        const [supplierResult, productResult] = await Promise.all([
          apiRequest<SuppliersResponse>("/suppliers?limit=100"),
          apiRequest<ProductsResponse>("/products?limit=100"),
        ]);

        setSuppliers(supplierResult.data);
        setProducts(productResult.data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load suppliers and products.";

        setError(message);

        toast.add({
          title: "Unable to load data",
          description: message,
          type: "error",
        });
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  // Calculate purchase subtotal
  const subtotal = useMemo(() => {
    return rows.reduce(
      (sum, row) =>
        sum + Number(row.quantity || 0) * Number(row.unit_purchase_price || 0),
      0,
    );
  }, [rows]);

  const transport = Number(transportCost || 0);
  const other = Number(otherCost || 0);
  const extraCost = transport + other;
  const total = subtotal + extraCost;

  // Update one purchase row
  function updateRow(
    id: number,
    field: keyof Omit<PurchaseRow, "id">,
    value: string,
  ) {
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  // Add another product
  function addRow() {
    setRows((previous) => [
      ...previous,
      {
        id: Date.now(),
        product_id: "",
        supplier_id: "",
        quantity: "1",
        unit_purchase_price: "",
      },
    ]);
  }

  // Remove a product row
  function removeRow(id: number) {
    setRows((previous) => previous.filter((row) => row.id !== id));
  }

  // Calculate proportional extra cost per product line
  function getAllocatedCost(row: PurchaseRow) {
    if (subtotal <= 0) return 0;

    const lineTotal =
      Number(row.quantity || 0) * Number(row.unit_purchase_price || 0);

    return (lineTotal / subtotal) * extraCost;
  }

  // Calculate landed unit cost
  function getLandedUnitCost(row: PurchaseRow) {
    const quantity = Number(row.quantity || 0);

    if (quantity <= 0) return 0;

    const lineTotal = quantity * Number(row.unit_purchase_price || 0);

    return (lineTotal + getAllocatedCost(row)) / quantity;
  }

  // Submit purchase
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (rows.length === 0) {
      const message = "Please add at least one product.";
      setError(message);

      toast.add({
        title: "Validation error",
        description: message,
        type: "warning",
      });

      return;
    }

    const invalidRow = rows.find(
      (row) =>
        !row.product_id ||
        !row.supplier_id ||
        !Number.isSafeInteger(Number(row.quantity)) ||
        Number(row.quantity) <= 0 ||
        Number(row.quantity) > 1000 ||
        Number(row.unit_purchase_price) <= 0 ||
        !Number.isFinite(Number(row.unit_purchase_price)) ||
        row.unit_purchase_price.trim() === "",
    );

    if (invalidRow) {
      setError(
        "Please select a product and supplier and enter valid quantity and purchase price for every row.",
      );
      return;
    }
    if (
      !Number.isFinite(transport) ||
      !Number.isFinite(other) ||
      transport < 0 ||
      other < 0
    ) {
      setError("Transport and other costs must be valid non-negative amounts.");
      return;
    }

    const body: CreatePurchaseBody = {
      purchase_date: purchaseDate,
      transport_cost: transport,
      other_cost: other,
      notes: notes.trim() || undefined,

      items: rows.map((row) => ({
        product_id: row.product_id,
        supplier_id: row.supplier_id,
        quantity: Number(row.quantity),
        unit_purchase_price: Number(row.unit_purchase_price),
      })),
    };
    setSubmitting(true);

    try {
      const result = await createPurchaseMutation.mutateAsync(body);

      setCompletedPurchase(result.data);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create purchase.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Prepare individual barcode labels
  const barcodeItems: BarcodeItem[] = completedPurchase
    ? completedPurchase.items.flatMap((purchaseItem) =>
        purchaseItem.inventory.map((inventory) => ({
          id: inventory.id,
          model_number: inventory.model_number,
          product_name: purchaseItem.product_name,
        })),
      )
    : [];

  // Print only barcode labels
  function printBarcodes() {
    window.print();
  }

  if (loadingOptions) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading suppliers and products...
      </div>
    );
  }

  // --------------------------------------------------
  // Successful Purchase + Barcode Printing Screen
  // --------------------------------------------------

  if (completedPurchase) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <style jsx global>{`
          @media print {
            @page {
              size: auto;
              margin: 8mm;
            }

            body * {
              visibility: hidden !important;
            }

            #barcode-print-area,
            #barcode-print-area * {
              visibility: visible !important;
            }

            #barcode-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .barcode-print-grid {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8mm !important;
            }

            .barcode-label {
              width: 65mm !important;
              min-height: 35mm !important;
              border: 1px solid #ddd !important;
              border-radius: 0 !important;
              padding: 3mm !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .barcode-label svg {
              max-width: 100% !important;
              height: auto !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Success Header */}
        <div className="no-print rounded-xl border border-green-500/30 bg-green-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={28}
              className="shrink-0 text-green-600 dark:text-green-400"
            />

            <div className="flex-1">
              <h1 className="text-xl font-bold text-green-700 dark:text-green-400">
                Purchase Created Successfully!
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Your inventory has been added. All individual furniture barcodes
                are ready to print.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Purchase Number</p>
              <p className="mt-1 font-bold text-foreground">
                {completedPurchase.purchase_number}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="mt-1 font-bold text-foreground">
                {completedPurchase.total_quantity}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Purchase Total</p>
              <p className="mt-1 font-bold text-foreground">
                {money(Number(completedPurchase.total_amount))}
              </p>
            </div>
          </div>
        </div>

        {/* Barcode Header */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Furniture Barcode Labels
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {barcodeItems.length} individual barcode labels generated.
            </p>
          </div>

          <button
            type="button"
            onClick={printBarcodes}
            disabled={barcodeItems.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={17} />
            Print All Barcodes
          </button>
        </div>

        {/* Barcode Labels */}
        <div
          id="barcode-print-area"
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="barcode-print-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barcodeItems.map((item) => (
              <BarcodeLabel key={item.id} item={item} />
            ))}
          </div>

          {barcodeItems.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No inventory barcodes were returned by the server.
            </p>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="no-print flex flex-wrap justify-end gap-3">
          <Link href="/purchases" className={secondaryButtonClass}>
            <Eye size={17} />
            View Purchases
          </Link>

          <Link
            href={`/purchases/${completedPurchase.purchase_id}`}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            View Purchase Details
          </Link>

          <Link
            href="/purchases/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={17} />
            New Purchase
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // New Purchase Form
  // --------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <Link
          href="/purchases"
          aria-label="Back to purchases"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">New Purchase</h1>

          <p className="text-sm text-muted-foreground">
            Record a supplier purchase and add inventory.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Supplier and Date */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Purchase Information</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Purchase Date *
            </label>

            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-semibold text-foreground">Purchase Items</h2>

            <p className="text-sm text-muted-foreground">
              Add furniture products and their purchase quantities.
            </p>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>

        <div className="space-y-4 p-5">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Product {index + 1}
                </p>

                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="rounded-lg p-2 text-destructive transition hover:bg-destructive/10"
                    title="Remove product"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Product */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Furniture Product *
                  </label>

                  <select
                    required
                    value={row.product_id}
                    onChange={(e) =>
                      updateRow(row.id, "product_id", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select product</option>

                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.product_name} - {product.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier for this product */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Supplier *
                  </label>

                  <select
                    required
                    value={row.supplier_id}
                    onChange={(e) =>
                      updateRow(row.id, "supplier_id", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select supplier</option>

                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}
                        {supplier.phone ? ` - ${supplier.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Quantity *
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    required
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.id, "quantity", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Unit Purchase Price *
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={row.unit_purchase_price}
                    onChange={(e) =>
                      updateRow(row.id, "unit_purchase_price", e.target.value)
                    }
                    placeholder="e.g. 5000"
                    className={inputClass}
                  />
                </div>

                {/* Line Total */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Line Total
                  </label>

                  <div className="flex h-11 items-center rounded-lg bg-muted px-3 text-sm font-semibold text-foreground">
                    {money(
                      Number(row.quantity || 0) *
                        Number(row.unit_purchase_price || 0),
                    )}
                  </div>
                </div>
              </div>

              {/* Landed Cost Preview */}
              <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Allocated Extra Cost
                  </p>

                  <p className="font-semibold text-foreground">
                    {money(getAllocatedCost(row))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Landed Cost Per Unit
                  </p>

                  <p className="font-semibold text-primary">
                    {money(getLandedUnitCost(row))}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              No products found. Add furniture products before recording a
              purchase.
            </p>
          )}
        </div>
      </section>

      {/* Additional Costs */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Truck size={19} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Additional Costs</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          These costs are distributed proportionally across the purchased
          products.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Transport Cost
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Other Costs
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={otherCost}
              onChange={(e) => setOtherCost(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-border bg-card p-5">
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Purchase Notes
        </label>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional purchase details..."
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      {/* Summary */}
      <section className="ml-auto w-full max-w-md rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingCart size={19} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Purchase Summary</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="font-medium text-foreground">
              {rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{money(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Transport Cost</span>
            <span className="text-foreground">{money(transport)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Other Costs</span>
            <span className="text-foreground">{money(other)}</span>
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <span className="text-foreground">Total Purchase Cost</span>
            <span className="text-foreground">{money(total)}</span>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/purchases" className={secondaryButtonClass}>
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            submitting ||
            suppliers.length === 0 ||
            products.length === 0 ||
            rows.length === 0
          }
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Package size={17} />
          {submitting ? "Creating Purchase..." : "Create Purchase"}
        </button>
      </div>
    </form>
  );
}
