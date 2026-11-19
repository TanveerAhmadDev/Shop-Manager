"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  Loader2,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface AdminProfileResponse {
  success: boolean;
  data: {
    admin: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [adminName, setAdminName] = useState("System Admin");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verify the System Admin cookie with the backend.
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await apiRequest<AdminProfileResponse>(
          "/system-admin/auth/me",
        );

        if (active) {
          setAdminName(response.data.admin.full_name);
        }
      } catch {
        if (active) {
          router.replace("/system-admin/login");
        }
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  // Close mobile sidebar when route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Logout the System Admin.
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await apiRequest("/system-admin/auth/logout", {
        method: "POST",
      });

      toast.add({
        title: "Logged out",
        description: "You have been logged out successfully.",
        type: "success",
      });

      router.replace("/system-admin/login");
      router.refresh();
    } catch (error) {
      toast.add({
        title: "Logout failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to logout. Please try again.",
        type: "error",
      });

      setLoggingOut(false);
    }
  }

  const navigation = [
    {
      name: "Dashboard",
      href: "/system-admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Shops",
      href: "/system-admin/shops",
      icon: Store,
    },
  ];

  // Authentication loading screen.
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm">Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={25} />

          <span className="font-bold text-foreground">System Admin</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground transition hover:bg-accent"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 cursor-default bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1 className="font-bold text-foreground">System Admin</h1>

            <p className="text-xs text-muted-foreground">Furniture SaaS</p>
          </div>
        </div>

        {/* Admin Profile */}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Management
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
          >
            {loggingOut ? (
              <Loader2 size={19} className="animate-spin" />
            ) : (
              <LogOut size={19} />
            )}

            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)] lg:ml-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
