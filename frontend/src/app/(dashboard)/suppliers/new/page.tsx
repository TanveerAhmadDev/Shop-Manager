"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, Save, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/api";

interface SupplierFormData {
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

export default function NewSupplierPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update form fields.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit supplier details to the backend.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!formData.supplier_name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/suppliers", {
        method: "POST",
        body: JSON.stringify({
          supplier_name: formData.supplier_name.trim(),
          contact_person: formData.contact_person.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
        }),
      });

      router.push("/suppliers");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create supplier.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/suppliers"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#2A6A8B]/10 p-3">
            <Truck className="h-6 w-6 text-[#2A6A8B]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Add Supplier</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Register a new furniture supplier for your shop.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-border-white p-5 sm:p-7"
      >
        {/* Supplier Information */}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Supplier Information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the supplier's basic business details.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Supplier Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="supplier_name"
              className="mb-2 block text-sm font-medium text-foregroundd"
            >
              Supplier Name <span className="text-red-500">*</span>
            </label>

            <input
              id="supplier_name"
              name="supplier_name"
              value={formData.supplier_name}
              onChange={handleChange}
              placeholder="e.g. Mardan Furniture Supplier"
              required
              maxLength={150}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label
              htmlFor="contact_person"
              className="mb-2 block text-sm font-medium text-foregroundd"
            >
              Contact Person
            </label>

            <input
              id="contact_person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="e.g. Muhammad Ali"
              maxLength={100}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-foregroundd"
            >
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 03001234567"
              maxLength={30}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-foregroundd"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="supplier@example.com"
              maxLength={150}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-foregroundd"
            >
              Business Address
            </label>

            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter supplier's shop or business address..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/suppliers"
            className="rounded-lg border border-border-5 py-2.5 text-center text-sm font-medium text-foregroundd transition hover:bg-muted"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A6A8B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#225873] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Supplier
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
