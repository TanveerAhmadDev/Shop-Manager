"use client";

import type { NewSalePaymentProps } from "./types";
import type { PaymentMethod } from "./types";

const NewSalePayment = ({
  isUrdu,
  discount,
  setDiscount,
  tax,
  setTax,
  subtotal,
  discountValue,
  taxValue,
  total,
  showCostDetails,
  totalLandedCost,
  expectedProfit,
  paymentAmount,
  setPaymentAmount,
  isPaymentInvalid,
  paymentMethod,
  setPaymentMethod,
  paymentMethods,
  referenceNumber,
  setReferenceNumber,
  paid,
  balance,
  formatMoney,
}: NewSalePaymentProps) => {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold text-foreground">
        {isUrdu ? "ادائیگی اور بل کا خلاصہ" : "Payment & Bill Summary"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isUrdu
          ? "رعایت، ٹیکس اور وصول شدہ رقم درج کریں۔"
          : "Set discount, tax, and the amount received."}
      </p>

      {/* Discount and Tax */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="sale-discount"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            {isUrdu ? "رعایت (روپے)" : "Discount (Rs.)"}
          </label>
          <input
            id="sale-discount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            dir="ltr"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="sale-tax"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            {isUrdu ? "ٹیکس (روپے)" : "Tax (Rs.)"}
          </label>
          <input
            id="sale-tax"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            dir="ltr"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </div>
      </div>

      {/* Bill Calculation */}
      <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {isUrdu ? "ذیلی کل" : "Subtotal"}
          </span>
          <span className="font-medium text-foreground" dir="ltr">
            {formatMoney(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {isUrdu ? "رعایت" : "Discount"}
          </span>
          <span className="text-foreground" dir="ltr">
            - {formatMoney(discountValue)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {isUrdu ? "ٹیکس" : "Tax"}
          </span>
          <span className="text-foreground" dir="ltr">
            {formatMoney(taxValue)}
          </span>
        </div>

        {showCostDetails && (
          <>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-muted-foreground">
                {isUrdu ? "کل اصل لاگت" : "Total Landed Cost"}
              </span>
              <span className="font-medium text-foreground" dir="ltr">
                {formatMoney(totalLandedCost)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <span className="font-semibold text-green-800 dark:text-green-400">
                {isUrdu ? "متوقع منافع" : "Expected Profit"}
              </span>
              <span
                className={`font-bold ${
                  expectedProfit >= 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
                dir="ltr"
              >
                {formatMoney(expectedProfit)}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="font-bold text-foreground">
            {isUrdu ? "کل رقم" : "Bill Total"}
          </span>
          <span className="text-lg font-bold text-foreground" dir="ltr">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      {/* Amount Paid */}
      <div className="mt-5 border-t border-border pt-4">
        <div>
          <label
            htmlFor="sale-paid"
            className="mb-1.5 block text-sm font-semibold text-foreground"
          >
            {isUrdu ? "وصول شدہ رقم (روپے)" : "Amount Received (Rs.)"}
          </label>

          <input
            id="sale-paid"
            type="number"
            min="0"
            max={total}
            step="0.01"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            dir="ltr"
            aria-invalid={isPaymentInvalid}
            aria-describedby={isPaymentInvalid ? "payment-error" : undefined}
            className={`h-12 w-full rounded-lg border bg-background px-3 text-base font-semibold text-foreground outline-none focus-visible:ring-2 sm:text-sm ${
              isPaymentInvalid
                ? "border-red-500 focus-visible:ring-red-500"
                : "border-input focus-visible:ring-ring"
            }`}
          />

          {isPaymentInvalid && (
            <p id="payment-error" className="mt-1.5 text-xs text-red-500">
              {isUrdu
                ? `ادائیگی کل رقم (${formatMoney(total)}) سے زیادہ نہیں ہو سکتی۔`
                : `Payment cannot exceed ${formatMoney(total)}.`}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div className="mt-4">
          <label
            htmlFor="payment-method"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {isUrdu ? "ادائیگی کا طریقہ" : "Payment Method"}
          </label>

          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reference Number */}
        <div className="mt-4">
          <label
            htmlFor="payment-reference"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {isUrdu ? "حوالہ نمبر (اختیاری)" : "Reference Number (Optional)"}
          </label>

          <input
            id="payment-reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={
              isUrdu ? "ٹرانزیکشن کا حوالہ نمبر" : "Transaction reference"
            }
            dir="ltr"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </div>
      </div>

      {/* Paid and Remaining Balance */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-green-500/10 p-3">
          <p className="text-xs text-green-700 dark:text-green-400">
            {isUrdu ? "وصول شدہ" : "Paid"}
          </p>
          <p
            className="mt-1 text-base font-bold text-green-700 dark:text-green-400"
            dir="ltr"
          >
            {formatMoney(paid)}
          </p>
        </div>

        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            {isUrdu ? "باقی رقم" : "Remaining"}
          </p>
          <p className="mt-1 text-base font-bold text-foreground" dir="ltr">
            {formatMoney(balance)}
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewSalePayment;
