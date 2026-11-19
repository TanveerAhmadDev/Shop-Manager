"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  Receipt,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { useLanguage } from "@/context/language-context";
import type {
  SaleReturnDetailsResponse,
  SaleReturnDetailItem,
  ReturnItemCondition,
  InspectSaleReturnBody,
  PaymentMethod,
} from "@/types/sales";

export default function SaleReturnDetailsPage() {
  const [refundInput, setRefundInput] = useState("");
  const params = useParams<{ returnId: string }>();
  const returnId = params.returnId;

  const { isUrdu } = useLanguage();

  const [details, setDetails] = useState<
    SaleReturnDetailsResponse["data"] | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingInspection, setSavingInspection] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [conditions, setConditions] = useState<
    Record<string, ReturnItemCondition>
  >({});

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<SaleReturnDetailsResponse>(
        `/sales/returns/${returnId}`,
      );
      setDetails(result.data);

      const initialRefundAmount =
        result.data.status === "pending" && result.data.return_type === "refund"
          ? result.data.refund_preview
          : result.data.refund_amount;

      setRefundInput(String(initialRefundAmount ?? 0));

      const savedConditions: Record<string, ReturnItemCondition> = {};

      result.data.items.forEach((item) => {
        savedConditions[item.id] = item.condition;
      });

      setConditions(savedConditions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load return details.",
      );
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    if (returnId) fetchDetails();
  }, [returnId, fetchDetails]);

  const formatCurrency = (amount: number | string) =>
    `Rs. ${Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  function conditionLabel(condition: ReturnItemCondition) {
    if (!isUrdu) {
      if (condition === "good") return "Good";
      if (condition === "damaged") return "Damaged";
      return "Needs Repair";
    }

    if (condition === "good") return "اچھی حالت";
    if (condition === "damaged") return "خراب";
    return "مرمت درکار";
  }

  function updateCondition(itemId: string, condition: ReturnItemCondition) {
    setConditions((previous) => ({
      ...previous,
      [itemId]: condition,
    }));
  }

  async function handleInspection() {
    if (!details) return;

    const pendingItems = details.items.filter(
      (item) => item.status === "pending",
    );

    if (pendingItems.length === 0) return;

    const missingInspection = pendingItems.some((item) => !conditions[item.id]);

    if (missingInspection) {
      alert(
        isUrdu
          ? "تمام زیر التواء آئٹمز کی حالت منتخب کریں۔"
          : "Please select a condition for every pending item.",
      );
      return;
    }

    try {
      setSavingInspection(true);

      const body: InspectSaleReturnBody = {
        items: pendingItems.map((item) => ({
          return_item_id: item.id,
          condition: conditions[item.id],
        })),
      };

      await apiRequest(`/sales/returns/${returnId}/inspect`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      alert(
        isUrdu
          ? "آئٹمز کا معائنہ محفوظ ہو گیا۔"
          : "Inspection saved successfully.",
      );

      await fetchDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save inspection.");
    } finally {
      setSavingInspection(false);
    }
  }

  async function handleCompleteReturn() {
    if (!details?.refund_preview_can_complete) {
      alert(
        "This return cannot be completed because the full refund amount cannot be settled.",
      );
      return;
    }

    const enteredRefund = Number(refundInput);

    if (
      refundInput.trim() === "" ||
      !Number.isFinite(enteredRefund) ||
      enteredRefund < 0 ||
      enteredRefund > refundAmount
    ) {
      alert(
        isUrdu
          ? "درست ریفنڈ رقم درج کریں۔"
          : "Please enter a valid refund amount within the available limit.",
      );
      return;
    }

    if (details?.items.some((item) => !item.inspected_at)) {
      alert(
        isUrdu
          ? "پہلے تمام آئٹمز کا معائنہ مکمل کریں۔"
          : "Please inspect every item before completing the return.",
      );
      return;
    }

    if (details.return_type !== "refund") {
      alert(
        isUrdu
          ? "ایکسچینج کا عمل ابھی دستیاب نہیں ہے۔"
          : "Exchange completion will be implemented separately.",
      );
      return;
    }

    const confirmed = window.confirm(
      isUrdu
        ? "کیا آپ یہ ریٹرن مکمل کرنا چاہتے ہیں؟"
        : "Are you sure you want to complete this return?",
    );

    if (!confirmed) return;

    try {
      setCompleting(true);

      await apiRequest(`/sales/returns/${returnId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          refund_amount: enteredRefund,
          payment_method: paymentMethod,
        }),
      });

      alert(
        isUrdu
          ? "ریٹرن کامیابی سے مکمل ہو گیا۔"
          : "Return completed successfully.",
      );

      await fetchDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete return.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw className="animate-spin" size={20} />
        {isUrdu ? "لوڈ ہو رہا ہے..." : "Loading return details..."}
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-red-600">{error || "Return not found."}</p>
        <button
          onClick={fetchDetails}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {isUrdu ? "دوبارہ کوشش کریں" : "Try Again"}
        </button>
      </div>
    );
  }

  const pendingItems = details.items.filter(
    (item) => item.status === "pending",
  );

  const allInspected = details.items.every((item) =>
    Boolean(item.inspected_at),
  );

  const isPending = details.status === "pending";
  const refundAmount = Number(
    details.status === "pending" && details.return_type === "refund"
      ? details.refund_preview
      : details.refund_amount,
  );

  const balanceAdjustmentAmount = Number(
    details.status === "pending" && details.return_type === "refund"
      ? details.balance_adjustment_preview
      : details.balance_adjusted_amount,
  );

  const selectedRefundAmount = Number(refundInput);

  const isRefundAmountValid =
    refundInput.trim() !== "" &&
    Number.isFinite(selectedRefundAmount) &&
    selectedRefundAmount >= 0 &&
    selectedRefundAmount <= refundAmount;

  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-5xl space-y-5 pb-8"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/sales/returns"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} />
            {isUrdu ? "واپس ریٹرنز" : "Back to Returns"}
          </Link>

          <h1 className="text-2xl font-bold text-foreground">
            {details.return_number}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu ? "واپسی کی تفصیلات" : "Return Details"}
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            details.status === "completed"
              ? "bg-green-500/10 text-green-600"
              : details.status === "cancelled"
                ? "bg-red-500/10 text-red-600"
                : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {details.status.toUpperCase()}
        </span>
      </div>

      {/* Sale and customer information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Receipt size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">
              {isUrdu ? "اصل سیل" : "Original Sale"}
            </h2>
          </div>

          <p className="text-lg font-bold text-primary">
            {details.original_sale.sale_number}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(details.original_sale.sale_date)}
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            {isUrdu ? "کل رقم" : "Sale Total"}:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(details.original_sale.total_amount)}
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">
              {isUrdu ? "کسٹمر" : "Customer"}
            </h2>
          </div>

          <p className="font-semibold text-foreground">
            {details.customer?.name || "Walk-in Customer"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {details.customer?.phone || "—"}
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            {isUrdu ? "واپسی کی تاریخ" : "Return Date"}:{" "}
            <span className="font-semibold text-foreground">
              {formatDate(details.return_date)}
            </span>
          </p>
        </section>
      </div>

      {/* Return summary */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: isUrdu ? "واپسی کی قسم" : "Return Type",
            value: details.return_type.toUpperCase(),
          },
          {
            label: isUrdu ? "واپسی کی رقم" : "Return Total",
            value: formatCurrency(details.return_total),
          },
          {
            label: isUrdu ? "بقایا ایڈجسٹمنٹ" : "Balance Adjustment",
            value: formatCurrency(balanceAdjustmentAmount),
          },
          {
            label:
              details.status === "pending"
                ? isUrdu
                  ? "زیادہ سے زیادہ ریفنڈ"
                  : "Maximum Refund"
                : isUrdu
                  ? "واپس کی گئی رقم"
                  : "Actual Refund",
            value: formatCurrency(refundAmount),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-2 break-words text-lg font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {details.reason && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            {isUrdu ? "واپسی کی وجہ" : "Return Reason"}
          </h2>
          <p className="text-sm text-muted-foreground">{details.reason}</p>
        </section>
      )}

      {/* Returned items and inspection */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isUrdu ? "واپس کیے گئے آئٹمز" : "Returned Furniture"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu
              ? "ہر آئٹم کی حالت کا معائنہ کریں۔"
              : "Inspect the condition of each returned item."}
          </p>
        </div>

        <div className="space-y-3">
          {details.items.map((item: SaleReturnDetailItem) => (
            <div
              key={item.id}
              className="space-y-3 rounded-xl border border-border p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.product_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isUrdu ? "ماڈل نمبر" : "Model Number"}: {item.model_number}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isUrdu ? "انوینٹری اسٹیٹس" : "Inventory Status"}:{" "}
                    {item.inventory_status}
                  </p>
                </div>

                <p className="font-bold text-foreground">
                  {formatCurrency(item.return_amount)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(
                    ["good", "damaged", "needs_repair"] as ReturnItemCondition[]
                  ).map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      disabled={!isPending || Boolean(item.inspected_at)}
                      onClick={() => updateCondition(item.id, condition)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        conditions[item.id] === condition
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {conditionLabel(condition)}
                    </button>
                  ))}
                </div>

                {item.inspected_at && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                    <CheckCircle2 size={14} />
                    {isUrdu ? "معائنہ مکمل" : "Inspected"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {isPending && pendingItems.length > 0 && (
          <button
            type="button"
            onClick={handleInspection}
            disabled={savingInspection}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {savingInspection
              ? isUrdu
                ? "محفوظ ہو رہا ہے..."
                : "Saving Inspection..."
              : isUrdu
                ? "معائنہ محفوظ کریں"
                : "Save Inspection"}
          </button>
        )}
      </section>

      {/* Refund history */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-bold text-foreground">
          {isUrdu ? "ریفنڈ کی تفصیلات" : "Refund History"}
        </h2>

        {details.refunds.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isUrdu ? "ابھی کوئی ریفنڈ نہیں ہوا۔" : "No refund recorded yet."}
          </p>
        ) : (
          details.refunds.records.map((refund) => (
            <div
              key={refund.id}
              className="flex flex-wrap justify-between gap-3 border-b border-border pb-3 last:border-0"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {formatCurrency(refund.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {refund.payment_method} · {formatDate(refund.refund_date)}
                </p>
                {refund.reference_number && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {refund.reference_number}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Complete refund */}
      {isPending && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-bold text-foreground">
            {isUrdu ? "ریٹرن مکمل کریں" : "Complete Return"}
          </h2>

          {!allInspected ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600">
              <AlertCircle size={18} />
              {isUrdu
                ? "تمام آئٹمز کا معائنہ کرنے کے بعد ریٹرن مکمل کر سکتے ہیں۔"
                : "Inspect every returned item before completing this return."}
            </div>
          ) : details.return_type === "exchange" ? (
            <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600">
              {isUrdu
                ? "ایکسچینج مکمل کرنے کا عمل اگلے مرحلے میں شامل ہوگا۔"
                : "Exchange completion will be implemented in the next step."}
            </div>
          ) : (
            <>
              {/* Return Summary */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {isUrdu ? "واپسی کی کل رقم" : "Return Total"}
                  </p>
                  <p className="mt-1 font-bold text-foreground">
                    {formatCurrency(details.return_total)}
                  </p>
                </div>

                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {isUrdu ? "زیادہ سے زیادہ ریفنڈ" : "Maximum Refund"}
                  </p>
                  <p className="mt-1 font-bold text-green-600">
                    {formatCurrency(refundAmount)}
                  </p>
                </div>
              </div>

              {/* Owner Enters Refund Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  {isUrdu ? "ریفنڈ کی رقم درج کریں" : "Enter Refund Amount"}
                </label>

                <input
                  type="number"
                  min="0"
                  max={refundAmount}
                  step="0.01"
                  value={refundInput}
                  onChange={(e) => setRefundInput(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground sm:max-w-xs"
                />

                <p className="text-xs text-muted-foreground">
                  {isUrdu
                    ? `آپ زیادہ سے زیادہ ${formatCurrency(refundAmount)} واپس کر سکتے ہیں۔`
                    : `You can refund up to ${formatCurrency(refundAmount)}.`}
                </p>

                {!isRefundAmountValid && (
                  <p className="text-xs text-destructive">
                    {isUrdu
                      ? "درست رقم درج کریں۔ ریفنڈ زیادہ سے زیادہ دستیاب رقم تک ہو سکتا ہے۔"
                      : "Enter a valid amount not exceeding the maximum refundable amount."}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              {isRefundAmountValid && selectedRefundAmount > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    {isUrdu ? "ریفنڈ کا طریقہ" : "Refund Payment Method"}
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground sm:max-w-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Complete Button */}
              <button
                type="button"
                onClick={handleCompleteReturn}
                disabled={completing || !isRefundAmountValid}
                className="w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
              >
                {completing
                  ? isUrdu
                    ? "مکمل ہو رہا ہے..."
                    : "Completing..."
                  : isUrdu
                    ? "ریفنڈ مکمل کریں"
                    : "Complete Refund"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
