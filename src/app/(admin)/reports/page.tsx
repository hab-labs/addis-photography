"use client";

import * as React from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  Wallet,
  Smartphone,
  Banknote,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SalesReportsPage() {
  const [filter, setFilter] = React.useState<"all" | "daily">("all");

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Sales & Financial Reports
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Real-time
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Studio revenue analytics, payment channels, and daily transaction audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Segmented Filter */}
          <div className="flex items-center rounded-full bg-slate-200/60  p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-sm  "
                  : "text-slate-500 hover:text-slate-900 "
              }`}
            >
              Lifetime All
            </button>
            <button
              type="button"
              onClick={() => setFilter("daily")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                filter === "daily"
                  ? "bg-white text-slate-900 shadow-sm  "
                  : "text-slate-500 hover:text-slate-900 "
              }`}
            >
              Daily Breakdown
            </button>
          </div>

          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50   "
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Clean Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Bookings */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Gross Bookings
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900  tabular-nums">
              ETB 7,150.00
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">4 total orders</p>
        </div>

        {/* Total Collected */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 ">
            Total Collected
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-emerald-600  tabular-nums">
              ETB 6,650.00
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Realized studio income</p>
        </div>

        {/* Outstanding Due */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
            Outstanding Due
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-rose-500 tabular-nums">
              ETB 500.00
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Uncollected client balances</p>
        </div>

        {/* Telebirr Volume */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 ">
            Telebirr Volume
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-indigo-600  tabular-nums">
              ETB 2,850.00
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Digital mobile wallet</p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Left: Revenue by Photo Service */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 ">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 ">
              Revenue by Photo Service
            </h2>
          </div>

          <div className="divide-y divide-slate-100  text-xs">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-slate-800 ">Graduation Master Package</p>
                <p className="text-[11px] text-slate-400">2 units delivered</p>
              </div>
              <span className="font-mono font-bold text-slate-900  tabular-nums">
                ETB 4,800.00
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-slate-800 ">Standard Passport / Visa (4 Copies)</p>
                <p className="text-[11px] text-slate-400">2 units delivered</p>
              </div>
              <span className="font-mono font-bold text-slate-900  tabular-nums">
                ETB 700.00
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-slate-800 ">Premium Wooden Frame (30x40 cm)</p>
                <p className="text-[11px] text-slate-400">1 units delivered</p>
              </div>
              <span className="font-mono font-bold text-slate-900  tabular-nums">
                ETB 1,200.00
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-slate-800 ">Instant 10x15 Glossy Print</p>
                <p className="text-[11px] text-slate-400">3 units delivered</p>
              </div>
              <span className="font-mono font-bold text-slate-900  tabular-nums">
                ETB 450.00
              </span>
            </div>
          </div>
        </div>

        {/* Right: Payment Methods Breakdown */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 ">
            <Wallet className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 ">
              Payment Methods Breakdown
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            {/* Telebirr */}
            <div className="rounded-2xl bg-indigo-50/50  p-4 border border-indigo-100/60 ">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 ">
                Telebirr
              </span>
              <div className="text-sm font-black text-slate-900  tabular-nums mt-1.5">
                ETB 2,850.00
              </div>
            </div>

            {/* Cash */}
            <div className="rounded-2xl bg-emerald-50/50  p-4 border border-emerald-100/60 ">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 ">
                Physical Cash
              </span>
              <div className="text-sm font-black text-slate-900  tabular-nums mt-1.5">
                ETB 3,800.00
              </div>
            </div>

            {/* CBE / Bank */}
            <div className="rounded-2xl bg-violet-50/50  p-4 border border-violet-100/60 ">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 ">
                CBE Birr & Bank
              </span>
              <div className="text-sm font-black text-slate-900  tabular-nums mt-1.5">
                ETB 0.00
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <div className="pt-6 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ethiopian Fiscal Compliance</span>
            <span className="font-semibold text-slate-600 ">
              Studio VAT / TOT Ledger Active (UTC+3)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}