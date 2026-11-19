import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Package,
  Boxes,
  Users,
  Truck,
  Wallet,
  TrendingUp,
} from "lucide-react";

const navigationIcons = [
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Package,
  Boxes,
  Users,
  Truck,
  Wallet,
  TrendingUp,
];

export default function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="h-9 w-9 rounded-lg bg-muted" />

          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-hidden p-3">
          <div className="mb-3 h-3 w-20 rounded bg-muted" />

          {navigationIcons.map((Icon, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            >
              <Icon size={19} className="text-muted-foreground/30" />
              <div className="h-4 w-28 rounded bg-muted" />
            </div>
          ))}

          {/* Management */}
          <div className="space-y-4 pt-4">
            <div className="h-3 w-24 rounded bg-muted" />

            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-4">
          <div className="h-9 w-full rounded-lg bg-muted" />
        </div>
      </aside>

      {/* Main Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <div className="h-9 w-9 rounded-lg bg-muted lg:hidden" />

            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="hidden h-3 w-48 rounded bg-muted sm:block" />
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="h-9 w-9 rounded-lg bg-muted" />

            <div className="hidden items-center gap-3 md:flex">
              <div className="h-9 w-9 rounded-full bg-muted" />

              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Page Heading */}
          <div className="space-y-6 animate-pulse">
            {/* Page Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-8 w-32 rounded bg-muted" />
                <div className="h-4 w-64 max-w-full rounded bg-muted" />
              </div>

              <div className="h-10 w-24 rounded-lg bg-muted" />
            </div>

            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  {/* Card Heading */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-28 rounded bg-muted" />

                    <div className="h-10 w-10 rounded-lg bg-muted" />
                  </div>

                  {/* Amount */}
                  <div className="mt-4 h-7 w-36 rounded bg-muted" />

                  {/* Description */}
                  <div className="mt-2 h-3 w-44 max-w-full rounded bg-muted" />
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-6 w-32 rounded bg-muted" />
                <div className="h-4 w-64 max-w-full rounded bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    {/* Icon and Plus */}
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-lg bg-muted" />
                      <div className="h-4 w-4 rounded bg-muted" />
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-2">
                      <div className="h-4 w-24 max-w-full rounded bg-muted" />
                      <div className="h-3 w-28 max-w-full rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Overview */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="h-6 w-40 rounded bg-muted" />

              <div className="mt-4 space-y-3">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 max-w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
