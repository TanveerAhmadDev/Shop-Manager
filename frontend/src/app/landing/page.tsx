import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Cloud,
  FileText,
  Menu,
  Package,
  ShoppingCart,
  Smartphone,
  Truck,
  Wallet,
} from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: Package,
    title: "Product Management",
    description:
      "Organize your furniture products, categories, brands, and product details in one place.",
  },
  {
    icon: Boxes,
    title: "Inventory Tracking",
    description:
      "Track every furniture item with its own model number, purchase cost, and stock status.",
  },
  {
    icon: ShoppingCart,
    title: "Sales Management",
    description:
      "Create customer bills, record payments, and keep track of outstanding balances.",
  },
  {
    icon: ClipboardList,
    title: "Purchase Management",
    description:
      "Record purchases from multiple suppliers and automatically calculate landed costs.",
  },
  {
    icon: BarChart3,
    title: "Business Reports",
    description:
      "Understand your sales, expenses, profit, and overall business performance.",
  },
  {
    icon: Cloud,
    title: "Offline Support",
    description:
      "Continue working when your internet connection is unavailable and sync when you're back online.",
  },
];

const steps = [
  {
    number: "01",
    title: "Add your products",
    description:
      "Create your product catalog and organize the furniture you sell.",
  },
  {
    number: "02",
    title: "Record purchases",
    description: "Enter new stock, supplier details, and transportation costs.",
  },
  {
    number: "03",
    title: "Manage your sales",
    description: "Create bills, receive payments, and track customer balances.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Package size={22} />
            </div>

            <span className="text-lg font-bold tracking-tight">
              Furniture Manager
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition hover:text-foreground"
            >
              How it works
            </a>
            <a href="#pricing" className="transition hover:text-foreground">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:bg-accent"
            >
              Login
            </Link>

            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
              <CheckCircle2 size={15} />
              Smarter furniture shop management
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Run your furniture business
              <span className="text-primary"> the smarter way.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Manage products, inventory, purchases, sales, customers, and
              expenses from one simple platform. Spend less time managing
              notebooks and more time growing your business.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold transition hover:bg-accent"
              >
                Explore Features
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                Easy to use
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                Inventory tracking
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                Offline support
              </span>
            </div>
          </div>

          {/* Product Screenshots Preview */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative space-y-5">
              {/* Main Products Screenshot */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">Products Management</p>
                    <p className="text-xs text-muted-foreground">
                      Organize your furniture products
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Products
                  </span>
                </div>

                <Image
                  src="/screenshots/products.png"
                  alt="Furniture Manager products management page"
                  width={1440}
                  height={900}
                  priority
                  className="h-auto w-full object-cover object-top"
                />
              </div>

              {/* Other Screenshots */}
              <div className="grid grid-cols-3 gap-3">
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <p className="text-center text-xs font-semibold">
                      Inventory
                    </p>
                  </div>

                  <Image
                    src="/screenshots/inventory.png"
                    alt="Furniture Manager inventory"
                    width={1440}
                    height={900}
                    className="h-24 w-full object-cover object-top sm:h-32"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <p className="text-center text-xs font-semibold">Sales</p>
                  </div>

                  <Image
                    src="/screenshots/sales.png"
                    alt="Furniture Manager sales"
                    width={1440}
                    height={900}
                    className="h-24 w-full object-cover object-top sm:h-32"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <p className="text-center text-xs font-semibold">
                      Purchases
                    </p>
                  </div>

                  <Image
                    src="/screenshots/purchases.png"
                    alt="Furniture Manager purchases"
                    width={1440}
                    height={900}
                    className="h-24 w-full object-cover object-top sm:h-32"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Everything in one place
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Tools to manage your entire shop
            </h2>

            <p className="mt-4 leading-7 text-muted-foreground">
              From the moment you purchase furniture to the moment you sell it,
              keep your business organized.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Simple workflow
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Get started in three simple steps
            </h2>

            <p className="mt-4 leading-7 text-muted-foreground">
              Organizing your furniture business doesn't have to be complicated.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <p className="text-5xl font-extrabold text-primary/20">
                  {step.number}
                </p>

                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>

                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-24">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Flexible plans
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            A better way to manage your shop
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            Choose a plan that matches the way your business works. Whether you
            manage your shop from one Android phone or multiple devices,
            Furniture Manager is designed to grow with you.
          </p>

          <p className="mt-5 text-sm text-muted-foreground">
            Subscription plans and pricing will be announced soon.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Get Started
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to organize your furniture business?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
            Bring your products, purchases, sales, and business records together
            in one place.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3.5 text-sm font-bold text-foreground transition hover:opacity-90"
          >
            Login to Furniture Manager
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-center sm:flex-row sm:px-8 sm:text-left">
          <div className="flex items-center gap-2">
            <Package size={19} className="text-primary" />
            <span className="text-sm font-bold">Furniture Manager</span>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
