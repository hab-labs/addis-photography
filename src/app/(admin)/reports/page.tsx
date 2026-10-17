"use client";

import * as React from "react";
import Decimal from "decimal.js";
import {
  TrendingUp,
  Download,
  Wallet,
  Sparkles,
  RefreshCw,
  Layers,
  Banknote,
  Smartphone,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import { isTodayInAddis, formatCalendarPair } from "@/lib/date";
import type { Order } from "@/types";

export default function SalesReportsPage() {
  const [filter, setFilter] = React.useState<"all" | "daily">("all");
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(() => {
    try {
      setOrders(studioStore.getOrders());
      studioStore.syncOrders().then(setOrders).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter orders (excluding voided orders from financial metrics)
  const activeOrders = React.useMemo(() => {
    const nonVoided = orders.filter((o) => o.status !== "voided");
    if (filter === "daily") {
      return nonVoided.filter((o) => isTodayInAddis(o.created_at));
    }
    return nonVoided;
  }, [orders, filter]);

  // Aggregate Top Metrics
  const metrics = React.useMemo(() => {
    let gross = new Decimal(0);
    let collected = new Decimal(0);
    let due = new Decimal(0);
    let telebirr = new Decimal(0);
    let cash = new Decimal(0);
    let cbe = new Decimal(0);

    activeOrders.forEach((o) => {
      gross = gross.plus(new Decimal(o.total_amount || 0));
      collected = collected.plus(new Decimal(o.paid_amount || 0));
      const bal = new Decimal(o.balance_amount || 0);
      if (bal.isPositive()) {
        due = due.plus(bal);
      }

      (o.payments || []).forEach((p) => {
        const amt = new Decimal(p.amount || 0);
        if (p.payment_method === "telebirr") {
          telebirr = telebirr.plus(amt);
        } else if (p.payment_method === "cash") {
          cash = cash.plus(amt);
        } else if (p.payment_method === "cbe_birr" || p.payment_method === "bank_transfer") {
          cbe = cbe.plus(amt);
        }
      });
    });

    return {
      orderCount: activeOrders.length,
      gross: gross.toFixed(2),
      collected: collected.toFixed(2),
      due: due.toFixed(2),
      telebirr: telebirr.toFixed(2),
      cash: cash.toFixed(2),
      cbe: cbe.toFixed(2),
    };
  }, [activeOrders]);

  // Revenue by Photo Service
  const serviceStats = React.useMemo(() => {
    const map = new Map<string, { count: number; revenue: Decimal }>();

    activeOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.photo_type_name || "General Photography";
        const current = map.get(key) || { count: 0, revenue: new Decimal(0) };
        const lineTotal = new Decimal(item.line_total || 0);
        map.set(key, {
          count: current.count + (item.quantity || 1),
          revenue: current.revenue.plus(lineTotal),
        });
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue.toFixed(2),
        rawRevenue: data.revenue.toNumber(),
      }))
      .sort((a, b) => b.rawRevenue - a.rawRevenue);
  }, [activeOrders]);

  // CSV Export
  const handleExportCSV = () => {
    if (activeOrders.length === 0) return;
    const headers = [
      "Order Number",
      "Date",
      "Customer",
      "Phone",
      "Services",
      "Total Amount (ETB)",
      "Paid Amount (ETB)",
      "Balance Due (ETB)",
      "Status",
    ];
    const rows = activeOrders.map((o) => [
      o.order_number,
      formatCalendarPair(o.created_at).gregorian,
      `"${(o.customer?.name || "Walk-In").replace(/"/g, '""')}"`,
      `"${o.customer?.phone || ""}"`,
      `"${(o.items || []).map((i) => `${i.quantity}x ${i.photo_type_name}`).join("; ").replace(/"/g, '""')}"`,
      o.total_amount,
      o.paid_amount,
      o.balance_amount,
      o.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `addis-sales-report-${filter}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Reports
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Real-time
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Review studio financial activity, payment breakdowns, and service revenues.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Segmented Filter */}
          <div className="flex items-center rounded-full bg-slate-200/60 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Lifetime All
            </button>
            <button
              type="button"
              onClick={() => setFilter("daily")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                filter === "daily"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Daily Breakdown
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh financial reports"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={activeOrders.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Clean Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Bookings */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Gross Bookings
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
              ETB {Number(metrics.gross).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">
            {metrics.orderCount} active {metrics.orderCount === 1 ? "order" : "orders"}
          </p>
        </div>

        {/* Total Collected */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Total Collected
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-emerald-600 tabular-nums">
              ETB {Number(metrics.collected).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Realized studio income</p>
        </div>

        {/* Outstanding Due */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
            Outstanding Due
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-rose-500 tabular-nums">
              ETB {Number(metrics.due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Uncollected client balances</p>
        </div>

        {/* Telebirr Volume */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Telebirr Volume
          </span>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-indigo-600 tabular-nums">
              ETB {Number(metrics.telebirr).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Digital mobile wallet</p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Left: Revenue by Photo Service */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Revenue by Photo Service
            </h2>
          </div>

          {serviceStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No service transactions recorded for this period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {serviceStats.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.count} {item.count === 1 ? "unit" : "units"} delivered
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    ETB {Number(item.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Payment Methods Breakdown */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Wallet className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Payment Methods Breakdown
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            {/* Telebirr */}
            <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100/60">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Telebirr
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 tabular-nums mt-1.5">
                ETB {Number(metrics.telebirr).toFixed(2)}
              </div>
            </div>

            {/* Cash */}
            <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100/60">
              <div className="flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Physical Cash
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 tabular-nums mt-1.5">
                ETB {Number(metrics.cash).toFixed(2)}
              </div>
            </div>

            {/* CBE / Bank */}
            <div className="rounded-2xl bg-violet-50/50 p-4 border border-violet-100/60">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-violet-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  CBE Birr & Bank
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 tabular-nums mt-1.5">
                ETB {Number(metrics.cbe).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <div className="pt-6 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ethiopian Fiscal Compliance</span>
            <span className="font-semibold text-slate-600">
              Studio VAT / TOT Ledger Active (UTC+3)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}