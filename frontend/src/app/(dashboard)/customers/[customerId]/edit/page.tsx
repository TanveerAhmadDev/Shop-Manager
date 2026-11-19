"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Save, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/api";

interface CustomerFormData {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
}

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface CustomerResponse {
  success: boolean;
  message: string;
  data: Customer;
}

export default function EditCustomerPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const router = useRouter();

  const [formData, setFormData] = useState<CustomerFormData>({
    customer_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing customer information.
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest<CustomerResponse>(
          `/customers/${customerId}`,
        );

        const customer = response.data;

        setFormData({
          customer_name: customer.customer_name || "",
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load customer.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

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

  // Save updated customer information.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!formData.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }

    try {
      setSaving(true);

      await apiRequest(`/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
        }),
      });

      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading customer information...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/customers/${customerId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customer Details
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#2A6A8B]/10 p-3">
            <Users className="h-6 w-6 text-[#2A6A8B]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Edit Customer
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Update your customer's contact information.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-border-white p-5 sm:p-7"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Customer Information
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Make changes to the customer's details below.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Customer Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="customer_name"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Customer Name <span className="text-red-500">*</span>
            </label>

            <input
              id="customer_name"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="Customer name"
              required
              maxLength={150}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="03001234567"
              maxLength={30}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="customer@example.com"
              maxLength={150}
              className="w-full rounded-lg border border-border-3 py-2.5 text-sm outline-none transition focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Address
            </label>

            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter customer address..."
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
            href={`/customers/${customerId}`}
            className="rounded-lg border border-border-5 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A6A8B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#225873] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Customer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
