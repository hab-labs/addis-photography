"use client";

import * as React from "react";
import {
  HardDrive,
  RefreshCcw,
  Clock,
  Sparkles,
  Server,
  Layers,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Check,
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
              Storage
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-800">
              <HardDrive className="h-3 w-3" /> Storage Engine
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-zinc-400 mt-1">
            Monitor NVMe disk allocation, chunked media objects, and client gallery expiration.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlbums}
          disabled={isRefreshing}
          className="flex h-9 items-center gap-2 rounded-full border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-[#121214] px-4 text-xs font-semibold text-slate-700 dark:text-zinc-200 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 text-slate-400 dark:text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {extendedNotification && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{extendedNotification}</span>
        </div>
      )}

      {/* Main Storage Bar Card */}
      <div className="rounded-3xl bg-white dark:bg-[#121214] p-6 shadow-sm border border-slate-100 dark:border-zinc-800 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
            Studio Primary Media Volume
          </span>
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-400">
            {usagePercentage}% allocated
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            {totalUsedMb >= 1024
              ? `${(totalUsedMb / 1024).toFixed(2)} GB`
              : `${totalUsedMb.toFixed(1)} MB`}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-zinc-400">
            used of {TOTAL_NVME_CAPACITY_GB} GB NVMe Fast Storage
          </span>
        </div>

        {/* Smooth meter bar */}
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
            style={{ width: `${Math.max(Number(usagePercentage), 2)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-[11px] font-medium text-slate-400 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Storage engine: Chunked sliced objects
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active client galleries: {albums.length} {albums.length === 1 ? "album" : "albums"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            High availability redundancy: Active
          </span>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-3xl bg-white dark:bg-[#121214] p-6 shadow-sm border border-slate-100 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Expiring Client Galleries Watchlist
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-zinc-400">
            {watchlist.length} tracked {watchlist.length === 1 ? "album" : "albums"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 hover:bg-transparent">
                <TableHead className="pl-4">Album Title</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Size (MB)</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-4">Retention Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/80 dark:divide-zinc-800/80">
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
                      className="border-none hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                    >
                      <TableCell className="pl-4 py-3.5 font-bold text-slate-800 dark:text-zinc-200">
                        {a.title}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-zinc-400">{a.clientName}</TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums text-slate-700 dark:text-zinc-300">
                        {a.sizeMb.toFixed(1)} MB
                      </TableCell>
                      <TableCell className="font-mono text-slate-400 dark:text-zinc-400">{a.uploadDate}</TableCell>
                      <TableCell className="font-mono text-slate-400 dark:text-zinc-400">{a.expirationDate}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
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
                      <TableCell className="text-right pr-4">
                        <button
                          type="button"
                          onClick={() => handleExtend(a.id, a.title)}
                          className="rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 transition-colors shadow-2xs"
                        >
                          +30 Days Extension
                        </button>
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