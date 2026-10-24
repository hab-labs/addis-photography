"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Calendar as CalendarIcon,
  Download,
  Wallet,
  RefreshCw,
  Banknote,
  Smartphone,
  Building2,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair, formatDate, isSameDayInAddis } from "@/lib/date";
import { formatETB } from "@/lib/money";
import type { Order } from "@/types";

type DateRangePreset = "today" | "week" | "month" | "custom";

interface DayRowSummary {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  bookingsCount: number;
  qty3x4: number;
  qty10x15: number;
  qty30x45: number;
  qty13x18: number;
  qty20x25: number;
  qtyOther: number;
  grossValue: Decimal;
  paidAmount: Decimal;
  dueAmount: Decimal;
  cashReceived: Decimal;
}

export default function AdminReportsPage() {
  const { isAdmin } = useAuth();

  // Date range state
  const [rangePreset, setRangePreset] = React.useState<DateRangePreset>("month");
  const [customStart, setCustomStart] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsRefreshing(true);
    try {
      setOrders(studioStore.getOrders());
      studioStore
        .syncOrders()
        .then(setOrders)
        .catch(() => {})
        .finally(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        });
    } catch {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute exact Date Range bounds
  const { startDate, endDate, rangeLabel } = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (rangePreset === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `Today (${formatDate(now)})`,
      };
    }

    if (rangePreset === "week") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `Past 7 Days (${formatDate(start)} – ${formatDate(end)})`,
      };
    }

    if (rangePreset === "month") {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `Past 30 Days (${formatDate(start)} – ${formatDate(end)})`,
      };
    }

    // Custom
    const cStart = new Date(customStart + "T00:00:00");
    const cEnd = new Date(customEnd + "T23:59:59");
    return {
      startDate: isNaN(cStart.getTime()) ? new Date(0) : cStart,
      endDate: isNaN(cEnd.getTime()) ? new Date() : cEnd,
      rangeLabel: `Custom (${formatDate(cStart)} – ${formatDate(cEnd)})`,
    };
  }, [rangePreset, customStart, customEnd]);

  // Orders filtered by the date range (FR-15 & FR-16)
  const rangeOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "voided") return false;
      const orderDate = new Date(o.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  // Summary Metrics across the range: Bookings, Value, Paid, Due, Cash received
  const summaryMetrics = React.useMemo(() => {
    let bookingsCount = 0;
    let totalValue = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalDue = new Decimal(0);
    let cashReceived = new Decimal(0);

    rangeOrders.forEach((o) => {
      bookingsCount += 1;
      const orderTotal = new Decimal(o.total_amount || 0);
      const paid = new Decimal(o.paid_amount || 0);
      totalValue = totalValue.plus(orderTotal);
      totalPaid = totalPaid.plus(paid);
      const bal = new Decimal(o.balance_amount || 0);
      if (bal.greaterThan(0)) {
        totalDue = totalDue.plus(bal);
      }
    });

    // Cash received: payment-date view for cash payments made between startDate and endDate
    orders.forEach((o) => {
      if (o.status === "voided") return;
      (o.payments || []).forEach((p) => {
        if (p.payment_method === "cash") {
          const pDate = new Date(p.created_at);
          if (pDate >= startDate && pDate <= endDate) {
            cashReceived = cashReceived.plus(new Decimal(p.amount || 0));
          }
        }
      });
    });

    return {
      bookingsCount,
      totalValue: totalValue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalDue: totalDue.toFixed(2),
      cashReceived: cashReceived.toFixed(2),
    };
  }, [rangeOrders, orders, startDate, endDate]);

  // Daily Table Rows: Resembles the old Daily Summary sheet (Section 2.5 & 6.11)
  const dailyRows = React.useMemo(() => {
    const map = new Map<string, DayRowSummary>();

    // Seed days with orders
    rangeOrders.forEach((order) => {
      const dObj = new Date(order.created_at);
      const dateKey = dObj.toISOString().split("T")[0];
      const displayDate = formatCalendarPair(dObj).gregorian;

      let row = map.get(dateKey);
      if (!row) {
        row = {
          dateKey,
          displayDate,
          bookingsCount: 0,
          qty3x4: 0,
          qty10x15: 0,
          qty30x45: 0,
          qty13x18: 0,
          qty20x25: 0,
          qtyOther: 0,
          grossValue: new Decimal(0),
          paidAmount: new Decimal(0),
          dueAmount: new Decimal(0),
          cashReceived: new Decimal(0),
        };
        map.set(dateKey, row);
      }

      row.bookingsCount += 1;
      const val = new Decimal(order.total_amount || 0);
      const pd = new Decimal(order.paid_amount || 0);
      const bal = new Decimal(order.balance_amount || 0);

      row.grossValue = row.grossValue.plus(val);
      row.paidAmount = row.paidAmount.plus(pd);
      if (bal.greaterThan(0)) {
        row.dueAmount = row.dueAmount.plus(bal);
      }

      // Quantity per photo type
      (order.items || []).forEach((item) => {
        const name = (item.photo_type_name || "").toLowerCase().replace(/×/g, "x");
        const qty = Number(item.quantity) || 0;
        if (name.includes("3x4")) row!.qty3x4 += qty;
        else if (name.includes("10x15")) row!.qty10x15 += qty;
        else if (name.includes("30x45")) row!.qty30x45 += qty;
        else if (name.includes("13x18")) row!.qty13x18 += qty;
        else if (name.includes("20x25")) row!.qty20x25 += qty;
        else row!.qtyOther += qty;
      });
    });

    // Also associate cash received for each date
    orders.forEach((o) => {
      if (o.status === "voided") return;
      (o.payments || []).forEach((p) => {
        if (p.payment_method === "cash") {
          const pDate = new Date(p.created_at);
          if (pDate >= startDate && pDate <= endDate) {
            const dateKey = pDate.toISOString().split("T")[0];
            const row = map.get(dateKey);
            if (row) {
              row.cashReceived = row.cashReceived.plus(new Decimal(p.amount || 0));
            }
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [rangeOrders, orders, startDate, endDate]);

  // Grand totals for the Daily Summary table
  const dailyTotals = React.useMemo(() => {
    let bookings = 0;
    let q3x4 = 0;
    let q10x15 = 0;
    let q30x45 = 0;
    let q13x18 = 0;
    let q20x25 = 0;
    let qOther = 0;
    let paid = new Decimal(0);
    let due = new Decimal(0);
    let cash = new Decimal(0);

    dailyRows.forEach((r) => {
      bookings += r.bookingsCount;
      q3x4 += r.qty3x4;
      q10x15 += r.qty10x15;
      q30x45 += r.qty30x45;
      q13x18 += r.qty13x18;
      q20x25 += r.qty20x25;
      qOther += r.qtyOther;
      paid = paid.plus(r.paidAmount);
      due = due.plus(r.dueAmount);
      cash = cash.plus(r.cashReceived);
    });

    return {
      bookings,
      q3x4,
      q10x15,
      q30x45,
      q13x18,
      q20x25,
      qOther,
      paid: paid.toFixed(2),
      due: due.toFixed(2),
      cash: cash.toFixed(2),
    };
  }, [dailyRows]);

  // Payment Methods Breakdown (FR-15 & 6.11)
  const paymentBreakdown = React.useMemo(() => {
    const totals: Record<string, Decimal> = {
      cash: new Decimal(0),
      telebirr: new Decimal(0),
      bank_transfer: new Decimal(0),
      cbe_birr: new Decimal(0),
    };

    orders.forEach((o) => {
      if (o.status === "voided") return;
      (o.payments || []).forEach((p) => {
        const pDate = new Date(p.created_at);
        if (pDate >= startDate && pDate <= endDate) {
          const method = (p.payment_method || "cash").toLowerCase();
          const amt = new Decimal(p.amount || 0);
          if (totals[method] !== undefined) {
            totals[method] = totals[method].plus(amt);
          } else {
            totals.cash = totals.cash.plus(amt);
          }
        }
      });
    });

    const grandTotal = Decimal.sum(
      totals.cash,
      totals.telebirr,
      totals.bank_transfer,
      totals.cbe_birr
    );

    return {
      cash: totals.cash.toFixed(2),
      telebirr: totals.telebirr.toFixed(2),
      bank_transfer: totals.bank_transfer.toFixed(2),
      cbe_birr: totals.cbe_birr.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      cashPct: grandTotal.greaterThan(0) ? totals.cash.dividedBy(grandTotal).times(100).toFixed(1) : "0",
      telebirrPct: grandTotal.greaterThan(0) ? totals.telebirr.dividedBy(grandTotal).times(100).toFixed(1) : "0",
      bankPct: grandTotal.greaterThan(0) ? totals.bank_transfer.dividedBy(grandTotal).times(100).toFixed(1) : "0",
      cbePct: grandTotal.greaterThan(0) ? totals.cbe_birr.dividedBy(grandTotal).times(100).toFixed(1) : "0",
    };
  }, [orders, startDate, endDate]);

  // Unpaid Balances List (FR-16 & 6.11)
  const unpaidOrdersList = React.useMemo(() => {
    return orders
      .filter((o) => o.status !== "voided" && Number(o.balance_amount || 0) > 0)
      .sort((a, b) => Number(b.balance_amount || 0) - Number(a.balance_amount || 0));
  }, [orders]);

  // Export to Excel / CSV whose layout resembles the old Daily Summary sheet (Section 2.5 & 6.11)
  const handleExportExcel = () => {
    if (dailyRows.length === 0) return;

    const lines: string[] = [];

    // Header resembling the old Daily Summary Sheet
    lines.push("ADDIS PHOTOGRAPHY STUDIO - DAILY SUMMARY REPORT");
    lines.push(`Report Range: ${rangeLabel}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");

    // Summary Metric Cards
    lines.push("EXECUTIVE SUMMARY");
    lines.push("Metric,Value");
    lines.push(`Total Bookings,${summaryMetrics.bookingsCount}`);
    lines.push(`Total Value (ETB),${summaryMetrics.totalValue}`);
    lines.push(`Total Paid (ETB),${summaryMetrics.totalPaid}`);
    lines.push(`Total Due (ETB),${summaryMetrics.totalDue}`);
    lines.push(`Cash Received in Period (ETB),${summaryMetrics.cashReceived}`);
    lines.push("");

    // Daily Summary Table (Exact columns from old Daily Summary sheet + Paid & Due)
    lines.push("DAILY SUMMARY TABLE");
    lines.push("Date,Bookings,3x4,10x15,30x45,13x18,20x25,Other,Paid (ETB),Due (ETB),Cash Received (ETB)");
    dailyRows.forEach((r) => {
      lines.push(
        [
          r.displayDate,
          r.bookingsCount,
          r.qty3x4,
          r.qty10x15,
          r.qty30x45,
          r.qty13x18,
          r.qty20x25,
          r.qtyOther,
          r.paidAmount.toFixed(2),
          r.dueAmount.toFixed(2),
          r.cashReceived.toFixed(2),
        ].join(",")
      );
    });

    // Daily Totals Row
    lines.push(
      [
        "TOTALS",
        dailyTotals.bookings,
        dailyTotals.q3x4,
        dailyTotals.q10x15,
        dailyTotals.q30x45,
        dailyTotals.q13x18,
        dailyTotals.q20x25,
        dailyTotals.qOther,
        dailyTotals.paid,
        dailyTotals.due,
        dailyTotals.cash,
      ].join(",")
    );
    lines.push("");

    // By Payment Method Breakdown
    lines.push("PAYMENT METHODS BREAKDOWN");
    lines.push("Method,Amount Collected (ETB),Percentage");
    lines.push(`Cash,${paymentBreakdown.cash},${paymentBreakdown.cashPct}%`);
    lines.push(`Telebirr,${paymentBreakdown.telebirr},${paymentBreakdown.telebirrPct}%`);
    lines.push(`Bank Transfer,${paymentBreakdown.bank_transfer},${paymentBreakdown.bankPct}%`);
    lines.push(`CBE Birr,${paymentBreakdown.cbe_birr},${paymentBreakdown.cbePct}%`);
    lines.push(`Total Collected,${paymentBreakdown.grandTotal},100%`);
    lines.push("");

    // Unpaid Balances List
    lines.push("OUTSTANDING UNPAID BALANCES LIST");
    lines.push("Booking Ref,Order Date,Customer Name,Phone,Total Amount (ETB),Paid (ETB),Balance Due (ETB)");
    unpaidOrdersList.forEach((u) => {
      lines.push(
        [
          `"${u.order_number || u.id}"`,
          formatDate(new Date(u.created_at)),
          `"${(u.customer?.name || "Customer").replace(/"/g, '""')}"`,
          `"${u.customer?.phone || ""}"`,
          u.total_amount,
          u.paid_amount,
          u.balance_amount,
        ].join(",")
      );
    });

    // Generate CSV Blob with UTF-8 BOM so Excel opens with correct character encoding
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Addis_Photography_Daily_Summary_${rangePreset}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // FR-17 & FR-18: Admin-Only Restriction Screen
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-[#e21b23]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
          Admin Access Required
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          According to studio specification FR-17 and FR-18, financial reports and revenue totals are restricted to Administrators only.
        </p>
        <Link href="/today">
          <Button className="mt-4 bg-[#e21b23] hover:bg-red-700 text-white font-bold rounded-xl px-5">
            Return to Today Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. TOP HEADER & DATE RANGE CONTROLS (SPECIFICATION 6.11) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            Financial Ledger & Analytics
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Daily breakdown, service quantities, payment reconciliation, and unpaid balances.
          </p>
        </div>

        {/* Date Range Picker (Today, Week, Month, Custom) + Export to Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Presets Segmented Bar */}
          <div className="flex items-center rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setRangePreset("today")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                rangePreset === "today"
                  ? "bg-[#e21b23] text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRangePreset("week")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                rangePreset === "week"
                  ? "bg-[#e21b23] text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setRangePreset("month")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                rangePreset === "month"
                  ? "bg-[#e21b23] text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setRangePreset("custom")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                rangePreset === "custom"
                  ? "bg-[#e21b23] text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Inputs if Custom is selected */}
          {rangePreset === "custom" && (
            <div className="flex items-center gap-2 bg-white dark:bg-[#141417] p-1.5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-slate-800 dark:text-zinc-200 outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-slate-800 dark:text-zinc-200 outline-none"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            aria-label="Refresh reports"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs transition"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
          </button>

          {/* Export to Excel (resembles old Daily Summary sheet) */}
          <Button
            type="button"
            onClick={handleExportExcel}
            disabled={dailyRows.length === 0}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export to Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. FIVE SUMMARY CARDS (SPECIFICATION 6.11: Bookings, Value, Paid, Due, Cash received) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Bookings */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[135px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Bookings
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-mono mt-1">
            {summaryMetrics.bookingsCount}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500 truncate">
            {rangeOrders.length} orders in period
          </div>
        </div>

        {/* Card 2: Value */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[135px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Value
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-mono mt-1">
            ETB {Number(summaryMetrics.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500 truncate">
            Gross booking amount
          </div>
        </div>

        {/* Card 3: Paid */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[135px]">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Paid
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            ETB {Number(summaryMetrics.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500 truncate">
            Booking-date view collections
          </div>
        </div>

        {/* Card 4: Due */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[135px]">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Due
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400 font-mono mt-1">
            ETB {Number(summaryMetrics.totalDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500 truncate">
            Outstanding balance
          </div>
        </div>

        {/* Card 5: Cash received */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[135px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Cash received
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 font-mono mt-1">
            ETB {Number(summaryMetrics.cashReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-400 dark:text-zinc-500 truncate">
            Payment-date cash received
          </div>
        </div>
      </div>

      {/* 3. TABLE BY DAY WITH ALL PHOTO TYPES AS COLUMNS PLUS PAID & DUE (SECTION 6.11) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              Daily Summary Breakdown
            </h2>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              Replaces the old Excel Daily Summary sheet. Quantities for all 6 photo types, bookings, paid, and due.
            </p>
          </div>

          <span className="text-xs font-bold font-mono tracking-wider text-slate-400 dark:text-zinc-500 uppercase self-start sm:self-auto">
            {dailyRows.length} {dailyRows.length === 1 ? "RECORDED DAY" : "RECORDED DAYS"}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-[11px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Bookings</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">3×4</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">10×15</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">30×45</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">13×18</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">20×25</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Other</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Paid (ETB)</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Due (ETB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
              {dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-sans">
                    No orders recorded in the selected date range.
                  </td>
                </tr>
              ) : (
                dailyRows.map((row) => (
                  <tr
                    key={row.dateKey}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                      {row.displayDate}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-800 dark:text-zinc-200">
                      {row.bookingsCount}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qty3x4 > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qty3x4}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qty10x15 > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qty10x15}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qty30x45 > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qty30x45}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qty13x18 > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qty13x18}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qty20x25 > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qty20x25}
                    </td>
                    <td className={`py-3 px-3 text-center ${row.qtyOther > 0 ? "text-slate-900 dark:text-zinc-100 font-bold" : "text-slate-300 dark:text-zinc-600"}`}>
                      {row.qtyOther}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(row.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-3.5 text-right font-bold ${row.dueAmount.greaterThan(0) ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                      {Number(row.dueAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Row */}
            {dailyRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-900/80 font-mono font-extrabold text-xs">
                <tr>
                  <td className="py-3.5 px-3.5 text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    TOTALS
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-slate-900 dark:text-zinc-100">
                    {dailyTotals.bookings}
                  </td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.q3x4}</td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.q10x15}</td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.q30x45}</td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.q13x18}</td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.q20x25}</td>
                  <td className="py-3.5 px-3 text-center">{dailyTotals.qOther}</td>
                  <td className="py-3.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400">
                    {Number(dailyTotals.paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-red-600 dark:text-red-400">
                    {Number(dailyTotals.due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. TWO COLUMN SECTION: "BY PAYMENT METHOD" BREAKDOWN + UNPAID BALANCES LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (5 cols): "BY PAYMENT METHOD" BREAKDOWN */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                By Payment Method
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                Collections recorded in selected period
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Collected
              </span>
              <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                ETB {Number(paymentBreakdown.grandTotal).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Cash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e21b23]" />
                  Physical Cash
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                  ETB {Number(paymentBreakdown.cash).toLocaleString()} ({paymentBreakdown.cashPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-[#e21b23] rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.cashPct}%` }}
                />
              </div>
            </div>

            {/* Telebirr */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Telebirr
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                  ETB {Number(paymentBreakdown.telebirr).toLocaleString()} ({paymentBreakdown.telebirrPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.telebirrPct}%` }}
                />
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                  Bank Transfer
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                  ETB {Number(paymentBreakdown.bank_transfer).toLocaleString()} ({paymentBreakdown.bankPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.bankPct}%` }}
                />
              </div>
            </div>

            {/* CBE Birr */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  CBE Birr
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                  ETB {Number(paymentBreakdown.cbe_birr).toLocaleString()} ({paymentBreakdown.cbePct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.cbePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): UNPAID BALANCES LIST (FR-16 & 6.11) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Unpaid Balances List
                </h3>
                <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                  {unpaidOrdersList.length} PENDING
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                All outstanding customer balances across studio bookings
              </p>
            </div>

            <Link
              href="/customers"
              className="text-xs font-bold text-[#e21b23] hover:underline"
            >
              View Customers
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-[11px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
                <tr>
                  <th className="py-3 px-3.5">Booking</th>
                  <th className="py-3 px-3.5">Customer</th>
                  <th className="py-3 px-3.5">Phone</th>
                  <th className="py-3 px-3.5 text-right">Total</th>
                  <th className="py-3 px-3.5 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {unpaidOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                      All studio bookings are fully settled! Zero unpaid balances.
                    </td>
                  </tr>
                ) : (
                  unpaidOrdersList.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="hover:text-[#e21b23]">
                          {order.order_number || `#${order.id.slice(0, 6)}`}
                        </Link>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="hover:text-[#e21b23]">
                          {order.customer?.name || "Customer"}
                        </Link>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {order.customer?.phone || "—"}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                        {Number(order.total_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 font-bold text-red-600 dark:text-red-400">
                          <span>{Number(order.balance_amount).toLocaleString()}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:border-red-500 hover:text-red-600 text-[11px] font-bold text-slate-700 dark:text-zinc-300 transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
