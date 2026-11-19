"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { useLanguage } from "@/context/language-context";
import InvoicePdf from "./components/InvoicePdf";
import InvoicePrint from "./components/InvoicePrint";
import SalePageHeader from "./components/SalePageHeader";
import { useSaleDetails } from "./hooks/useSaleDetails";
import { useInvoiceActions } from "./hooks/useInvoiceActions";
import SaleLoading from "../../../../components/skeletons/SaleLoading";
import SaleError from "./components/SaleError";
import CreateSaleReturn from "./components/CreateSaleReturn";

export default function SaleDetailsPage() {
  const params = useParams<{ saleId: string }>();
  const saleId = params.saleId;
  const [showReturnForm, setShowReturnForm] = useState(false);

  const invoicePdfRef = useRef<HTMLDivElement>(null);

  const { isUrdu } = useLanguage();

  const { details, loading, error, fetchDetails } = useSaleDetails(
    saleId,
    isUrdu,
  );

  const {
    generatingPDF,
    generatedPDF,
    sendOnWhatsApp,
    shareInvoicePDF,
    shareGeneratedPDF,
  } = useInvoiceActions(details, isUrdu, invoicePdfRef);

  if (loading) {
    return (
      <SaleLoading
        printingEnabled={details?.sale.printing_enabled ?? false}
        isUrdu={isUrdu}
      />
    );
  }

  if (error || !details) {
    return <SaleError error={error} isUrdu={isUrdu} onRetry={fetchDetails} />;
  }

  const { sale, items, payments } = details;

  const totalAmount = Number(sale.total_amount) || 0;
  const discount = Number(sale.discount) || 0;
  const tax = Number(sale.tax) || 0;
  const paidAmount = Number(sale.paid_amount) || 0;
  const remainingBalance = Math.max(0, Number(sale.remaining_balance) || 0);

  const subtotal = totalAmount + discount - tax;

  const isFullyPaid = remainingBalance <= 0;

  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      className="mx-auto w-full max-w-5xl space-y-4 pb-6 sm:space-y-6"
    >
      <SalePageHeader
        saleNumber={sale.sale_number}
        printingEnabled={sale.printing_enabled}
        phone={sale.phone}
        isUrdu={isUrdu}
        loading={loading}
        generatingPDF={generatingPDF}
        generatedPDF={!!generatedPDF}
        onRefresh={fetchDetails}
        onPrint={() => window.print()}
        onGeneratePDF={shareInvoicePDF}
        onSharePDF={shareGeneratedPDF}
        onWhatsApp={sendOnWhatsApp}
      />
      {sale.status === "completed" &&
        sale.return_status !== "fully_returned" && (
          <div className="no-print flex justify-end">
            <button
              type="button"
              onClick={() => setShowReturnForm(true)}
              className="rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              {isUrdu ? "آئٹمز واپس کریں" : "Return Items"}
            </button>
          </div>
        )}

      <InvoicePrint
        sale={sale}
        items={items}
        payments={payments}
        isUrdu={isUrdu}
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
        remainingBalance={remainingBalance}
        isFullyPaid={isFullyPaid}
      />

      {sale.notes && (
        <section className="no-print rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground sm:text-base">
            {isUrdu ? "اندرونی نوٹس" : "Internal Notes"}
          </h2>

          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {sale.notes}
          </p>
        </section>
      )}

      <InvoicePdf
        invoicePdfRef={invoicePdfRef}
        sale={sale}
        items={items}
        payments={payments}
        isUrdu={isUrdu}
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
        remainingBalance={remainingBalance}
        isFullyPaid={isFullyPaid}
      />

      {showReturnForm && (
        <CreateSaleReturn
          saleId={saleId}
          items={items}
          isUrdu={isUrdu}
          onClose={() => setShowReturnForm(false)}
          onCreated={fetchDetails}
        />
      )}
    </div>
  );
}
