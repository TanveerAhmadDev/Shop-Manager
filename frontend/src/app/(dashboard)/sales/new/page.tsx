"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useBarcodeSound } from "@/hooks/useBarcodeSound";

import { useLanguage } from "@/context/language-context";

import { savePendingSale } from "@/lib/offline-db";
import { toast } from "@/components/ui/toast";
import NewSaleSkeleton from "@/components/skeletons/NewSaleSkeleton";

import type { Customer, InventoryItem } from "@/types/sales";

import NewSaleCustomer from "@/components/sales/new-sale/NewSaleCustomer";
import type {
  BillItem,
  PaymentMethod,
} from "@/components/sales/new-sale/types";
import NewSaleFurniture from "@/components/sales/new-sale/NewSaleFurniture";
import NewSalePayment from "@/components/sales/new-sale/NewSalePayment";
import NewSaleActions from "@/components/sales/new-sale/NewSaleActions";
import { useSaleCalculations } from "@/hooks/sales/useSaleCalculations";
import { useNewSaleData } from "@/hooks/sales/useNewSaleData";
import { useBarcodeScanner } from "@/hooks/sales/useBarcodeScanner";
import { useSaleSubmission } from "@/hooks/sales/useSaleSubmission";

export default function NewSalePage() {
  const { isUrdu } = useLanguage();

  // Current shop ID, used to keep offline data separated by shop.
  const [offlineShopId, setOfflineShopId] = useState<string | null>(null);

  // Message displayed when a sale is saved locally.
  const [queuedMessage, setQueuedMessage] = useState("");
  const { unlockAudio, playSuccess, playError } = useBarcodeSound();

  // Model numbers reserved by sales waiting to synchronize.
  const reservedModelNumbersRef = useRef<Set<string>>(new Set());

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<BillItem[]>([]);

  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    modelNumber?: boolean;
    itemPrices: string[];
  }>({
    itemPrices: [],
  });

  // Scanner state.
  const [scannerOpen, setScannerOpen] = useState(false);

  // Temporarily reveal cost and profit information.
  const [showCostDetails, setShowCostDetails] = useState(false);

  // Store the automatic hide timer.
  const costTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show cost information for 10 seconds.
  function revealCostDetails() {
    if (costTimerRef.current) {
      clearTimeout(costTimerRef.current);
    }

    setShowCostDetails(true);

    costTimerRef.current = setTimeout(() => {
      setShowCostDetails(false);
      costTimerRef.current = null;
    }, 10000);
  }

  // Clean up timer when leaving the page.
  useEffect(() => {
    return () => {
      if (costTimerRef.current) {
        clearTimeout(costTimerRef.current);
      }
    };
  }, []);

  // Refs keep the latest data available inside camera callbacks.
  const inventoryRef = useRef<InventoryItem[]>([]);
  const itemsRef = useRef<BillItem[]>([]);

  const notifyScan = useCallback(
    (notification: {
      title: string;
      description: string;
      type: "success" | "warning" | "error";
    }) => {
      toast.add(notification);
    },
    [],
  );

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Add individual furniture to the bill.
  const addInventoryToBill = useCallback(
    (selected: InventoryItem) => {
      if (
        reservedModelNumbersRef.current.has(selected.model_number.toUpperCase())
      ) {
        setError(
          isUrdu
            ? "یہ فرنیچر پہلے سے ایک زیرِ التواء بل میں شامل ہے۔"
            : "This furniture is already reserved by a pending sale.",
        );

        return false;
      }

      const alreadyAdded = itemsRef.current.some(
        (item) => item.inventory.id === selected.id,
      );

      if (alreadyAdded) {
        setError(
          isUrdu
            ? "یہ فرنیچر پہلے ہی بل میں شامل ہے۔"
            : "This furniture item is already in the bill.",
        );

        return false;
      }

      // Reuse the selling price of another item of the same product.
      const sameProduct = itemsRef.current.find(
        (item) => item.inventory.product_id === selected.product_id,
      );

      const newItem: BillItem = {
        type: "individual",
        inventory: selected,
        quantity,
        price: sameProduct?.price || "",
      };

      const updatedItems = [...itemsRef.current, newItem];

      itemsRef.current = updatedItems;
      setItems(updatedItems);

      setSelectedInventoryId(selected.id);
      setQuantity(1);
      setError("");

      return true;
    },
    [isUrdu, quantity],
  );

  const { scanMessage, setScanMessage } = useBarcodeScanner({
    scannerOpen,
    isUrdu,
    inventoryRef,
    addInventoryToBill,
    setError,
    playSuccess,
    playError,
    notify: notifyScan,
  });

  useNewSaleData({
    isUrdu,
    reservedModelNumbersRef,
    setOfflineShopId,
    setCustomers,
    setInventory,
    setError,
    setLoadingData,
  });

  // Bill calculations.
  const {
    subtotal,
    discountValue,
    taxValue,
    total,
    paid,
    balance,
    isPaymentInvalid,
    totalLandedCost,
    expectedProfit,
  } = useSaleCalculations({
    items,
    discount,
    tax,
    paymentAmount,
  });

  // Add furniture using its model number.
  function addItem() {
    const searchCode = modelNumber.trim().toUpperCase();

    if (!searchCode) return;

    const selected = inventory.find(
      (item) =>
        item.model_number.toUpperCase() === searchCode &&
        item.status === "in_stock",
    );

    if (!selected) {
      setError(
        isUrdu
          ? "دستیاب اسٹاک میں یہ ماڈل نمبر نہیں ملا۔"
          : "This model number was not found in available stock.",
      );

      return;
    }

    const added = addInventoryToBill(selected);

    if (added) {
      setModelNumber("");
      setError("");
    }
  }

  // Show matching individual inventory model numbers.
  const modelSuggestions = modelNumber.trim()
    ? inventory
        .filter(
          (item) =>
            item.status === "in_stock" &&
            item.model_number
              .toUpperCase()
              .includes(modelNumber.trim().toUpperCase()) &&
            !items.some((billItem) => billItem.inventory.id === item.id),
        )
        .slice(0, 6)
    : [];

  // Update the selling price for items of the same product.
  function updateItemPrice(id: string, price: string) {
    const selectedItem = itemsRef.current.find(
      (item) => item.inventory.id === id,
    );

    if (!selectedItem) return;

    const updatedItems = itemsRef.current.map((item) => {
      if (item.inventory.product_id === selectedItem.inventory.product_id) {
        return { ...item, price };
      }

      return item;
    });

    itemsRef.current = updatedItems;
    setItems(updatedItems);
  }
  function updateItemQuantity(id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return;

    const updatedItems = itemsRef.current.map((item) => {
      if (item.inventory.id === id) {
        return { ...item, quantity };
      }

      return item;
    });

    itemsRef.current = updatedItems;
    setItems(updatedItems);
  }

  // Remove an item from the bill.
  function removeItem(id: string) {
    const updatedItems = itemsRef.current.filter(
      (item) => item.inventory.id !== id,
    );

    itemsRef.current = updatedItems;
    setItems(updatedItems);
  }

  const { handleSubmit } = useSaleSubmission({
    setError,
    setFieldErrors,
    setQueuedMessage,
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
    setSubmitting,
    savePendingSale,
    notify: (notification) => toast.add(notification),
  });

  const formatMoney = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-PK")}`;

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: "cash", label: isUrdu ? "نقد" : "Cash" },
    { value: "bank", label: isUrdu ? "بینک" : "Bank" },
    { value: "easypaisa", label: "EasyPaisa" },
    { value: "jazzcash", label: "JazzCash" },
    { value: "other", label: isUrdu ? "دیگر" : "Other" },
  ];

  if (loadingData) {
    return <NewSaleSkeleton isUrdu={isUrdu} />;
  }

  return (
    <div
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      className="mx-auto max-w-5xl space-y-4 pb-4 sm:space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/sales"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-accent"
          aria-label={isUrdu ? "فروخت پر واپس جائیں" : "Back to sales"}
        >
          <ArrowLeft size={19} className={isUrdu ? "rotate-180" : ""} />
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {isUrdu ? "نیا بل بنائیں" : "Create New Bill"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {isUrdu
              ? "فرنیچر منتخب کریں اور ادائیگی درج کریں۔"
              : "Add furniture and record customer payment."}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 sm:space-y-6"
      >
        {/* CUSTOMER SECTION */}
        <NewSaleCustomer
          isUrdu={isUrdu}
          customers={customers}
          customerMode={customerMode}
          setCustomerMode={setCustomerMode}
          customerId={customerId}
          setCustomerId={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          customerAddress={customerAddress}
          setCustomerAddress={setCustomerAddress}
        />

        {/* FURNITURE SECTION */}
        <NewSaleFurniture
          isUrdu={isUrdu}
          items={items}
          showCostDetails={showCostDetails}
          revealCostDetails={revealCostDetails}
          scannerOpen={scannerOpen}
          setScannerOpen={setScannerOpen}
          unlockAudio={unlockAudio}
          scanMessage={scanMessage}
          setScanMessage={setScanMessage}
          modelNumber={modelNumber}
          setModelNumber={setModelNumber}
          quantity={quantity}
          setQuantity={setQuantity}
          modelSuggestions={modelSuggestions}
          addItem={addItem}
          addInventoryToBill={addInventoryToBill}
          removeItem={removeItem}
          updateItemPrice={updateItemPrice}
          updateItemQuantity={updateItemQuantity}
          setError={setError}
          formatMoney={formatMoney}
          errors={fieldErrors}
          clearItemPriceError={(inventoryId) => {
            setFieldErrors((previous) => ({
              ...previous,
              itemPrices: previous.itemPrices.filter(
                (id) => id !== inventoryId,
              ),
            }));
          }}
        />

        {/* PAYMENT AND SUMMARY */}
        <NewSalePayment
          isUrdu={isUrdu}
          discount={discount}
          setDiscount={setDiscount}
          tax={tax}
          setTax={setTax}
          subtotal={subtotal}
          discountValue={discountValue}
          taxValue={taxValue}
          total={total}
          showCostDetails={showCostDetails}
          totalLandedCost={totalLandedCost}
          expectedProfit={expectedProfit}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          isPaymentInvalid={isPaymentInvalid}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentMethods={paymentMethods}
          referenceNumber={referenceNumber}
          setReferenceNumber={setReferenceNumber}
          paid={paid}
          balance={balance}
          formatMoney={formatMoney}
        />

        {/* OPTIONAL NOTES */}
        <details className="group rounded-xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden sm:px-5">
            <span>
              {isUrdu ? "اضافی نوٹس (اختیاری)" : "Additional Notes (Optional)"}
            </span>
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">
              {isUrdu ? "شامل کریں" : "Add"}
            </span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
              {isUrdu ? "بند کریں" : "Close"}
            </span>
          </summary>

          <div className="border-t border-border p-4 sm:p-5">
            <label
              htmlFor="sale-notes"
              className="mb-2 block text-sm text-muted-foreground"
            >
              {isUrdu
                ? "بل کے بارے میں اضافی معلومات"
                : "Notes about this sale"}
            </label>

            <textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={
                isUrdu
                  ? "اس فروخت کے بارے میں اضافی معلومات..."
                  : "Additional information about this sale..."
              }
              className="w-full rounded-lg border border-input bg-background p-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </div>
        </details>

        {/* OFFLINE SALE MESSAGE */}
        {queuedMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-800 dark:text-green-400"
          >
            <CheckCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                {isUrdu ? "بل محفوظ ہو گیا" : "Sale saved successfully"}
              </p>
              <p className="mt-1">{queuedMessage}</p>
            </div>
          </div>
        )}

        {/* DESKTOP ACTIONS */}
        <NewSaleActions
          isUrdu={isUrdu}
          submitting={submitting}
          itemsCount={items.length}
          isPaymentInvalid={isPaymentInvalid}
          total={total}
          formatMoney={formatMoney}
        />
      </form>
    </div>
  );
}
