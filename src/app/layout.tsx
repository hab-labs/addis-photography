import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Addis Photography | Studio Management & Album System",
  description: "Comprehensive management system for Addis Photography Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", GeistSans.variable)}>
      <body className="min-h-screen font-sans antialiased selection:bg-red-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}