"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ImageIcon,
  Plus,
  Search,
  HardDrive,
  CloudUpload,
  Lock,
  QrCode,
  Share2,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import { formatDate } from "@/lib/date";
import type { Album as StoreAlbum } from "@/types";

type ClientAlbum = StoreAlbum & {
  coverUrl: string;
  mediaCount: number;
  usedMb: number;
  quotaMb: number;
  createdDate: string;
  isPinLocked: boolean;
  slug: string;
  clientName: string;
};

export default function ClientAlbumsPage() {
  const [albums, setAlbums] = React.useState<ClientAlbum[]>([]);
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const sharedAlbums = studioStore.getAlbums().map((album: StoreAlbum) => ({
      ...album,
      clientName: album.customer_name,
      coverUrl:
        album.cover_image_url ||
        "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop",
      mediaCount: album.file_count,
      usedMb: album.used_bytes / (1024 * 1024),
      quotaMb: album.quota_bytes / (1024 * 1024),
      createdDate: formatDate(album.created_at),
      isPinLocked: album.is_locked,
      slug: album.token,
    }));
    setAlbums(sharedAlbums);
    setIsLoading(false);
  }, []);

  const totalUsedMb = albums.reduce((acc, a) => acc + a.usedMb, 0);
  const totalQuotaMb = albums.length * 1024;
  const storagePercentage = Math.round((totalUsedMb / totalQuotaMb) * 100);

  const filteredAlbums = albums.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Special-Occasion Albums
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Digital Delivery
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Create high-resolution client galleries, manage cloud storage, and export shareable QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search albums, clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-60 rounded-full bg-white border border-slate-200/80 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            />
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Album</span>
          </Button>
        </div>
      </div>

      {/* Apple-Style Storage Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Metric 1: Total Albums */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Albums
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600  ">
              <ImageIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              {albums.length}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">
            Published client delivery links
          </p>
        </div>

        {/* Metric 2: Storage Used */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Storage Used
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600  ">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold tracking-tight text-amber-600  tabular-nums">
              {totalUsedMb.toFixed(1)} <span className="text-sm font-semibold text-slate-400">MB</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Cloud Capacity</span>
              <span>{storagePercentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100  overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.max(storagePercentage, 8)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Quota Allocation */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Standard Quota
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600  ">
              <CloudUpload className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold tracking-tight text-emerald-600  tabular-nums">
              1,024 <span className="text-sm font-semibold text-slate-400">MB / Album</span>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">
            High-speed chunked CDN distribution
          </p>
        </div>
      </div>

      {/* Album Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading ? (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-xs font-medium text-slate-400">
            Loading client albums…
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-xs font-medium text-slate-400">
            No albums match your search.
          </div>
        ) : filteredAlbums.map((album) => {
          const usedPct = Math.round((album.usedMb / album.quotaMb) * 100);

          return (
            <div
              key={album.id}
              className="group overflow-hidden rounded-3xl bg-white  shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-xl hover:border-slate-200  transition-all duration-300"
            >
              {/* Media Card Cover */}
              <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  fill
                  className="object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/30" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
                    <Layers className="h-3 w-3" />
                    {album.mediaCount} Media Items
                  </span>

                  {album.isPinLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md border border-amber-500/30">
                      <Lock className="h-3 w-3" />
                      PIN Protected
                    </span>
                  )}
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-base font-bold text-white leading-snug drop-shadow-sm">
                    {album.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">
                    Client: {album.clientName}
                  </p>
                </div>
              </div>

              {/* Lower Details Area */}
              <div className="p-6 space-y-5">
                {/* Storage Meter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 ">
                      Gallery Storage:{" "}
                      <strong className="text-slate-800 ">
                        {album.usedMb.toFixed(1)} MB
                      </strong>{" "}
                      / {album.quotaMb} MB
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {usedPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100  overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${Math.max(usedPct, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 ">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {album.createdDate}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Share link"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600    transition-colors shadow-2xs"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="View QR Code"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600    transition-colors shadow-2xs"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 shadow-sm"
                    >
                      <Link href={`/albums/${album.id}`}>
                        <ExternalLink className="h-3 w-3" />
                        <span>Manage & Upload</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}