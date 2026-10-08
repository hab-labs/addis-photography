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
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExpiringAlbum {
  id: string;
  title: string;
  clientName: string;
  sizeMb: number;
  uploadDate: string;
  expirationDate: string;
  daysLeft: number;
}

const ALBUMS_WATCHLIST: ExpiringAlbum[] = [
  {
    id: "a1",
    title: "Bethlehem & Dawit Wedding Ceremony",
    clientName: "Bethlehem Assefa",
    sizeMb: 460.0,
    uploadDate: "21/09/2026",
    expirationDate: "21/12/2026",
    daysLeft: 80,
  },
  {
    id: "a2",
    title: "Kidus Girma Graduation Portrait Highlights",
    clientName: "Kidus Girma",
    sizeMb: 120.0,
    uploadDate: "30/09/2026",
    expirationDate: "01/12/2026",
    daysLeft: 60,
  },
];

export default function DiskStoragePage() {
  const [albums, setAlbums] = React.useState<ExpiringAlbum[]>(ALBUMS_WATCHLIST);

  const handleExtend = (id: string) => {
    setAlbums((prev) =>
      prev.map((a) => (a.id === id ? { ...a, daysLeft: a.daysLeft + 30 } : a))
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Disk Capacity & Retention Monitor
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <HardDrive className="h-3 w-3" /> Storage Engine
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Studio NVMe SSD capacity status and 90-day retention policies for client photo galleries.
          </p>
        </div>

        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50    transition-all"
        >
          <RefreshCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Main Storage Bar Card */}
      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Studio Primary Media Volume
          </span>
          <span className="text-xs font-bold text-slate-400">
            0% allocated
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 ">
            580.0 MB
          </span>
          <span className="text-xs font-medium text-slate-400">
            used of 500 GB NVMe Storage
          </span>
        </div>

        {/* Apple-style smooth meter bar */}
        <div className="h-2.5 w-full rounded-full bg-slate-100  overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
            style={{ width: "3%" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Storage engine: Chunked sliced objects
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active client galleries: 2 albums
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            High availability redundancy: Active
          </span>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 ">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 ">
              Expiring Client Galleries Watchlist
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            2 tracked albums
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-transparent">
                <TableHead className="pl-4">Album Title</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Size (MB)</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-4">Retention Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/80 ">
              {albums.map((a) => (
                <TableRow
                  key={a.id}
                  className="border-none hover:bg-slate-50/80  transition-colors text-xs"
                >
                  <TableCell className="pl-4 py-3.5 font-bold text-slate-800 ">
                    {a.title}
                  </TableCell>
                  <TableCell className="text-slate-500">{a.clientName}</TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-slate-700 ">
                    {a.sizeMb.toFixed(1)} MB
                  </TableCell>
                  <TableCell className="font-mono text-slate-400">{a.uploadDate}</TableCell>
                  <TableCell className="font-mono text-slate-400">{a.expirationDate}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100  px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ">
                      {a.daysLeft} days left
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <button
                      type="button"
                      onClick={() => handleExtend(a.id)}
                      className="rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600    px-3 py-1 text-[11px] font-semibold text-slate-600  transition-colors shadow-2xs"
                    >
                      +30 Days Extension
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}