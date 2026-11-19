import type { SaleDetailsResponse } from "@/types/sales";

interface InvoicePrintProps {
  sale: SaleDetailsResponse["data"]["sale"];
  items: SaleDetailsResponse["data"]["items"];
  payments: SaleDetailsResponse["data"]["payments"];
  isUrdu: boolean;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  isFullyPaid: boolean;
}

const money = (value: number | string) => {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;
};

const formatDate = (date: string, isUrdu: boolean) => {
  return new Date(date).toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusLabel = (status: string) => {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const paymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    easypaisa: "Easypaisa",
    jazzcash: "JazzCash",
    card: "Card",
  };

  return labels[method] || statusLabel(method);
};

const InvoicePrint = ({
  sale,
  items,
  payments,
  isUrdu,
  subtotal,
  discount,
  tax,
  totalAmount,
  paidAmount,
  remainingBalance,
  isFullyPaid,
}: InvoicePrintProps) => {
  const actualTotalCost = Number(sale.actual_total_cost) || 0;
  const actualGrossProfit = Number(sale.actual_gross_profit) || 0;
  const actualProfit = Number(sale.actual_profit) || 0;
  const returnedSaleAmount = Number(sale.returned_sale_amount) || 0;
  const returnedGoodCost = Number(sale.returned_good_cost) || 0;
  const returnedDiscount = Number(sale.returned_discount) || 0;

  const isProfit = actualProfit >= 0;
  return (
    <div className="invoice-print space-y-4 sm:space-y-5">
      {/* Shop Header */}
      <section className="rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
        <h2 className="break-words text-xl font-bold text-foreground sm:text-2xl">
          {sale.shop_name}
        </h2>

        {sale.shop_address && (
          <p className="mt-1 text-sm text-muted-foreground">
            {sale.shop_address}
          </p>
        )}

        {sale.shop_phone && (
          <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
            {isUrdu ? "فون" : "Phone"}: {sale.shop_phone}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4 sm:mt-5">
          <h3 className="text-base font-bold tracking-wide sm:text-lg">
            {isUrdu ? "فروخت کا بل" : "SALES INVOICE"}
          </h3>

          <p
            className="mt-1 text-sm font-medium text-muted-foreground"
            dir="ltr"
          >
            {sale.sale_number}
          </p>
        </div>
      </section>

      {/* Bill and Customer Information */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {/* Bill Information */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "بل کی معلومات" : "Bill Information"}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "بل نمبر" : "Bill Number"}
              </span>
              <span className="font-semibold text-foreground" dir="ltr">
                {sale.sale_number}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "فروخت کی تاریخ" : "Sale Date"}
              </span>
              <span className="text-foreground">
                {formatDate(sale.sale_date, isUrdu)}
              </span>
            </div>

            <div className="no-print flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "حیثیت" : "Status"}
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                {statusLabel(sale.status)}
              </span>
            </div>
          </div>
        </section>

        {/* Customer Information */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "گاہک کی معلومات" : "Customer Information"}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "نام" : "Name"}
              </span>
              <span className="max-w-[65%] break-words text-end font-semibold text-foreground">
                {sale.customer_name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "فون" : "Phone"}
              </span>
              <span className="text-foreground" dir="ltr">
                {sale.phone || (isUrdu ? "موجود نہیں" : "Not provided")}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Furniture Items */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "فرنیچر کی اشیاء" : "Furniture Items"}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} {isUrdu ? "اشیاء" : "items"}
          </p>
        </div>

        {/* Mobile Item Cards */}
        <div className="divide-y divide-border sm:hidden">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {item.product_name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {isUrdu ? "آئٹم" : "Item"} #{index + 1}
                  </p>
                </div>

                <p
                  className="shrink-0 text-sm font-bold text-foreground"
                  dir="ltr"
                >
                  {money(item.unit_sale_price)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {isUrdu ? "ماڈل نمبر" : "Model Number"}
                </p>

                <p
                  className="mt-0.5 break-all text-sm font-medium text-foreground"
                  dir="ltr"
                >
                  {item.model_number}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                {isUrdu ? "مقدار:" : "Quantity:"} {item.quantity}
              </p>
            </div>
          ))}

          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isUrdu ? "کوئی آئٹم نہیں ملا۔" : "No items found."}
            </p>
          )}
        </div>

        {/* Desktop Item Table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start no-print ">
                  {isUrdu ? "ماڈل نمبر / کوڈ" : "Model Number"}
                </th>

                <th className="px-5 py-3 text-start">
                  {isUrdu ? "فرنیچر" : "Furniture"}
                </th>

                <th className="px-5 py-3 text-end">
                  {isUrdu ? "مقدار" : "Quantity"}
                </th>

                <th className="px-5 py-3 text-end">
                  {isUrdu ? "فی یونٹ قیمت" : "Unit Price"}
                </th>

                <th className="px-5 py-3 text-end">
                  {isUrdu ? "کل قیمت" : "Total Price"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td
                    className="px-5 py-4 font-medium text-foreground"
                    dir="ltr"
                  >
                    {item.model_number}
                  </td>

                  <td className="px-5 py-4 text-foreground">
                    {item.product_name}
                  </td>

                  <td className="px-5 py-4 text-end" dir="ltr">
                    {item.quantity}
                  </td>

                  <td className="px-5 py-4 text-end" dir="ltr">
                    {money(item.unit_sale_price)}
                  </td>

                  <td className="px-5 py-4 text-end font-medium" dir="ltr">
                    {money(Number(item.unit_sale_price) * item.quantity)}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-muted-foreground"
                  >
                    {isUrdu ? "کوئی آئٹم نہیں ملا۔" : "No items found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment History and Bill Summary */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {/* Payment History */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "ادائیگیوں کی تاریخ" : "Payment History"}
          </h2>

          {payments.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              {isUrdu ? "کوئی ادائیگی درج نہیں۔" : "No payments recorded."}
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {paymentMethodLabel(payment.payment_method)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleString(
                        isUrdu ? "ur-PK" : "en-PK",
                      )}
                    </p>

                    {payment.reference_number && (
                      <p
                        className="mt-1 break-all text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {isUrdu ? "حوالہ" : "Reference"}:{" "}
                        {payment.reference_number}
                      </p>
                    )}
                  </div>

                  <p
                    className="shrink-0 text-sm font-bold text-green-600"
                    dir="ltr"
                  >
                    {money(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bill Summary */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "بل کا خلاصہ" : "Bill Summary"}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "ذیلی کل" : "Subtotal"}
              </span>
              <span className="text-foreground" dir="ltr">
                {money(subtotal)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "رعایت" : "Discount"}
              </span>
              <span className="text-foreground" dir="ltr">
                - {money(discount)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "ٹیکس" : "Tax"}
              </span>
              <span className="text-foreground" dir="ltr">
                {money(tax)}
              </span>
            </div>

            <div className="flex justify-between gap-3 border-t border-border pt-3 font-bold">
              <span className="text-foreground">
                {isUrdu ? "کل رقم" : "Total Amount"}
              </span>
              <span className="text-foreground" dir="ltr">
                {money(totalAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {isUrdu ? "وصول شدہ رقم" : "Amount Paid"}
              </span>
              <span className="font-semibold text-green-600" dir="ltr">
                {money(paidAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-medium text-foreground">
                {isUrdu ? "باقی رقم" : "Remaining Balance"}
              </span>
              <span
                dir="ltr"
                className={`font-bold ${
                  isFullyPaid ? "text-green-600" : "text-red-600"
                }`}
              >
                {money(remainingBalance)}
              </span>
            </div>

            <div className="no-print border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-foreground">
                  {isUrdu ? "ادائیگی کی حیثیت" : "Payment Status"}
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    isFullyPaid
                      ? "bg-green-500/10 text-green-600"
                      : "bg-orange-500/10 text-orange-600"
                  }`}
                >
                  {isFullyPaid
                    ? isUrdu
                      ? "مکمل ادائیگی"
                      : "Fully Paid"
                    : isUrdu
                      ? "جزوی ادائیگی"
                      : "Partially Paid"}
                </span>
              </div>
            </div>

            {/* Internal Business Summary - Not Printed */}
            <div className="no-print space-y-3 border-t border-border pt-3">
              <h3 className="text-sm font-bold text-foreground">
                {isUrdu ? "کاروباری منافع کا خلاصہ" : "Internal Profit Summary"}
              </h3>
              {returnedSaleAmount > 0 && (
                <>
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="mb-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                      {isUrdu ? "واپسی کا خلاصہ" : "Return Summary"}
                    </p>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {isUrdu
                          ? "واپس کیے گئے فرنیچر کی رقم"
                          : "Returned Item Value"}
                      </span>
                      <span className="font-semibold text-foreground" dir="ltr">
                        {money(returnedSaleAmount)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {isUrdu ? "واپس شدہ ڈسکاؤنٹ" : "Returned Discount"}
                      </span>
                      <span className="font-semibold text-foreground" dir="ltr">
                        {money(returnedDiscount)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {isUrdu
                          ? "اچھی حالت میں واپس شدہ لاگت"
                          : "Returned Good Item Cost"}
                      </span>
                      <span className="font-semibold text-foreground" dir="ltr">
                        {money(returnedGoodCost)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {isUrdu ? "اصل کل لاگت" : "Actual Total Cost"}
                </span>

                <span className="font-semibold text-foreground" dir="ltr">
                  {money(actualTotalCost)}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {isUrdu ? "مجموعی منافع" : "Gross Profit"}
                </span>

                <span
                  className={`font-semibold ${
                    actualGrossProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                  dir="ltr"
                >
                  {money(actualGrossProfit)}
                </span>
              </div>

              <div className="flex justify-between gap-3 rounded-lg bg-muted p-3">
                <span className="font-bold text-foreground">
                  {isUrdu ? "اصل منافع / نقصان" : "Actual Profit / Loss"}
                </span>

                <span
                  className={`font-bold ${
                    isProfit ? "text-green-600" : "text-red-600"
                  }`}
                  dir="ltr"
                >
                  {money(actualProfit)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Invoice Footer */}
      <section className="rounded-2xl border border-border bg-card p-4 text-center sm:p-5">
        <p className="text-sm font-semibold text-foreground">
          {isUrdu ? "آپ کے کاروبار کا شکریہ۔" : "Thank you for your business."}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {isUrdu
            ? "ہم آپ کے اعتماد کی قدر کرتے ہیں اور دوبارہ خدمت کے منتظر ہیں۔"
            : "We appreciate your trust and look forward to serving you again."}
        </p>
      </section>
    </div>
  );
};

export default InvoicePrint;
