"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  Wallet,
  UserCog,
  LogOut,
  Menu,
  X,
  Store,
  PackagePlus,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

import { useLanguage } from "@/context/language-context";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiRequest } from "@/lib/api";

import PWAInstallButton from "@/components/pwa-install-button";
import OfflineSyncProvider from "@/components/providers/offline-sync-provider";

import {
  saveOfflineSession,
  getOfflineSession,
  clearOfflineSession,
  clearAllOfflineData,
} from "@/lib/offline-db";
import DashboardLayoutSkeleton from "@/components/skeletons/DashboardLayoutSkeleton";

const USER_CACHE_KEY = "furniture_shop_user";

interface User {
  id: string;
  shop_id: string;
  full_name: string;
  email: string;
  role: "owner" | "helper";
}

interface MeResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  children?: {
    name: string;
    href: string;
    exact?: boolean;
  }[];
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },

  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    children: [
      { name: "All Sales", href: "/sales", exact: true },
      { name: "New Sale", href: "/sales/new", exact: true },
      { name: "Returns", href: "/sales/returns" },
    ],
  },

  { name: "Products", href: "/products", icon: PackagePlus },

  {
    name: "Purchases",
    href: "/purchases",
    icon: Package,
    children: [
      { name: "All Purchases", href: "/purchases", exact: true },
      { name: "New Purchase", href: "/purchases/new", exact: true },
    ],
  },

  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Expenses", href: "/expenses", icon: Wallet },
  {
    name: "Reports",
    href: "/reports",
    icon: TrendingUp,
    children: [
      { name: "Profit Reports", href: "/reports/profit", exact: true },
      { name: "Sales Report", href: "#", exact: true },
    ],
  },
];

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { isUrdu } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function translateNavigation(name: string) {
    if (!isUrdu) return name;

    const translations: Record<string, string> = {
      Dashboard: "ڈیش بورڈ",
      Sales: "فروخت",
      Products: "مصنوعات",
      Purchases: "خریداری",
      Inventory: "اسٹاک",
      Customers: "گاہک",
      Suppliers: "سپلائرز",
      Expenses: "اخراجات",
      Reports: "رپورٹس",
    };

    return translations[name] || name;
  }
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const cachedUser = await getOfflineSession();

        if (isMounted && cachedUser) {
          setUser(cachedUser);
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error("Offline session error:", error);
      }

      try {
        const result = await apiRequest<MeResponse>("/auth/me");
        if (!result.success) {
          throw new Error("Authentication failed.");
        }

        if (isMounted) {
          const authenticatedUser = result.data.user;

          setUser(authenticatedUser);

          await saveOfflineSession(authenticatedUser);

          sessionStorage.setItem(
            USER_CACHE_KEY,
            JSON.stringify(authenticatedUser),
          );
        }
      } catch (error) {
        if (!isMounted) return;

        const isNetworkError = !navigator.onLine || error instanceof TypeError;

        if (isNetworkError) {
          const cachedUser = await getOfflineSession();

          if (cachedUser) {
            setUser(cachedUser);
            setCheckingAuth(false);
            return;
          }
        }

        await clearOfflineSession();
        sessionStorage.removeItem(USER_CACHE_KEY);
        setUser(null);
        router.replace("/login");
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);

    sessionStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
    queryClient.clear();

    try {
      await clearAllOfflineData();
    } catch (error) {
      console.error("Could not clear offline data:", error);
    }

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const visibleNavigation = navigation.filter((item) => {
    if (user?.role === "helper") {
      return !["/expenses", "/reports/profit"].includes(item.href);
    }

    return true;
  });

  function SidebarContent() {
    const isActiveRoute = (href: string, exact = false) => {
      return exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
      <div className="flex h-full min-h-0 flex-col bg-sidebar">
        {/* Brand Header */}
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Store size={23} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-sidebar-foreground">
                {isUrdu ? "فرنیچر مینیجر" : "Furniture Manager"}
              </h1>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {isUrdu ? "دکان کا انتظام" : "Shop Management"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
          <div>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
              {isUrdu ? "مین مینو" : "MAIN MENU"}
            </p>

            <div className="space-y-1">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;

                const active = item.children
                  ? isActiveRoute(item.href)
                  : isActiveRoute(item.href);

                const expanded = expandedMenus[item.name] ?? false;

                if (item.children) {
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedMenus((prev) => ({
                            ...prev,
                            [item.name]: !prev[item.name],
                          }))
                        }
                        className={`group flex w-full items-center justify-between rounded-xl px-3 py-1 text-sm transition-all duration-200 ${
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-sidebar-accent/70 text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                            }`}
                          >
                            <Icon size={17} strokeWidth={2} />
                          </span>

                          {translateNavigation(item.name)}
                        </span>

                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Nested Routes */}
                      <div
                        className={`grid transition-all duration-200 ease-in-out ${
                          expanded
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div
                            className={`relative my-1 space-y-1 ${
                              isUrdu
                                ? "mr-[27px] border-r"
                                : "ml-[27px] border-l"
                            } border-sidebar-border`}
                          >
                            {item.children.map((child) => {
                              const childActive = isActiveRoute(
                                child.href,
                                child.exact,
                              );

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`relative flex items-center gap-2.5 rounded-lg py-2 text-[13px] transition-all duration-200 ${
                                    isUrdu ? "mr-3 pr-3" : "ml-3 pl-3"
                                  } ${
                                    childActive
                                      ? "bg-primary/10 font-semibold text-primary"
                                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                                      childActive
                                        ? "bg-primary"
                                        : "bg-muted-foreground/40"
                                    }`}
                                  />

                                  {translateNavigation(child.name)}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center gap-2 rounded-xl px-3 py-1 text-sm transition-all duration-200 ${
                      active
                        ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                        : "font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        active
                          ? "bg-white/15 text-primary-foreground"
                          : "bg-sidebar-accent/70 text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon size={17} strokeWidth={2} />
                    </span>

                    {translateNavigation(item.name)}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Management */}
          {user?.role === "owner" && (
            <div>
              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
                {isUrdu ? "انتظام" : "MANAGEMENT"}
              </p>

              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                  pathname === "/users" || pathname.startsWith("/users/")
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    pathname === "/users" || pathname.startsWith("/users/")
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-sidebar-accent/70 text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
                  }`}
                >
                  <UserCog size={17} />
                </span>

                {isUrdu ? "ٹیم کے افراد" : "Team Members"}
              </Link>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/70 transition-colors group-hover:bg-destructive/10">
              <LogOut size={18} />
            </span>

            <span>
              {loggingOut
                ? isUrdu
                  ? "لاگ آؤٹ ہو رہا ہے..."
                  : "Logging out..."
                : isUrdu
                  ? "لاگ آؤٹ"
                  : "Sign Out"}
            </span>
          </button>

          <p className="mt-3 text-center text-[10px] text-muted-foreground/60">
            {isUrdu ? "فرنیچر مینیجر" : "Furniture Manager"} · v1.0
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Authentication Loading */}
      {(checkingAuth || !user) && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
          <DashboardLayoutSkeleton />
        </div>
      )}

      {/* Desktop Sidebar */}
      {user && (
        <aside
          className={`fixed inset-y-0 z-30 hidden w-64 flex-col border-sidebar-border bg-sidebar lg:flex ${
            isUrdu ? "right-0 border-l" : "left-0 border-r"
          }`}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Sidebar */}
      {user && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside
            className={`absolute inset-y-0 flex w-72 flex-col border-sidebar-border bg-sidebar shadow-xl ${
              isUrdu ? "right-0 border-l" : "left-0 border-r"
            }`}
          >
            <div className="absolute right-3 top-4 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className={user ? (isUrdu ? "lg:pr-64" : "lg:pl-64") : ""}>
        {/* Header */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isUrdu ? "شاپ مینجمنٹ" : "Shop Manager"}
              </h2>

              <p className="hidden text-xs text-muted-foreground sm:block">
                {isUrdu
                  ? "اپنے کاروبار کو آسانی سے منظم کریں"
                  : "Manage your business efficiently"}
              </p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              <PWAInstallButton />

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                title="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M0 0h24v24H0z" fill="none" stroke="none" />
                  <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                  <path d="M12 3v18" />
                  <path d="M12 9l4.65 -4.65" />
                  <path d="M12 14.3l7.37 -7.37" />
                  <path d="M12 19.6l8.85 -8.85" />
                </svg>
              </button>

              {/* User Avatar and Connection Status */}
              <div className="relative hidden md:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>

                <span
                  className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    isOnline ? "bg-green-500" : "bg-red-500"
                  }`}
                  title={isOnline ? "Online" : "Offline"}
                />
              </div>

              {/* User Information */}
              <div
                className={`hidden md:block ${
                  isUrdu ? "text-right" : "text-left"
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {user.full_name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {isUrdu
                    ? user.role === "owner"
                      ? "مالک"
                      : "مددگار"
                    : user.role}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main
          className={`p-4 sm:p-6 lg:p-8 ${
            checkingAuth || !user ? "invisible" : ""
          }`}
        >
          {user && !checkingAuth ? (
            <OfflineSyncProvider>{children}</OfflineSyncProvider>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading dashboard...
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
