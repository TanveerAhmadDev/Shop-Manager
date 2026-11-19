"use client";

import React, { useState } from "react";
import { Eye, Plus, Trash2, ScanLine, X } from "lucide-react";

import type { NewSaleFurnitureProps } from "./types";

const NewSaleFurniture = ({
  isUrdu,
  items,
  showCostDetails,
  revealCostDetails,
  scannerOpen,
  setScannerOpen,
  unlockAudio,
  scanMessage,
  setScanMessage,
  modelNumber,
  setModelNumber,
  quantity,
  setQuantity,
  modelSuggestions,
  addItem,
  addInventoryToBill,
  removeItem,
  updateItemPrice,
  setError,
  formatMoney,
  errors,
  clearItemPriceError,
  updateItemQuantity,
}: NewSaleFurnitureProps) => {
  const [isModelInputFocused, setIsModelInputFocused] = useState(false);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">
            {isUrdu ? "فرنیچر" : "Furniture"}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} {isUrdu ? "اشیاء شامل ہیں" : "items added"}
          </p>
        </div>

        <button
          type="button"
          onClick={revealCostDetails}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400 sm:text-sm"
        >
          <Eye size={16} />

          {showCostDetails
            ? isUrdu
              ? "لاگت ظاہر ہے"
              : "Cost Visible"
            : isUrdu
              ? "لاگت دکھائیں"
              : "Show Cost"}
        </button>
      </div>

      {/* Barcode Scanner Button */}
      <button
        type="button"
        onClick={() => {
          setError("");
          setScanMessage(null);

          if (!scannerOpen) {
            void unlockAudio();
          }

          setScannerOpen((previous) => !previous);
        }}
        aria-expanded={scannerOpen}
        className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        {scannerOpen ? <X size={19} /> : <ScanLine size={19} />}

        {scannerOpen
          ? isUrdu
            ? "اسکینر بند کریں"
            : "Close Scanner"
          : isUrdu
            ? "بارکوڈ اسکین کریں"
            : "Scan Barcode"}
      </button>

      {/* Camera Scanner */}
      {scannerOpen && (
        <div
          className={`mb-4 rounded-xl border-2 p-3 transition-colors duration-200 sm:p-4 ${
            scanMessage?.type === "success"
              ? "border-green-500 bg-green-500/5"
              : scanMessage?.type === "error" || scanMessage?.type === "warning"
                ? "border-red-500 bg-red-500/5"
                : "border-border bg-muted"
          }`}
        >
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            {isUrdu ? "فرنیچر اسکین کریں" : "Scan Furniture"}
          </h3>

          <p className="mb-3 text-xs text-muted-foreground">
            {isUrdu
              ? "لیبل پر موجود بارکوڈ کیمرے کے سامنے رکھیں۔"
              : "Point your camera at the barcode on the furniture label."}
          </p>

          <div
            id="sales-product-scanner"
            className="mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-black"
          />

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {isUrdu
              ? "اسکین ہونے پر فرنیچر خود بخود شامل ہو جائے گا۔"
              : "Furniture will be added automatically after scanning."}
          </p>
        </div>
      )}

      {/* Scanner Feedback */}
      {scanMessage && (
        <div
          role={scanMessage.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mb-3 rounded-lg border p-3 text-sm ${
            scanMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : scanMessage.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {scanMessage.text}
        </div>
      )}

      {/* Model Number and Quantity */}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <label
            htmlFor="model-number"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {isUrdu ? "فرنیچر ماڈل نمبر" : "Furniture Model Number"}
          </label>

          <div className="relative">
            <input
              id="model-number"
              type="text"
              value={modelNumber}
              onChange={(e) => {
                setModelNumber(e.target.value.toUpperCase());
                setError("");
              }}
              onFocus={() => setIsModelInputFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setIsModelInputFocused(false);
                }, 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="MY-000001"
              dir="ltr"
              autoComplete="off"
              className={`h-12 w-full rounded-lg border ${
                errors.modelNumber
                  ? "border-red-500 focus-visible:ring-red-500"
                  : "border-input focus-visible:ring-ring"
              } bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 sm:text-sm`}
            />

            {isModelInputFocused && modelSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                <div className="max-h-64 overflow-y-auto overscroll-contain">
                  {modelSuggestions.map((item) => {
                    const alreadyAdded = items.some(
                      (billItem) => billItem.inventory.id === item.id,
                    );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          if (addInventoryToBill(item)) {
                            setModelNumber("");
                            setError("");
                          }
                        }}
                        className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-start last:border-b-0 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold text-foreground"
                            dir="ltr"
                          >
                            {item.model_number}
                          </p>

                          <p className="truncate text-xs text-muted-foreground">
                            {item.product_name}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-medium text-green-600 dark:text-green-400">
                          {alreadyAdded
                            ? isUrdu
                              ? "شامل ہے"
                              : "Added"
                            : isUrdu
                              ? "دستیاب"
                              : "Available"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="sale-quantity"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {isUrdu ? "مقدار" : "Quantity"}
          </label>

          <input
            id="sale-quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => {
              const value = e.target.value;

              // Allow the salesman to temporarily clear the input
              if (value === "") {
                setQuantity("" as unknown as number);
                return;
              }

              const parsedValue = Number(value);

              if (Number.isInteger(parsedValue) && parsedValue >= 1) {
                setQuantity(parsedValue);
              }
            }}
            onBlur={() => {
              if (!quantity || quantity < 1) {
                setQuantity(1);
              }
            }}
            dir="ltr"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={!modelNumber.trim() || quantity < 1}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={18} />
        {isUrdu ? "بل میں شامل کریں" : "Add to Bill"}
      </button>

      {/* Bill Items */}
      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
          <ScanLine size={28} className="mx-auto mb-2 text-muted-foreground" />

          <p className="text-sm font-medium text-foreground">
            {isUrdu ? "ابھی کوئی فرنیچر شامل نہیں" : "No furniture added yet"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {isUrdu
              ? "بارکوڈ اسکین کریں یا ماڈل نمبر درج کریں۔"
              : "Scan a barcode or enter a model number above."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const itemId = item.inventory.id;
            const productName = item.inventory.product_name;
            const unitCost = Number(item.inventory.cost_price || 0);
            const totalCost = unitCost * item.quantity;

            return (
              <div
                key={itemId}
                className="rounded-xl border border-border bg-background p-3 sm:p-4"
              >
                {/* Product Details */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {productName}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {item.inventory.model_number}
                      {item.inventory.color && ` • ${item.inventory.color}`}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <label
                        htmlFor={`item-quantity-${itemId}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {isUrdu ? "مقدار:" : "Quantity:"}
                      </label>

                      <input
                        id={`item-quantity-${itemId}`}
                        type="number"
                        min="1"
                        step="1"
                        value={quantityDrafts[itemId] ?? String(item.quantity)}
                        onChange={(e) => {
                          setQuantityDrafts((prev) => ({
                            ...prev,
                            [itemId]: e.target.value,
                          }));
                        }}
                        onBlur={() => {
                          const draft = quantityDrafts[itemId];

                          if (draft === undefined) return;

                          const value = Number(draft);

                          if (Number.isInteger(value) && value >= 1) {
                            updateItemQuantity(itemId, value);
                          }

                          setQuantityDrafts((prev) => {
                            const updated = { ...prev };
                            delete updated[itemId];
                            return updated;
                          });
                        }}
                        className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(itemId)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
                    aria-label={
                      isUrdu ? `${productName} ہٹائیں` : `Remove ${productName}`
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Selling Price */}
                <div className="mt-3">
                  <label
                    htmlFor={`sale-price-${itemId}`}
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {isUrdu
                      ? "فی عدد فروخت قیمت (روپے)"
                      : "Selling Price Per Unit (Rs.)"}
                  </label>

                  <input
                    id={`sale-price-${itemId}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    inputMode="decimal"
                    value={item.price}
                    onChange={(e) => {
                      updateItemPrice(itemId, e.target.value);
                      clearItemPriceError(itemId);
                    }}
                    placeholder="0.00"
                    dir="ltr"
                    className={`h-12 w-full rounded-lg border ${
                      errors.itemPrices?.includes(itemId)
                        ? "border-red-500 focus-visible:ring-red-500"
                        : "border-input focus-visible:ring-ring"
                    } bg-background px-3 text-base font-semibold text-foreground outline-none focus-visible:ring-2 sm:text-sm`}
                  />
                </div>

                {/* Cost and Profit */}
                {showCostDetails && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">
                        {isUrdu ? "تخمینی کل لاگت" : "Estimated Total Cost"}
                      </p>

                      <p
                        className="mt-1 text-sm font-semibold text-foreground"
                        dir="ltr"
                      >
                        {formatMoney(totalCost)}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {isUrdu
                          ? "اسکین شدہ آئٹم کی لاگت کے مطابق تخمینہ"
                          : "Estimate based on scanned item's cost"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {isUrdu ? "تخمینی منافع" : "Estimated Profit"}
                      </p>

                      <p
                        className="mt-1 text-sm font-semibold text-green-700 dark:text-green-400"
                        dir="ltr"
                      >
                        {item.price && Number(item.price) > 0
                          ? formatMoney(
                              (Number(item.price) -
                                Number(item.inventory.cost_price || 0)) *
                                item.quantity,
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default NewSaleFurniture;
