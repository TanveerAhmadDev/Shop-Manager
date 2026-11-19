"use client";

import type { NewSaleCustomerProps } from "./types";

export default function NewSaleCustomer({
  isUrdu,
  customers,
  customerMode,
  setCustomerMode,
  customerId,
  setCustomerId,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  customerAddress,
  setCustomerAddress,
}: NewSaleCustomerProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">
          {isUrdu ? "گاہک" : "Customer"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isUrdu
            ? "موجودہ گاہک منتخب کریں یا نیا گاہک شامل کریں۔"
            : "Select an existing customer or add a new one."}
        </p>
      </div>

      {/* Customer Mode */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setCustomerMode("existing")}
          aria-pressed={customerMode === "existing"}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium transition ${
            customerMode === "existing"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          {isUrdu ? "موجودہ گاہک" : "Existing Customer"}
        </button>

        <button
          type="button"
          onClick={() => setCustomerMode("new")}
          aria-pressed={customerMode === "new"}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium transition ${
            customerMode === "new"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          {isUrdu ? "نیا گاہک" : "New Customer"}
        </button>
      </div>

      {customerMode === "existing" ? (
        <div>
          <label
            htmlFor="sale-customer"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {isUrdu ? "گاہک منتخب کریں" : "Select Customer"}
          </label>

          <select
            id="sale-customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <option value="">
              {isUrdu ? "گاہک منتخب کریں" : "Select a customer"}
            </option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_name} —{" "}
                {customer.phone || (isUrdu ? "فون موجود نہیں" : "No phone")}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="customer-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {isUrdu ? "گاہک کا نام" : "Customer Name"}
            </label>

            <input
              id="customer-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={isUrdu ? "گاہک کا نام" : "Enter customer name"}
              autoComplete="name"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {isUrdu ? "فون نمبر" : "Phone Number"}
            </label>

            <input
              id="customer-phone"
              value={customerPhone}
              type="number"
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={isUrdu ? "فون نمبر" : "03XX XXXXXXX"}
              autoComplete="tel"
              inputMode="tel"
              dir="ltr"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {isUrdu ? "ای میل (اختیاری)" : "Email (Optional)"}
            </label>

            <input
              id="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="customer-address"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {isUrdu ? "پتہ (اختیاری)" : "Address (Optional)"}
            </label>

            <input
              id="customer-address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={isUrdu ? "گاہک کا پتہ" : "Customer address"}
              autoComplete="street-address"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </div>
        </div>
      )}
    </section>
  );
}
