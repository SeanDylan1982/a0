import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/language-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { InventoryAlerts } from "@/components/inventory-alerts";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Account Zero - South African Business Management",
  description: "Comprehensive business management solution for South African small businesses with POPIA, VAT, PAYE, and UIF compliance.",
  keywords: ["Account Zero", "Business Management", "South Africa", "POPIA", "VAT", "PAYE", "UIF", "Next.js", "TypeScript"],
  authors: [{ name: "Account Zero Team" }],
  openGraph: {
    title: "Account Zero - South African Business Management",
    description: "Comprehensive business management solution for South African small businesses",
    url: "https://accountzero.co.za",
    siteName: "Account Zero",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Account Zero - South African Business Management",
    description: "Comprehensive business management solution for South African small businesses",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${mono.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          <SidebarProvider>
            {children}
            <InventoryAlerts />
            <Toaster />
          </SidebarProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
