import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Album Gallery | Addis Photography",
  description: "Private digital album delivery",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  referrer: "no-referrer",
};

export default function PublicAlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-white">
      {/* Minimal lightweight shell with noindex & no-referrer */}
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex, nofollow" />
      {children}
    </div>
  );
}
