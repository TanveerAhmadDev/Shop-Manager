"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Store,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface DashboardStats {
  total_shops: number;
  active_shops: number;
  inactive_shops: number;
  total_users: number;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    stats: DashboardStats;
  };
}

export default function SystemAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch dashboard statistics.
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<DashboardResponse>(
        "/system-admin/dashboard/summary",
      );

      setStats(response.data.stats);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load dashboard.";

      setError(message);

      toast.add({
        title: "Dashboard loading failed",
        description: message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dashboard when the page mounts.
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Dashboard statistic cards.
  const cards = [
    {
      title: "Total Shops",
      value: stats?.total_shops ?? 0,
      icon: Store,
      color: "bg-primary/10 text-primary",
      description: "All registered furniture shops",
    },
    {
      title: "Active Shops",
      value: stats?.active_shops ?? 0,
      icon: CheckCircle,
      color: "bg-green-500/10 text-green-700 dark:text-green-400",
      description: "Currently active shops",
    },
    {
      title: "Inactive Shops",
      value: stats?.inactive_shops ?? 0,
      icon: XCircle,
      color: "bg-red-500/10 text-red-700 dark:text-red-400",
      description: "Deactivated shops",
    },
    {
      title: "Total Users",
      value: stats?.total_users ?? 0,
      icon: Users,
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      description: "All registered shop users",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your furniture SaaS platform.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="shrink-0 text-left text-sm font-semibold text-red-700 underline underline-offset-4 hover:text-red-800 disabled:opacity-50 dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>

                  <h2 className="mt-3 text-3xl font-bold tabular-nums text-foreground">
                    {loading && !stats
                      ? "—"
                      : card.value.toLocaleString("en-PK")}
                  </h2>
                </div>

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}
                >
                  <Icon size={22} />
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Manage Shops */}
          <Link
            href="/system-admin/shops"
            className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store size={23} />
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">Manage Shops</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  View, search and manage registered shops.
                </p>
              </div>
            </div>

            <ArrowRight
              size={20}
              className="shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
            />
          </Link>

          {/* Platform Users */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400">
                <Users size={23} />
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">
                  Platform Users
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {stats?.total_users.toLocaleString("en-PK") ?? 0} registered
                  shop users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
