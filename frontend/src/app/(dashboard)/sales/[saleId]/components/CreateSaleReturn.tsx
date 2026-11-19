"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { SaleDetailItem } from "@/types/sales";

interface CreateSaleReturnProps {
  saleId: string;
  items: SaleDetailItem[];
  isUrdu: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface CreateSaleReturnResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    return_number: string;
    return_total: number | string;
    status: string;
  };
}

type ReturnType = "refund" | "exchange";

export default function CreateSaleReturn({
  saleId,
  items,
  isUrdu,
  onClose,
  onCreated,
}: CreateSaleReturnProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleItem(itemId: string) {
    setSelectedItems((previous) =>
      previous.includes(itemId)
        ? previous.filter((id) => id !== itemId)
        : [...previous, itemId],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (selectedItems.length === 0) {
      setError(
        isUrdu
          ? "واپسی کے لیے کم از کم ایک آئٹم منتخب کریں۔"
          : "Please select at least one item to return.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await apiRequest<CreateSaleReturnResponse>(
        `/sales/${saleId}/returns`,
        {
          method: "POST",
          body: JSON.stringify({
            return_type: returnType,
            reason,
            items: selectedItems.map((id) => ({
              sale_item_id: id,
            })),
          }),
        },
      );

      alert(
        isUrdu
          ? `واپسی کی درخواست ${result.data.return_number} بن گئی۔`
          : `Return request ${result.data.return_number} created successfully.`,
      );

      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isUrdu
            ? "واپسی کی درخواست بنانے میں ناکامی۔"
            : "Failed to create return request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const formatCurrency = (amount: number | string) =>
    `Rs. ${Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5">
      <div
        dir={isUrdu ? "rtl" : "ltr"}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-bold text-foreground">
            {isUrdu ? "واپسی کی درخواست" : "Create Sales Return"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-3 py-1 text-xl text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {isUrdu ? "واپسی کی قسم" : "Return Type"}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnType("refund")}
                className={`rounded-xl border p-3 text-sm font-semibold transition ${
                  returnType === "refund"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {isUrdu ? "رقم واپس کریں" : "Refund"}
              </button>

              <button
                type="button"
                onClick={() => setReturnType("exchange")}
                className={`rounded-xl border p-3 text-sm font-semibold transition ${
                  returnType === "exchange"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {isUrdu ? "تبدیل کریں" : "Exchange"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {isUrdu ? "واپس کیے جانے والے آئٹمز" : "Select Items to Return"}
            </label>

            <div className="space-y-2">
              {items.map((item) => {
                const selected = selectedItems.includes(item.id);

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleItem(item.id)}
                      disabled={submitting}
                      className="h-4 w-4 accent-primary"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.product_name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {isUrdu ? "ماڈل نمبر" : "Model"}: {item.model_number}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(item.unit_sale_price)}
                    </p>
                  </label>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {selectedItems.length}{" "}
              {isUrdu ? "آئٹمز منتخب کیے گئے" : "item(s) selected"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              {isUrdu ? "واپسی کی وجہ" : "Return Reason"}
            </label>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isUrdu
                  ? "واپسی کی وجہ لکھیں..."
                  : "Enter the reason for return..."
              }
              rows={3}
              disabled={submitting}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {isUrdu ? "منسوخ کریں" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? isUrdu
                  ? "درخواست بھیجی جا رہی ہے..."
                  : "Submitting..."
                : isUrdu
                  ? "واپسی کی درخواست بنائیں"
                  : "Create Return Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
