import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

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
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('addis_theme');
                var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased selection:bg-red-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}