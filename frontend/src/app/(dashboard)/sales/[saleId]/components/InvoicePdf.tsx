import type { RefObject } from "react";
import type { SaleDetailsResponse } from "@/types/sales";

interface InvoicePdfProps {
  invoicePdfRef: RefObject<HTMLDivElement | null>;
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

// Currency formatter
const money = (value: number | string) => {
  const amount = Number(value);

  return `Rs. ${
    Number.isFinite(amount)
      ? amount.toLocaleString("en-PK", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : "0"
  }`;
};

// Date formatter
const formatDate = (date: string, isUrdu: boolean) => {
  return new Date(date).toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function InvoicePdf({
  invoicePdfRef,
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
}: InvoicePdfProps) {
  // Translate payment methods
  function paymentMethodLabel(method: string) {
    if (!isUrdu) {
      return method.charAt(0).toUpperCase() + method.slice(1);
    }

    const translations: Record<string, string> = {
      cash: "نقد",
      bank: "بینک",
      easypaisa: "ایزی پیسہ",
      jazzcash: "جاز کیش",
      other: "دیگر",
    };

    return translations[method.toLowerCase()] || method;
  }

  return (
    <div
      ref={invoicePdfRef}
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      style={{
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "794px",
        padding: "48px",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "3px solid #2A6A8B",
          paddingBottom: "24px",
          marginBottom: "28px",
          gap: "20px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: 700,
              color: "#17384b",
              overflowWrap: "anywhere",
            }}
          >
            {sale.shop_name}
          </h1>

          {sale.shop_address && (
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              {sale.shop_address}
            </p>
          )}

          {sale.shop_phone && (
            <p style={{ margin: "4px 0 0", color: "#64748b" }} dir="ltr">
              {sale.shop_phone}
            </p>
          )}
        </div>

        <div
          style={{ textAlign: isUrdu ? "left" : "right", minWidth: "190px" }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "25px",
              fontWeight: 700,
              color: "#2A6A8B",
            }}
          >
            {isUrdu ? "فروخت کا بل" : "INVOICE"}
          </h2>

          <p style={{ margin: "10px 0 0", fontWeight: 700 }} dir="ltr">
            {sale.sale_number}
          </p>

          <p style={{ margin: "4px 0 0", color: "#64748b" }}>
            {formatDate(sale.sale_date, isUrdu)}
          </p>
        </div>
      </div>

      {/* Customer and invoice information */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "18px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{ margin: "0 0 12px", fontSize: "15px", color: "#2A6A8B" }}
          >
            {isUrdu ? "گاہک کی معلومات" : "CUSTOMER DETAILS"}
          </h3>

          <p style={{ margin: "4px 0", fontWeight: 600 }}>
            {sale.customer_name}
          </p>

          <p style={{ margin: "4px 0", color: "#64748b" }} dir="ltr">
            {sale.phone || "—"}
          </p>
        </div>

        <div
          style={{
            flex: 1,
            padding: "18px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{ margin: "0 0 12px", fontSize: "15px", color: "#2A6A8B" }}
          >
            {isUrdu ? "بل کی معلومات" : "INVOICE DETAILS"}
          </h3>

          <p style={{ margin: "4px 0" }}>
            <strong>{isUrdu ? "بل نمبر:" : "Invoice:"}</strong>{" "}
            <span dir="ltr">{sale.sale_number}</span>
          </p>

          <p style={{ margin: "4px 0" }}>
            <strong>{isUrdu ? "تاریخ:" : "Date:"}</strong>{" "}
            {formatDate(sale.sale_date, isUrdu)}
          </p>
        </div>
      </div>

      {/* Furniture items */}
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "17px",
          color: "#17384b",
        }}
      >
        {isUrdu ? "فرنیچر کی تفصیلات" : "FURNITURE DETAILS"}
      </h3>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginBottom: "28px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#17384b", color: "#ffffff" }}>
            <th
              style={{ padding: "12px 10px", textAlign: "left", width: "8%" }}
            >
              #
            </th>

            <th
              style={{
                padding: "12px 10px",
                textAlign: "left",
                width: "27%",
              }}
            >
              {isUrdu ? "ماڈل نمبر" : "Model Number"}
            </th>

            <th
              style={{
                padding: "12px 10px",
                textAlign: "left",
                width: "40%",
              }}
            >
              {isUrdu ? "فرنیچر" : "Furniture"}
            </th>

            <th
              style={{
                padding: "12px 10px",
                textAlign: "right",
                width: "25%",
              }}
            >
              {isUrdu ? "قیمت" : "Price"}
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
              }}
            >
              <td
                style={{
                  padding: "12px 10px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {index + 1}
              </td>

              <td
                dir="ltr"
                style={{
                  padding: "12px 10px",
                  borderBottom: "1px solid #e2e8f0",
                  overflowWrap: "anywhere",
                }}
              >
                {item.model_number}
              </td>

              <td
                style={{
                  padding: "12px 10px",
                  borderBottom: "1px solid #e2e8f0",
                  overflowWrap: "anywhere",
                }}
              >
                {item.product_name}
              </td>

              <td
                dir="ltr"
                style={{
                  padding: "12px 10px",
                  borderBottom: "1px solid #e2e8f0",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                {money(item.unit_sale_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment history and totals */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3
            style={{ margin: "0 0 12px", color: "#17384b", fontSize: "16px" }}
          >
            {isUrdu ? "ادائیگیوں کی تاریخ" : "PAYMENT HISTORY"}
          </h3>

          {payments.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              {isUrdu ? "کوئی ادائیگی درج نہیں۔" : "No payments recorded."}
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "9px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {paymentMethodLabel(payment.payment_method)}
                  </p>

                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    {formatDate(payment.payment_date, isUrdu)}
                  </p>
                </div>

                <strong dir="ltr" style={{ whiteSpace: "nowrap" }}>
                  {money(payment.amount)}
                </strong>
              </div>
            ))
          )}
        </div>

        {/* Bill summary */}
        <div
          style={{
            width: "285px",
            padding: "18px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          {[
            [isUrdu ? "ذیلی کل" : "Subtotal", money(subtotal)],
            [isUrdu ? "رعایت" : "Discount", `- ${money(discount)}`],
            [isUrdu ? "ٹیکس" : "Tax", money(tax)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <span>{label}</span>
              <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
                {value}
              </span>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #cbd5e1",
              paddingTop: "12px",
              marginTop: "8px",
              fontSize: "17px",
              fontWeight: 700,
              gap: "10px",
            }}
          >
            <span>{isUrdu ? "کل رقم" : "Total"}</span>
            <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
              {money(totalAmount)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "12px",
              gap: "10px",
            }}
          >
            <span>{isUrdu ? "وصول شدہ" : "Paid"}</span>
            <strong dir="ltr" style={{ whiteSpace: "nowrap" }}>
              {money(paidAmount)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
              color: remainingBalance > 0 ? "#dc2626" : "#15803d",
              fontWeight: 700,
              gap: "10px",
            }}
          >
            <span>{isUrdu ? "باقی رقم" : "Balance Due"}</span>
            <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
              {money(remainingBalance)}
            </span>
          </div>

          <p
            style={{
              margin: "14px 0 0",
              padding: "8px",
              borderRadius: "5px",
              textAlign: "center",
              backgroundColor: isFullyPaid ? "#dcfce7" : "#ffedd5",
              color: isFullyPaid ? "#166534" : "#9a3412",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            {isFullyPaid
              ? isUrdu
                ? "مکمل ادائیگی"
                : "FULLY PAID"
              : isUrdu
                ? "جزوی ادائیگی"
                : "PARTIALLY PAID"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "45px",
          paddingTop: "18px",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          color: "#64748b",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "#17384b" }}>
          {isUrdu ? "آپ کے کاروبار کا شکریہ!" : "Thank you for your business!"}
        </p>

        <p style={{ margin: "5px 0 0", fontSize: "12px" }}>{sale.shop_name}</p>
      </div>
    </div>
  );
}
