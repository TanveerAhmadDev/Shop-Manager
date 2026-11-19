import { useState, type RefObject } from "react";
import type { SaleDetailsResponse } from "@/types/sales";

type SaleDetails = SaleDetailsResponse["data"];

export function useInvoiceActions(
  details: SaleDetails | null,
  isUrdu: boolean,
  invoicePdfRef: RefObject<HTMLDivElement | null>,
) {
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatedPDF, setGeneratedPDF] = useState<File | null>(null);

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

  const formatDate = (date: string, urdu: boolean) => {
    return new Date(date).toLocaleDateString(urdu ? "ur-PK" : "en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  function formatWhatsAppNumber(phone: string) {
    let number = phone.replace(/\D/g, "");

    if (number.startsWith("00")) {
      number = number.slice(2);
    }

    if (number.startsWith("03")) {
      number = "92" + number.slice(1);
    } else if (number.startsWith("3")) {
      number = "92" + number;
    }

    return number;
  }

  // Send bill through WhatsApp
  function sendOnWhatsApp() {
    if (!details) return;

    const { sale, items } = details;
    const phone = sale.phone;

    if (!phone) {
      alert(
        isUrdu
          ? "گاہک کا فون نمبر موجود نہیں ہے۔"
          : "Customer phone number is not available.",
      );
      return;
    }

    const whatsappNumber = formatWhatsAppNumber(phone);

    if (!/^923\d{9}$/.test(whatsappNumber)) {
      alert(
        isUrdu
          ? "براہ کرم گاہک کا واٹس ایپ نمبر چیک کریں۔"
          : "Please check the customer's WhatsApp number.",
      );
      return;
    }

    const totalAmount = Number(sale.total_amount) || 0;
    const discount = Number(sale.discount) || 0;
    const tax = Number(sale.tax) || 0;
    const paidAmount = Number(sale.paid_amount) || 0;
    const remainingBalance = Math.max(0, Number(sale.remaining_balance) || 0);

    const subtotal = totalAmount + discount - tax;
    const isFullyPaid = remainingBalance <= 0;

    const itemDetails = items
      .map(
        (item, index) =>
          `${index + 1}. ${item.product_name}\n` +
          `   ${isUrdu ? "ماڈل نمبر" : "Model Number"}: ${item.model_number}\n` +
          `   ${isUrdu ? "قیمت" : "Price"}: ${money(item.unit_sale_price)}`,
      )
      .join("\n");

    const message = isUrdu
      ? `
*${sale.shop_name}*
${sale.shop_phone ? `فون: ${sale.shop_phone}` : ""}
${sale.shop_address ? `پتہ: ${sale.shop_address}` : ""}

*فروخت کا بل*
بل نمبر: ${sale.sale_number}
تاریخ: ${formatDate(sale.sale_date, true)}
گاہک: ${sale.customer_name}

*خریداری کی تفصیلات*
${itemDetails}

*ادائیگی کا خلاصہ*
ذیلی کل: ${money(subtotal)}
رعایت: ${money(discount)}
ٹیکس: ${money(tax)}
کل رقم: ${money(totalAmount)}
وصول شدہ رقم: ${money(paidAmount)}
باقی رقم: ${money(remainingBalance)}
ادائیگی کی حیثیت: ${isFullyPaid ? "مکمل ادائیگی" : "جزوی ادائیگی"}

${
  isFullyPaid
    ? "آپ کی مکمل ادائیگی موصول ہو گئی ہے۔"
    : "براہ کرم اپنی باقی رقم جلد ادا کریں۔"
}

آپ کے کاروبار کا شکریہ۔ ہم آپ کے اعتماد کی قدر کرتے ہیں۔

*${sale.shop_name}*
      `.trim()
      : `
*${sale.shop_name}*
${sale.shop_phone ? `Phone: ${sale.shop_phone}` : ""}
${sale.shop_address ? `Address: ${sale.shop_address}` : ""}

*SALES INVOICE*
Bill Number: ${sale.sale_number}
Date: ${formatDate(sale.sale_date, false)}
Customer: ${sale.customer_name}

*PURCHASE DETAILS*
${itemDetails}

*PAYMENT SUMMARY*
Subtotal: ${money(subtotal)}
Discount: ${money(discount)}
Tax: ${money(tax)}
Total Amount: ${money(totalAmount)}
Amount Paid: ${money(paidAmount)}
Remaining Balance: ${money(remainingBalance)}
Payment Status: ${isFullyPaid ? "Fully Paid" : "Partially Paid"}

${
  isFullyPaid
    ? "Your payment has been received in full."
    : "Please clear the remaining balance at your earliest convenience."
}

Thank you for your business. We appreciate your trust in us and look forward to serving you again.

*${sale.shop_name}*
      `.trim();

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  // Generate invoice PDF
  async function shareInvoicePDF() {
    if (!details) return;

    const invoice = invoicePdfRef.current;

    if (!invoice) {
      alert(isUrdu ? "بل تیار نہیں ہے۔" : "Invoice is not available.");
      return;
    }

    try {
      setGeneratingPDF(true);
      setGeneratedPDF(null);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(invoice, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 190;
      const pageHeight = 277;

      const pagePixelHeight = Math.floor(
        (canvas.width * pageHeight) / pageWidth,
      );

      let currentY = 0;
      let pageNumber = 0;

      while (currentY < canvas.height) {
        const remainingHeight = canvas.height - currentY;
        const sliceHeight = Math.min(pagePixelHeight, remainingHeight);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const context = pageCanvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create PDF canvas.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        context.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        if (pageNumber > 0) {
          pdf.addPage("a4", "portrait");
        }

        const imageHeight = (sliceHeight * pageWidth) / canvas.width;

        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          10,
          10,
          pageWidth,
          imageHeight,
          undefined,
          "FAST",
        );

        currentY += sliceHeight;
        pageNumber++;
      }

      const pdfBlob = pdf.output("blob");

      const fileName = `${details.sale.sale_number.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf",
      });

      setGeneratedPDF(pdfFile);
    } catch (err) {
      console.error("Invoice PDF error:", err);

      alert(
        isUrdu
          ? "PDF تیار نہیں ہو سکی۔ دوبارہ کوشش کریں۔"
          : "Unable to generate the invoice PDF. Please try again.",
      );
    } finally {
      setGeneratingPDF(false);
    }
  }

  // Share generated PDF
  async function shareGeneratedPDF() {
    if (!generatedPDF || !details) return;

    try {
      if (navigator.share && navigator.canShare?.({ files: [generatedPDF] })) {
        await navigator.share({
          title: `${details.sale.sale_number} Invoice`,
          text: `Invoice from ${details.sale.shop_name}`,
          files: [generatedPDF],
        });
      } else {
        const pdfUrl = URL.createObjectURL(generatedPDF);
        const link = document.createElement("a");

        link.href = pdfUrl;
        link.download = generatedPDF.name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("PDF sharing error:", err);

      alert(isUrdu ? "PDF شیئر نہیں ہو سکی۔" : "Unable to share the PDF.");
    }
  }

  return {
    generatingPDF,
    generatedPDF,
    sendOnWhatsApp,
    shareInvoicePDF,
    shareGeneratedPDF,
  };
}
