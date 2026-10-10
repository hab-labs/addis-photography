import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

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
    <html lang="en" className={cn("font-sans", plusJakartaSans.variable)}>
      <body className="min-h-screen font-sans antialiased selection:bg-red-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}