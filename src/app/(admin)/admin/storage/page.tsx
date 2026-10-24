"use client";

import * as React from "react";
import {
  HardDrive,
  RefreshCcw,
  Clock,
  Check,
  Server,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair } from "@/lib/date";
import type { Album } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface ExpiringAlbumRow {
  id: string;
  title: string;
  clientName: string;
  sizeMb: number;
  uploadDate: string;
  expirationDate: string;
  daysLeft: number;
}

const TOTAL_NVME_CAPACITY_GB = 500;

export default function DiskStoragePage() {
  const [albums, setAlbums] = React.useState<Album[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [extendedNotification, setExtendedNotification] = React.useState<string | null>(null);

  const loadAlbums = React.useCallback(() => {
    setIsRefreshing(true);
    try {
      setAlbums(studioStore.getAlbums());
      studioStore.syncAlbums().then(setAlbums).catch(() => {});
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  React.useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleExtend = (id: string, title: string) => {
    try {
      studioStore.extendAlbumRetention(id, 30);
      loadAlbums();
      setExtendedNotification(`Extended retention for "${title}" by 30 days.`);
      setTimeout(() => setExtendedNotification(null), 3500);
    } catch {
      // ignore
    }
  };

  // Compute storage metrics
  const totalUsedBytes = albums.reduce((acc, a) => acc + (a.used_bytes || 0), 0);
  const totalUsedMb = totalUsedBytes / (1024 * 1024);
  const totalCapacityMb = TOTAL_NVME_CAPACITY_GB * 1024;
  const usagePercentage = ((totalUsedMb / totalCapacityMb) * 100).toFixed(2);

  // Watchlist items sorted by days left ascending
  const watchlist: ExpiringAlbumRow[] = albums
    .map((a) => {
      const uploadDateStr = formatCalendarPair(a.created_at).gregorian;
      const expDateStr = formatCalendarPair(a.expires_at).gregorian;
      const msLeft = new Date(a.expires_at).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        title: a.title,
        clientName: a.customer_name,
        sizeMb: (a.used_bytes || 0) / (1024 * 1024),
        uploadDate: uploadDateStr,
        expirationDate: expDateStr,
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Infrastructure & Quota
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Storage
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Monitor NVMe disk allocation, chunked media objects, and client gallery expiration.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlbums}
          disabled={isRefreshing}
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] px-4 text-xs font-bold text-slate-700 dark:text-zinc-300 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all self-start sm:self-auto"
        >
          <RefreshCcw className={`h-4 w-4 text-slate-400 dark:text-zinc-400 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {extendedNotification && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs"
        >
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{extendedNotification}</span>
        </div>
      )}

      {/* 2. STORAGE PROGRESS CARD */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 font-mono">
            Studio Primary Media Volume
          </span>
          <span className="text-xs font-bold font-mono text-slate-500 dark:text-zinc-400">
            {usagePercentage}% allocated
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-mono">
            {totalUsedMb >= 1024
              ? `${(totalUsedMb / 1024).toFixed(2)} GB`
              : `${totalUsedMb.toFixed(1)} MB`}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-zinc-400">
            used of {TOTAL_NVME_CAPACITY_GB} GB NVMe Fast Storage
          </span>
        </div>

        {/* Meter Bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-[#e21b23] transition-all duration-500"
            style={{ width: `${Math.max(Number(usagePercentage), 2)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#e21b23]" />
            Storage engine: Chunked sliced objects
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active client galleries: {albums.length} {albums.length === 1 ? "album" : "albums"}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            High availability redundancy: Active
          </span>
        </div>
      </div>

      {/* 3. WATCHLIST TABLE */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#e21b23]" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              Expiring Client Galleries Watchlist
            </h2>
          </div>
          <span className="text-xs font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase">
            {watchlist.length} {watchlist.length === 1 ? "ALBUM" : "ALBUMS"}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:bg-transparent">
                <TableHead className="pl-4 py-3.5">Album Title</TableHead>
                <TableHead className="py-3.5">Client Name</TableHead>
                <TableHead className="py-3.5 text-right">Size (MB)</TableHead>
                <TableHead className="py-3.5">Upload Date</TableHead>
                <TableHead className="py-3.5">Expiration</TableHead>
                <TableHead className="py-3.5 text-center">Status</TableHead>
                <TableHead className="py-3.5 text-right pr-4">Retention Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {watchlist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No active galleries in storage.
                  </TableCell>
                </TableRow>
              ) : (
                watchlist.map((a) => {
                  const isExpiringSoon = a.daysLeft <= 30;
                  const isExpired = a.daysLeft <= 0;

                  return (
                    <TableRow
                      key={a.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                    >
                      <TableCell className="pl-4 py-4 font-bold text-slate-900 dark:text-zinc-100">
                        {a.title}
                      </TableCell>
                      <TableCell className="py-4 text-slate-600 dark:text-zinc-300 font-medium">
                        {a.clientName}
                      </TableCell>
                      <TableCell className="py-4 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {a.sizeMb.toFixed(1)} MB
                      </TableCell>
                      <TableCell className="py-4 font-mono text-slate-500 dark:text-zinc-400">
                        {a.uploadDate}
                      </TableCell>
                      <TableCell className="py-4 font-mono text-slate-500 dark:text-zinc-400">
                        {a.expirationDate}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            isExpired
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              : isExpiringSoon
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          {isExpired ? "Expired" : `${a.daysLeft} days left`}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtend(a.id, a.title)}
                          className="h-8 rounded-xl px-3 text-xs font-bold border-slate-200 dark:border-zinc-700 hover:border-red-500 hover:text-[#e21b23] transition-colors"
                        >
                          +30 Days Extension
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
