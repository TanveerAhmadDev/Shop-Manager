import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  FileDown,
  MessageCircle,
} from "lucide-react";

interface SalePageHeaderProps {
  saleNumber: string;
  printingEnabled: boolean;
  phone: string | null | undefined;
  isUrdu: boolean;
  loading: boolean;
  generatingPDF: boolean;
  generatedPDF: boolean;
  onRefresh: () => void;
  onPrint: () => void;
  onGeneratePDF: () => void;
  onSharePDF: () => void;
  onWhatsApp: () => void;
}

const SalePageHeader = ({
  saleNumber,
  printingEnabled,
  phone,
  isUrdu,
  loading,
  generatingPDF,
  generatedPDF,
  onRefresh,
  onPrint,
  onGeneratePDF,
  onSharePDF,
  onWhatsApp,
}: SalePageHeaderProps) => {
  return (
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/sales"
          className="shrink-0 rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:bg-muted"
        >
          <ArrowLeft size={19} className={isUrdu ? "rotate-180" : ""} />
        </Link>

        <div className="min-w-0">
          <h1
            className="truncate text-xl font-bold text-foreground sm:text-2xl"
            dir="ltr"
          >
            {saleNumber}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isUrdu
              ? "فروخت کی تفصیلات اور ادائیگیوں کی تاریخ"
              : "Sale details and payment history"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`grid gap-2 sm:flex ${printingEnabled}?"grid-cols-2":"grid-cols-1"`}
      >
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          title={isUrdu ? "تازہ کریں" : "Refresh"}
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          <span className="sm:hidden">{isUrdu ? "تازہ کریں" : "Refresh"}</span>
        </button>

        {printingEnabled && (
          <>
            <button
              onClick={onPrint}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-sm font-semibold text-background transition hover:opacity-80 sm:px-4"
            >
              <Printer size={17} />
              {isUrdu ? "پرنٹ" : "Print"}
            </button>
            <button
              onClick={onGeneratePDF}
              disabled={generatingPDF}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              <FileDown size={17} />
              {generatingPDF
                ? isUrdu
                  ? "PDF تیار ہو رہی ہے..."
                  : "Generating PDF..."
                : isUrdu
                  ? "PDF بنائیں"
                  : "Generate PDF"}
            </button>

            {generatedPDF && (
              <button
                onClick={onSharePDF}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 text-sm font-semibold text-white transition hover:bg-green-700 sm:px-4"
              >
                <MessageCircle size={17} />
                {isUrdu ? "واٹس ایپ پر بھیجیں" : "Share PDF"}
              </button>
            )}
          </>
        )}

        <button
          onClick={onWhatsApp}
          disabled={!phone}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          <MessageCircle size={17} />
          WhatsApp
        </button>
      </div>
    </div>
  );
};

export default SalePageHeader;
