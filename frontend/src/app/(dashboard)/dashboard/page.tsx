"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Boxes,
  Wallet,
  CreditCard,
  RefreshCw,
  Plus,
  PackagePlus,
  ShoppingBag,
  ReceiptText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import Link from "next/link";

import { useLanguage } from "@/context/language-context";
import { apiRequest } from "@/lib/api";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";

interface DashboardSummary {
  shop_name: string;
  today_sales: number;
  today_expenses: number;
  available_stock: number;
  customer_credit: number;
  today_profit: number;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardSummary;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { isUrdu } = useLanguage();

  async function fetchDashboard() {
    try {
      setError("");

      const result = await apiRequest<DashboardResponse>("/dashboard/summary");

      setSummary(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number) =>
    `Rs. ${Number(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const profit = Number(summary?.today_profit ?? 0);

  const profitColor =
    profit < 0
      ? "text-red-600 dark:text-red-400"
      : profit > 0
        ? "text-green-600 dark:text-green-400"
        : "text-muted-foreground";

  const ProfitIcon = profit < 0 ? TrendingDown : TrendingUp;

  const stats = [
    {
      title: isUrdu ? "آج کی فروخت" : "Today's Sales",
      value: summary ? formatCurrency(summary.today_sales) : "—",
      description: isUrdu
        ? "واپسیوں کے بعد آج کی خالص فروخت"
        : "Net sales after completed returns",
      icon: ShoppingCart,
      valueColor: "text-foreground",
    },
    {
      title: isUrdu ? "آج کے اخراجات" : "Today's Expenses",
      value: summary ? formatCurrency(summary.today_expenses) : "—",
      description: isUrdu
        ? "کاروباری اور ذاتی اخراجات"
        : "Business and personal spending",
      icon: Wallet,
      valueColor: "text-foreground",
    },
    {
      title: isUrdu ? "موجودہ اسٹاک" : "Available Stock",
      value: summary ? summary.available_stock.toLocaleString("en-PK") : "—",
      description: isUrdu ? "اس وقت دستیاب فرنیچر" : "Items currently in stock",
      icon: Boxes,
      valueColor: "text-foreground",
    },
    {
      title: isUrdu ? "گاہکوں کے ذمے رقم" : "Customer Credit",
      value: summary ? formatCurrency(summary.customer_credit) : "—",
      description: isUrdu
        ? "گاہکوں سے وصول ہونے والی باقی رقم"
        : "Outstanding customer balances",
      icon: CreditCard,
      valueColor: "text-foreground",
    },
    {
      title: isUrdu ? "آج کا منافع" : "Today's Profit",
      value: summary ? formatCurrency(profit) : "—",
      description:
        profit < 0
          ? isUrdu
            ? "آج کاروبار کو نقصان ہوا"
            : "Business made a loss today"
          : profit > 0
            ? isUrdu
              ? "آج کاروبار نے منافع کمایا"
              : "Business made a profit today"
            : isUrdu
              ? "آج کوئی منافع یا نقصان نہیں"
              : "No profit or loss today",
      icon: ProfitIcon,
      valueColor: profitColor,
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }
  return (
    <div dir={isUrdu ? "rtl" : "ltr"} className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold text-muted-foreground">
            {summary?.shop_name ||
              (isUrdu ? "میری فرنیچر شاپ" : "My Furniture Shop")}
          </p>

          <h1 className="text-2xl font-bold text-foreground">
            {isUrdu ? "ڈیش بورڈ" : "Dashboard"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu
              ? "آپ کی فرنیچر شاپ کی آج کی صورتحال۔"
              : "Here's what's happening in your furniture shop."}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {isUrdu ? "تازہ کریں" : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchDashboard}
            className="shrink-0 font-semibold underline underline-offset-4"
          >
            {isUrdu ? "دوبارہ کوشش کریں" : "Retry"}
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className={`rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm ${
                stat.title === (isUrdu ? "آج کا منافع" : "Today's Profit")
                  ? "xl:col-span-1"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>

                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon size={20} />
                </div>
              </div>

              <h2
                dir="ltr"
                className={`mt-4 text-2xl font-bold ${
                  isUrdu ? "text-right" : ""
                } ${stat.valueColor}`}
              >
                {loading ? (
                  <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  stat.value
                )}
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isUrdu ? "فوری اقدامات" : "Quick Actions"}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {isUrdu
              ? "اپنے کاروبار کے اہم کام فوری طور پر کریں۔"
              : "Quickly perform common tasks in your shop."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              title: isUrdu ? "نئی فروخت" : "New Sale",
              description: isUrdu ? "بل بنائیں" : "Create a bill",
              href: "/sales/new",
              icon: ShoppingCart,
            },
            {
              title: isUrdu ? "نئی پروڈکٹ" : "New Product",
              description: isUrdu ? "فرنیچر شامل کریں" : "Add furniture",
              href: "/products/new",
              icon: PackagePlus,
            },
            {
              title: isUrdu ? "نئی خریداری" : "New Purchase",
              description: isUrdu ? "اسٹاک خریدیں" : "Record stock purchase",
              href: "/purchases/new",
              icon: ShoppingBag,
            },
            {
              title: isUrdu ? "نیا خرچہ" : "New Expense",
              description: isUrdu ? "خرچہ درج کریں" : "Record an expense",
              href: "/expenses/new",
              icon: ReceiptText,
            },
          ].map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-accent/50"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon size={21} />
                  </div>

                  <Plus
                    size={17}
                    className="text-muted-foreground transition group-hover:text-primary"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Business Overview */}
      <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          {isUrdu ? "کاروبار کا جائزہ" : "Business Overview"}
        </h2>

        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {isUrdu
            ? "آپ کے ڈیش بورڈ کی معلومات آپ کی شاپ کے ڈیٹا بیس سے حاصل کی جاتی ہیں۔ اپنی فروخت، اسٹاک، خریداری، گاہکوں اور اخراجات کو منظم کرنے کے لیے نیویگیشن مینو استعمال کریں۔"
            : "Your dashboard statistics are connected to your shop's database. Use the navigation menu to manage your sales, inventory, purchases, customers and expenses."}
        </p>
      </div>
    </div>
  );
}
