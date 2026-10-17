"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair } from "@/lib/date";
import type { Album as StoreAlbum } from "@/types";

type ClientAlbum = StoreAlbum & {
  coverUrl: string;
  clientName: string;
  mediaCount: number;
  createdDate: string;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";

export default function ClientAlbumsPage() {
  const [albums, setAlbums] = React.useState<ClientAlbum[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("All statuses");
  const [expiringOnly, setExpiringOnly] = React.useState(false);

  React.useEffect(() => {
    setAlbums(
      studioStore.getAlbums().map((album: StoreAlbum) => {
        const date = formatCalendarPair(album.created_at);
        return {
          ...album,
          clientName: album.customer_name,
          coverUrl: album.cover_image_url || fallbackCover,
          mediaCount: album.file_count,
          createdDate: `${date.gregorian}`,
        };
      })
    );
  }, []);

  const filteredAlbums = albums.filter((album) => {
    const matchesSearch =
      album.title.toLowerCase().includes(search.toLowerCase()) ||
      album.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      status === "All statuses" ||
      (status === "Published" && !album.is_locked) ||
      (status === "Draft" && album.is_locked);
    const expiresSoon =
      new Date(album.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;
    return matchesSearch && matchesStatus && (!expiringOnly || expiresSoon);
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e31b23]">
            Customer galleries
          </p>
          <h1 className="mt-1 text-[25px] font-semibold leading-none text-slate-900">
            Albums
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Create, publish, and manage private customer collections.
          </p>
        </div>
        <Button className="h-8 gap-1.5 rounded-md bg-[#e31b23] px-4 text-xs font-semibold shadow-sm hover:bg-[#c9151c]">
          <Plus className="h-3.5 w-3.5" />
          New Album
        </Button>
      </section>

      <section className="flex min-h-[52px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="relative min-w-[170px] flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search albums or customers"
            className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[11px] text-slate-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
          />
        </div>
        <label className="relative min-w-[170px] flex-1">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-7 text-[11px] text-slate-600 outline-none"
          >
            <option>All statuses</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
        </label>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(event) => setExpiringOnly(event.target.checked)}
            className="h-3 w-3 rounded border-slate-300 accent-[#e31b23]"
          />
          Expiring soon
        </label>
        <span className="hidden text-[10px] text-slate-400 sm:block">
          {filteredAlbums.length} albums
        </span>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredAlbums.map((album) => {
          // PIN protection is independent from publication status.
          const published = album.file_count > 0;
          const eventDate = formatCalendarPair(album.event_date).gregorian;
          return (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-[154px] overflow-hidden bg-slate-100">
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
                <span
                  className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    published
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {published ? "Published" : "Draft"}
                </span>
                <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/45 text-white backdrop-blur-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              </div>
              <div className="p-2.5">
                <h2 className="truncate text-[11px] font-semibold text-slate-800">
                  {album.title}
                </h2>
                <p className="mt-1 truncate text-[9px] text-slate-400">{album.clientName}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {album.mediaCount} photos
                  </span>
                  <span className="flex items-center gap-1">
                    {new Date(album.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30 ? (
                      <Clock3 className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CalendarDays className="h-3 w-3" />
                    )}
                    {eventDate}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {filteredAlbums.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center text-xs text-slate-400">
          No albums match your filters.
        </div>
      )}
    </div>
  );
}
