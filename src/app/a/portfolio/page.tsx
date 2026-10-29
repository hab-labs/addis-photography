"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import { generateQrPng, downloadFile } from "@/lib/qr";
import type { PublicPortfolioItem } from "@/types";

const PORTFOLIO_CATEGORIES = [
  "ALL",
  "PORTRAITS",
  "WEDDINGS",
  "CELEBRATIONS",
  "EDITORIAL",
] as const;

export default function PublicPortfolioPage() {
  const [portfolioItems, setPortfolioItems] = React.useState<PublicPortfolioItem[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<string>("ALL");
  const [qrUrl, setQrUrl] = React.useState<string>("");
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [lightboxItem, setLightboxItem] = React.useState<PublicPortfolioItem | null>(null);

  React.useEffect(() => {
    // Initial display
    const items = studioStore.getPublicPortfolio();
    setPortfolioItems(items);

    // Live cross-device sync from server / Neon PostgreSQL database
    studioStore
      .syncPublicPortfolio()
      .then((live) => {
        if (live && live.length > 0) {
          setPortfolioItems(live);
        }
      })
      .catch(() => {});

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const showcaseUrl = `${origin}/a/portfolio`;
    generateQrPng(showcaseUrl).then(setQrUrl).catch(() => {});
  }, []);

  const handleCopyLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const showcaseUrl = `${origin}/a/portfolio`;
    try {
      await navigator.clipboard.writeText(showcaseUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const filteredItems = portfolioItems.filter((item) => {
    if (activeCategory === "ALL") return true;
    return item.category === activeCategory;
  });

  const lightboxIndex = lightboxItem
    ? filteredItems.findIndex((item) => item.id === lightboxItem.id)
    : -1;

  const handlePrevPhoto = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (filteredItems.length === 0) return;
      const currentIdx = lightboxItem
        ? filteredItems.findIndex((item) => item.id === lightboxItem.id)
        : -1;
      const prevIdx =
        currentIdx <= 0 ? filteredItems.length - 1 : currentIdx - 1;
      setLightboxItem(filteredItems[prevIdx]);
    },
    [filteredItems, lightboxItem]
  );

  const handleNextPhoto = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (filteredItems.length === 0) return;
      const currentIdx = lightboxItem
        ? filteredItems.findIndex((item) => item.id === lightboxItem.id)
        : -1;
      const nextIdx =
        currentIdx === -1 || currentIdx >= filteredItems.length - 1
          ? 0
          : currentIdx + 1;
      setLightboxItem(filteredItems[nextIdx]);
    },
    [filteredItems, lightboxItem]
  );

  React.useEffect(() => {
    if (!lightboxItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevPhoto();
      } else if (e.key === "ArrowRight") {
        handleNextPhoto();
      } else if (e.key === "Escape") {
        setLightboxItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxItem, handlePrevPhoto, handleNextPhoto]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#e21b23] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e21b23]/15 border border-[#e21b23]/40 text-[#e21b23]">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-sm uppercase text-white block font-serif">
              Addis Photography Studio
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
              Public Showcase Portfolio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Public Album
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-zinc-700 bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800 hover:text-white text-xs h-8 gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-20">
        {/* Hero Section (Screenshot 3) */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-[#121214] via-[#0d0d0f] to-[#09090b] p-6 sm:p-12 lg:p-16 min-h-[480px] flex flex-col justify-between shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-[#e21b23] uppercase">
              ADDIS PHOTOGRAPHY STUDIO · PUBLIC SHOWCASE
            </span>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal text-white leading-[1.05] tracking-tight">
              Stories shaped <br />
              <span className="italic font-light text-zinc-300">by light.</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-xl">
              A living collection of portraits, celebrations, and honest moments from Addis Ababa. Curated with artistic vision and master craft.
            </p>

            <div className="pt-4 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-tight">
                {portfolioItems.length}
              </span>
              <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">
                Curated Photographs
              </span>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 lg:w-3/5 overflow-hidden pointer-events-none opacity-40 sm:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85"
              alt="Featured Story"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121214] via-[#121214]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
          </div>
        </section>

        {/* Share Section (Screenshot 4) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-zinc-800/80 bg-[#121214] p-8 sm:p-12 shadow-xl">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-400 uppercase block font-mono">
              SHARE THE EXPERIENCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight font-medium">
              Scan. Discover. Remember.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-light">
              Invite customers and guests to explore the studio's public portfolio instantly. No account or PIN is required for this showcase.
            </p>

            <div className="pt-2 max-w-lg">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 p-1.5 pl-3.5">
                <span className="text-xs font-mono text-zinc-400 truncate flex-1">
                  {typeof window !== "undefined" ? `${window.location.origin}/a/portfolio` : "https://addisphotography.et/a/portfolio"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="h-8 px-3 text-xs text-white hover:bg-zinc-800 gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Only photos approved for public viewing appear here.</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-xs rounded-2xl border border-zinc-700 bg-[#18181b] p-6 text-center shadow-2xl space-y-4">
              {qrUrl ? (
                <div className="rounded-xl bg-white p-4 mx-auto w-fit shadow-md">
                  <Image
                    src={qrUrl}
                    alt="Showcase QR"
                    width={180}
                    height={180}
                    className="rounded"
                  />
                </div>
              ) : (
                <div className="h-44 w-44 rounded-xl bg-zinc-800 animate-pulse mx-auto" />
              )}

              <div>
                <h3 className="font-serif text-base font-semibold text-white">Scan to view the album</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Point any phone camera at the QR code</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => qrUrl && downloadFile(qrUrl, "addis-studio-portfolio-qr.png")}
                className="w-full border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download QR Code</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Selected Work Masonry Grid (Screenshot 5) */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
            <div>
              <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-400 uppercase block font-mono">
                SELECTED WORK
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif text-white tracking-tight mt-1 font-medium">
                Made to be felt.
              </h2>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800">
              {PORTFOLIO_CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#e21b23] text-white shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Masonry Columns Grid - displays each photo naturally based on its original aspect ratio */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxItem(item)}
                className="mb-6 break-inside-avoid group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300 hover:border-zinc-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-auto block object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none" />

                {/* Hover content */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e21b23]">
                    {item.category}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-medium text-white leading-snug">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-xs text-zinc-300 font-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Lightbox Modal with Forward / Backward Navigation */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none"
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxItem(null)}
            aria-label="Close"
            className="absolute top-5 right-5 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous Photo Button */}
          {filteredItems.length > 1 && (
            <button
              onClick={handlePrevPhoto}
              aria-label="Previous photograph"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next Photo Button */}
          {filteredItems.length > 1 && (
            <button
              onClick={handleNextPhoto}
              aria-label="Next photograph"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Center Image Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl max-h-[90vh] flex flex-col items-center space-y-3 px-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxItem.image_url}
              alt={lightboxItem.title}
              className="max-h-[78vh] max-w-[85vw] w-auto h-auto rounded-xl object-contain shadow-2xl"
            />
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e21b23]">
                  {lightboxItem.category}
                </span>
                {lightboxIndex >= 0 && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    {lightboxIndex + 1} / {filteredItems.length}
                  </span>
                )}
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-medium text-white">{lightboxItem.title}</h3>
              {lightboxItem.caption && (
                <p className="text-xs text-zinc-400 max-w-lg mx-auto">{lightboxItem.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
