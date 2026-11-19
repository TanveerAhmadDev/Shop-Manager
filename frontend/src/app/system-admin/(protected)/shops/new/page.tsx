"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  LockKeyhole,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

interface CreateShopResponse {
  success: boolean;
  message: string;
  data?: {
    shop?: {
      id: string;
      shop_name: string;
    };
  };
}

export default function NewShopPage() {
  const router = useRouter();

  // Shop information
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  // Owner information
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Check that both passwords match.
    if (ownerPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (ownerPassword.length < 8) {
      setError("Owner password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<CreateShopResponse>(
        "/system-admin/shops",
        {
          method: "POST",
          body: JSON.stringify({
            shop_name: shopName.trim(),
            phone: shopPhone.trim() || null,
            email: shopEmail.trim() || null,
            address: shopAddress.trim() || null,
            owner: {
              full_name: ownerName.trim(),
              email: ownerEmail.trim(),
              password: ownerPassword,
            },
          }),
        },
      );

      setSuccess(response.message || "Shop created successfully.");

      // Navigate to the shops list after successful creation.
      setTimeout(() => {
        router.push("/system-admin/shops");
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create shop. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/system-admin/shops"
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition bg-muted"
          aria-label="Back to shops"
        >
          <ArrowLeft size={20} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register a furniture shop and create its owner account.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle size={20} />
          <span>{success} Redirecting to shops...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Information */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400">
              <Store size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-foreground">
                Shop Information
              </h2>
              <p className="text-xs text-muted-foreground">
                Basic details about the furniture shop.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {/* Shop Name */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Shop Name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Mardan Furniture House"
                required
                maxLength={150}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Shop Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Phone Number
              </label>

              <div className="relative">
                <Phone
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Shop Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Shop Email
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  placeholder="shop@example.com"
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Shop Address
              </label>

              <div className="relative">
                <MapPin
                  size={17}
                  className="absolute left-3 top-3.5 text-slate-400"
                />

                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Enter shop address"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Owner Information */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <User size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-foreground">
                Shop Owner Account
              </h2>
              <p className="text-xs text-muted-foreground">
                Login credentials for the shop owner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {/* Owner Name */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Owner Full Name <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <User
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Enter owner's full name"
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Owner Email */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Owner Email <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  autoComplete="off"
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground">
                The owner will use this email to log in to the shop.
              </p>
            </div>

            {/* Owner Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Password <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-11 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Confirm Password <span className="text-red-500">*</span>
              </label>

              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/system-admin/shops"
            className="rounded-lg border border-slate-300 bg-card px-5 py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Shop...
              </>
            ) : (
              <>
                <Store size={18} />
                Create Shop
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
