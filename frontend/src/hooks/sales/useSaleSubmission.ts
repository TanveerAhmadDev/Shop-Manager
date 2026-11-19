"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FormEvent, MutableRefObject } from "react";

import { apiRequest } from "@/lib/api";
import type {
  BillItem,
  PaymentMethod,
} from "@/components/sales/new-sale/types";

interface SaleSubmissionBody {
  client_request_id: string;
  customer_id?: string;
  customer?: {
    customer_name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: {
    model_number: string;
    quantity: number;
    unit_sale_price: number;
  }[];
  discount: number;
  tax: number;
  payment: {
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
  };
  notes?: string;
}

interface SaleNotification {
  title: string;
  description: string;
  type: "success" | "info" | "error";
}

interface UseSaleSubmissionProps {
  setFieldErrors: React.Dispatch<
    React.SetStateAction<{
      modelNumber?: boolean;
      itemPrices: string[];
    }>
  >;
  isUrdu: boolean;

  items: BillItem[];
  itemsRef: MutableRefObject<BillItem[]>;
  setItems: (items: BillItem[]) => void;

  customerMode: "existing" | "new";
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;

  discountValue: number;
  subtotal: number;
  taxValue: number;
  paid: number;
  total: number;

  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;

  offlineShopId: string | null;
  reservedModelNumbersRef: MutableRefObject<Set<string>>;

  setSelectedInventoryId: (id: string) => void;
  setError: (error: string) => void;
  setQueuedMessage: (message: string) => void;
  setSubmitting: (submitting: boolean) => void;

  savePendingSale: (
    shopId: string,
    clientRequestId: string,
    body: SaleSubmissionBody,
  ) => Promise<unknown>;

  notify: (notification: SaleNotification) => void;
}

export function useSaleSubmission({
  isUrdu,
  items,
  itemsRef,
  setItems,
  customerMode,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  discountValue,
  subtotal,
  taxValue,
  paid,
  total,
  paymentMethod,
  referenceNumber,
  notes,
  offlineShopId,
  reservedModelNumbersRef,
  setSelectedInventoryId,
  setError,
  setQueuedMessage,
  setSubmitting,
  savePendingSale,
  notify,
  setFieldErrors,
}: UseSaleSubmissionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Create a sale through the backend.
  const createSaleMutation = useMutation({
    mutationFn: (body: SaleSubmissionBody) =>
      apiRequest<{
        success: boolean;
        message: string;
        data: {
          sale_id: string;
          sale_number: string;
          total_amount: number;
          paid_amount: number;
          remaining_balance: number;
        };
      }>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setQueuedMessage("");

    // Find items with invalid selling prices.
    const invalidItemPriceIds = items
      .filter((item) => {
        const price = Number(item.price);
        return !Number.isFinite(price) || price <= 0;
      })
      .map((item) => item.inventory.id);

    setFieldErrors({
      itemPrices: invalidItemPriceIds,
    });

    // Make sure the bill has at least one item.
    if (items.length === 0) {
      setError(
        isUrdu
          ? "کم از کم ایک فرنیچر شامل کریں۔"
          : "Add at least one furniture item.",
      );
      return;
    }

    if (invalidItemPriceIds.length > 0) {
      setError(
        isUrdu
          ? "ہر آئٹم کی درست فروخت قیمت درج کریں۔"
          : "Enter a valid selling price for every item.",
      );
      return;
    }

    // Validate requested quantities.
    const invalidQuantity = items.some(
      (item) => !Number.isInteger(item.quantity) || item.quantity <= 0,
    );

    if (invalidQuantity) {
      setError(
        isUrdu
          ? "فرنیچر کی مقدار درست درج کریں۔"
          : "Enter a valid quantity for every furniture item.",
      );
      return;
    }

    // Validate customer.
    if (customerMode === "existing" && !customerId) {
      setError(
        isUrdu ? "براہ کرم گاہک منتخب کریں۔" : "Please select a customer.",
      );
      return;
    }

    if (customerMode === "new" && !customerName.trim()) {
      setError(
        isUrdu ? "گاہک کا نام درج کریں۔" : "Please enter the customer name.",
      );
      return;
    }

    // Validate discount and payment.
    if (discountValue > subtotal) {
      setError(
        isUrdu
          ? "رعایت کل قیمت سے زیادہ نہیں ہو سکتی۔"
          : "Discount cannot be greater than the subtotal.",
      );
      return;
    }

    if (paid > total) {
      setError(
        isUrdu
          ? "وصول شدہ رقم بل کی کل رقم سے زیادہ نہیں ہو سکتی۔"
          : "Payment cannot be greater than the bill total.",
      );
      return;
    }

    if (!offlineShopId) {
      setError(
        isUrdu
          ? "دکان کی معلومات دستیاب نہیں۔ دوبارہ لاگ ان کریں۔"
          : "Shop information is unavailable. Please log in again.",
      );
      return;
    }

    // Prevent using a model number already in another pending sale.
    const reservedNumbers = reservedModelNumbersRef.current;

    const containsReservedItem = items.some((item) =>
      reservedNumbers.has(item.inventory.model_number.toUpperCase()),
    );

    if (containsReservedItem) {
      setError(
        isUrdu
          ? "اس بل میں ایسا فرنیچر شامل ہے جو پہلے ہی زیرِ التواء بل میں موجود ہے۔"
          : "This bill contains furniture already reserved by another pending sale.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const clientRequestId = crypto.randomUUID();

      // Build the backend payload.
      const body: SaleSubmissionBody = {
        client_request_id: clientRequestId,

        ...(customerMode === "existing"
          ? { customer_id: customerId }
          : {
              customer: {
                customer_name: customerName.trim(),
                phone: customerPhone.trim() || undefined,
                email: customerEmail.trim() || undefined,
                address: customerAddress.trim() || undefined,
              },
            }),

        items: items.map((item) => ({
          model_number: item.inventory.model_number,
          quantity: item.quantity,
          unit_sale_price: Number(item.price),
        })),

        discount: discountValue,
        tax: taxValue,

        payment: {
          amount: paid,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
        },

        notes: notes.trim() || undefined,
      };

      // Save locally when offline.
      if (!navigator.onLine) {
        await savePendingSale(offlineShopId, clientRequestId, body);

        for (const item of body.items) {
          reservedModelNumbersRef.current.add(item.model_number.toUpperCase());
        }

        window.dispatchEvent(new Event("offline-data-changed"));

        setQueuedMessage(
          isUrdu
            ? "بل محفوظ ہو گیا ہے۔ انٹرنیٹ واپس آنے پر خود بخود سنک ہو جائے گا۔"
            : "Sale saved offline. It will synchronize automatically when internet returns.",
        );

        notify({
          title: isUrdu ? "بل محفوظ ہو گیا" : "Sale saved offline",
          description: isUrdu
            ? "انٹرنیٹ واپس آنے پر بل خود بخود سنک ہو جائے گا۔"
            : "The sale will synchronize automatically when internet returns.",
          type: "success",
        });

        itemsRef.current = [];
        setItems([]);
        setSelectedInventoryId("");

        return;
      }

      try {
        // Create the sale on the server.
        const result = await createSaleMutation.mutateAsync(body);

        notify({
          title: isUrdu ? "بل کامیابی سے بن گیا" : "Sale created successfully!",
          description: isUrdu
            ? "بل کامیابی سے محفوظ ہو گیا ہے۔"
            : "The sale has been saved successfully.",
          type: "success",
        });

        router.push(`/sales/${result.data.sale_id}`);
      } catch (err) {
        // Queue only network failures, not server validation errors.
        if (!(err instanceof TypeError)) {
          throw err;
        }

        // Reuse the same ID because the original request may have reached
        // the server even though its response was lost.
        await savePendingSale(offlineShopId, clientRequestId, body);

        for (const item of body.items) {
          reservedModelNumbersRef.current.add(item.model_number.toUpperCase());
        }

        window.dispatchEvent(new Event("offline-data-changed"));

        setQueuedMessage(
          isUrdu
            ? "نیٹ ورک دستیاب نہیں۔ بل محفوظ کر لیا گیا ہے اور بعد میں سنک ہو گا۔"
            : "Network unavailable. Sale has been queued and will synchronize later.",
        );

        notify({
          title: isUrdu ? "بل محفوظ ہو گیا" : "Sale queued successfully",
          description: isUrdu
            ? "نیٹ ورک دستیاب نہیں۔ انٹرنیٹ واپس آنے پر بل سنک ہو جائے گا۔"
            : "Network unavailable. Your sale will synchronize when internet returns.",
          type: "info",
        });

        itemsRef.current = [];
        setItems([]);
        setSelectedInventoryId("");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isUrdu
            ? "بل بنانے میں ناکامی ہوئی۔"
            : "Failed to create bill.";

      setError(message);

      notify({
        title: isUrdu ? "بل بنانے میں ناکامی" : "Sale creation failed",
        description: message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return { handleSubmit };
}
