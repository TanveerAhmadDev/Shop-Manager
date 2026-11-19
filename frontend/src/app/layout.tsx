import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Noto_Nastaliq_Urdu } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/context/language-context";
import QueryProvider from "@/providers/query-provider";
import PWARegister from "./pwa-register";
import OfflineGuard from "@/components/offline-guard";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/providers/theme-provider";
import ThemeColor from "@/components/theme-color";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoUrdu = Noto_Nastaliq_Urdu({
  weight: "400",
  subsets: ["arabic"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Furniture Manager",
  description: "Furniture Shop Management System",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        notoUrdu.variable,
        "font-sans",
      )}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <ThemeColor />
          <LanguageProvider>
            <QueryProvider>
              <OfflineGuard />
              <Toaster />
              {children}
              <PWARegister />
            </QueryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
