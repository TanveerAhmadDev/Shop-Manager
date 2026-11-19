"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  XCircle,
  Truck,
  Printer,
} from "lucide-react";
import JsBarcode from "jsbarcode";

import { apiRequest } from "@/lib/api";
import { PurchaseDetailsResponse, PurchaseLineItem } from "@/types/purchases";

const money = (value: number | string) =>
  `Rs. ${Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateFormat = (value: string) =>
  new Date(value).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function statusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "in_stock":
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "sold":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "damaged":
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "returned":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  }
}

interface BarcodeLabelProps {
  modelNumber: string;
  productName: string;
}

function BarcodeLabel({ modelNumber, productName }: BarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current) return;

    JsBarcode(barcodeRef.current, modelNumber, {
      format: "CODE128",
      width: 1.3,
      height: 38,
      displayValue: true,
      fontSize: 10,
      font: "Arial",
      textMargin: 2,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });

    barcodeRef.current.querySelectorAll("text").forEach((element) => {
      element.setAttribute("fill", "#000000");
    });
  }, [modelNumber]);

  return (
    <div className="barcode-label">
      <p className="barcode-product-name">{productName}</p>

      <svg ref={barcodeRef} className="barcode-svg" />
    </div>
  );
}

export default function PurchaseDetailsPage() {
  const params = useParams<{ purchaseId: string }>();
  const purchaseId = params.purchaseId;
  function printBarcodes() {
    window.print();
  }

  const [details, setDetails] = useState<
    PurchaseDetailsResponse["data"] | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchDetails() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<PurchaseDetailsResponse>(
        `/purchases/${purchaseId}`,
      );

      console.log(result.data);

      setDetails(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load purchase details.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (purchaseId) {
      fetchDetails();
    }
  }, [purchaseId]);

  async function cancelPurchase() {
    if (!details) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel ${details.purchase.purchase_number}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<{
        success: boolean;
        message: string;
      }>(`/purchases/${purchaseId}/cancel`, {
        method: "PATCH",
      });

      setSuccess(result.message || "Purchase cancelled successfully.");

      await fetchDetails();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to cancel purchase.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading purchase details...
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>

        <Link href="/purchases" className="text-sm underline">
          Back to purchases
        </Link>
      </div>
    );
  }

  if (!details) {
    return <p className="py-10 text-center">Purchase not found.</p>;
  }

  const { purchase, items } = details;

  // Get unique suppliers from purchase items.
  // Each purchase item can have a different supplier.
  const suppliers = Array.from(
    new Map(
      items
        .filter((item) => item.supplier_name)
        .map((item) => [item.supplier_id || item.supplier_name, item]),
    ).values(),
  );

  // Fallback for older purchases that used one supplier
  const hasLegacySupplier =
    suppliers.length === 0 && Boolean(purchase.supplier_name);

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );

  const allInventoryInStock = items.every((item: PurchaseLineItem) =>
    item.inventory.every((inventory) => inventory.status === "in_stock"),
  );

  const canCancel = purchase.status !== "cancelled" && allInventoryInStock;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="rounded-lg border border-border p-2 bg-muted"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {purchase.purchase_number}
            </h1>

            <p className="text-sm text-muted-foreground">
              Purchase details and inventory records
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchDetails}
            disabled={loading}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>

          {purchase.printing_enabled &&
            items.some((item) => item.inventory.length > 0) && (
              <button
                type="button"
                onClick={printBarcodes}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Printer size={17} />
                Print Barcodes
              </button>
            )}

          {purchase.status !== "cancelled" && (
            <button
              onClick={cancelPurchase}
              disabled={!canCancel || cancelling}
              title={
                !canCancel
                  ? "Cannot cancel because some inventory is no longer in stock."
                  : "Cancel purchase"
              }
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <XCircle size={17} />
              {cancelling ? "Cancelling..." : "Cancel Purchase"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Purchase Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Purchase Information</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Purchase Number</span>
              <span className="font-medium">{purchase.purchase_number}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Purchase Date</span>
              <span>{dateFormat(purchase.purchase_date)}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  purchase.status === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {purchase.status}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Total Items</span>
              <span>{totalQuantity} units</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Product Types</span>
              <span>{items.length}</span>
            </div>
          </div>
        </section>

        {/* Supplier */}
        {/* Suppliers */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Truck size={19} className="text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-foreground">
                Supplier Information
              </h2>
              <p className="text-xs text-muted-foreground">
                {suppliers.length || (hasLegacySupplier ? 1 : 0)} supplier(s) in
                this purchase
              </p>
            </div>
          </div>

          {suppliers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.supplier_id || supplier.supplier_name}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <p className="font-semibold text-foreground">
                    {supplier.supplier_name}
                  </p>

                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Phone: </span>
                      {supplier.supplier_phone || "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">Email: </span>
                      {supplier.supplier_email || "Not provided"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : hasLegacySupplier ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-semibold text-foreground">
                {purchase.supplier_name}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Phone: </span>
                  {purchase.supplier_phone || "Not provided"}
                </p>
                <p>
                  <span className="text-muted-foreground">Email: </span>
                  {purchase.supplier_email || "Not provided"}
                </p>
                <p>
                  <span className="text-muted-foreground">Address: </span>
                  {purchase.supplier_address || "Not provided"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No supplier information available.
            </p>
          )}
        </section>
      </div>

      {/* Purchased Products */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Purchased Furniture
          </h2>
          <p className="text-sm text-muted-foreground">
            Products, purchase costs and generated inventory model numbers.
          </p>
        </div>

        {items.map((item) => (
          <div
            key={item.purchase_item_id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Product Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-700 dark:text-blue-400">
                  <Package size={21} />
                </div>

                <div>
                  <h3 className="font-semibold text-foreground">
                    {item.product_name}
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    {item.quantity} units purchased
                  </p>

                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Supplier: </span>
                    <span className="font-medium text-foreground">
                      {item.supplier_name ||
                        purchase.supplier_name ||
                        "Not provided"}
                    </span>
                  </p>
                </div>
              </div>

              <span className="text-sm font-semibold text-foreground">
                {money(Number(item.landed_unit_cost) * Number(item.quantity))}
              </span>
            </div>

            {/* Cost Details */}
            <div className="grid gap-4 bg-muted/40 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Unit Purchase Price
                </p>
                <p className="mt-1 font-semibold">
                  {money(item.unit_purchase_price)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Allocated Extra Cost (Total)
                </p>
                <p className="mt-1 font-semibold">
                  {money(item.allocated_extra_cost)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Landed Unit Cost
                </p>
                <p className="mt-1 font-semibold text-blue-700 dark:text-blue-400">
                  {money(item.landed_unit_cost)}
                </p>
              </div>
            </div>

            {/* Generated Inventory */}
            <div className="p-5">
              <h4 className="mb-3 text-sm font-semibold">
                Generated Inventory ({item.inventory.length})
              </h4>

              {item.inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No inventory records found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-3">Model Number</th>
                        <th className="pb-3">Cost Price</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {item.inventory.map((inventory) => (
                        <tr key={inventory.id}>
                          <td className="py-3 font-medium">
                            {inventory.model_number}
                          </td>

                          <td className="py-3">
                            {money(inventory.cost_price)}
                          </td>

                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(
                                inventory.status,
                              )}`}
                            >
                              {inventory.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {purchase.printing_enabled &&
        items.some((item) => item.inventory.length > 0) && (
          <section
            id="barcode-print-area"
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="no-print mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Inventory Barcodes
              </h2>

              <p className="text-sm text-muted-foreground">
                Each label is 50 × 30 mm. Print on A4 sticker paper.
              </p>
            </div>

            <div className="barcode-print-grid">
              {items.flatMap((item) =>
                item.inventory.map((inventory) => (
                  <BarcodeLabel
                    key={inventory.id}
                    modelNumber={inventory.model_number}
                    productName={item.product_name}
                  />
                )),
              )}
            </div>
          </section>
        )}

      {/* Purchase Summary */}
      <section className="ml-auto w-full max-w-md rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold">Purchase Summary</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{money(purchase.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Transport Cost</span>
            <span>{money(purchase.transport_cost)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Other Cost</span>
            <span>{money(purchase.other_cost)}</span>
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total Purchase Cost</span>
            <span>{money(purchase.total_amount)}</span>
          </div>
        </div>
      </section>

      {/* Notes */}
      {purchase.notes && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Purchase Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {purchase.notes}
          </p>
        </section>
      )}

      {/* Cancellation Notice */}
      {purchase.status !== "cancelled" && !canCancel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This purchase cannot be cancelled because one or more inventory items
          are no longer in stock. This protects your existing sales and
          inventory records.
        </div>
      )}
    </div>
  );
}
