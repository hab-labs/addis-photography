"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Download,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import {
  formatCalendarPair,
  formatDate,
  isTodayInAddis,
  isSameDayInAddis,
  isOverdue,
  getEthiopianDateDetails,
} from "@/lib/date";
import { formatETB } from "@/lib/money";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DualCalendarPicker } from "@/components/calendar/DualCalendarPicker";

function formatDateHeader(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date).toUpperCase();
  } catch {
    return "TODAY'S OVERVIEW";
  }
}

export default function TodayLedgerPage() {
  const { isAdmin, user } = useAuth();

  // Specification 6.4 Filters
  const [search, setSearch] = React.useState("");
  const [photoTypeFilter, setPhotoTypeFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [unpaidOnly, setUnpaidOnly] = React.useState(false);

  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Request status counts for bottom bar (Section 6.4)
  const [requestsSummary, setRequestsSummary] = React.useState({ open: 0, overdue: 0 });

  const loadData = React.useCallback(() => {
    setIsRefreshing(true);
    if (typeof studioStore !== "undefined" && studioStore.getOrders) {
      setAllOrders(studioStore.getOrders());

      // Sync requests for the Section 6.4 bottom bar
      try {
        const reqs = studioStore.getRequests();
        const open = reqs.filter((r) => r.status !== "delivered").length;
        const overdue = reqs.filter((r) => r.status !== "delivered" && isOverdue(r.due_date)).length;
        setRequestsSummary({ open, overdue });
      } catch {}

      studioStore
        .syncOrders()
        .then((all) => {
          setAllOrders(all);
        })
        .catch(() => {})
        .finally(() => setIsRefreshing(false));
    } else {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Gregorian dd/mm/yyyy display (Specification 2.3 & 6.4)
  const selectedCalendar = React.useMemo(() => {
    return selectedDate ? formatCalendarPair(selectedDate) : null;
  }, [selectedDate]);

  const selectedEthDetails = React.useMemo(() => {
    return selectedDate ? getEthiopianDateDetails(selectedDate) : null;
  }, [selectedDate]);

  const isTodaySelected = React.useMemo(() => {
    return selectedDate ? isTodayInAddis(selectedDate) : false;
  }, [selectedDate]);

  // FR-18: Staff see today's orders only; Admin can view any date
  const effectiveDate = React.useMemo(() => {
    if (!isAdmin) return new Date(); // Lock staff to today
    return selectedDate || new Date();
  }, [isAdmin, selectedDate]);

  // Orders filtered by the studio day
  const dayOrders = React.useMemo(() => {
    if (!effectiveDate) return allOrders;
    return allOrders.filter((o) => isSameDayInAddis(o.created_at, effectiveDate));
  }, [allOrders, effectiveDate]);

  // Dashboard Metrics for chosen studio day D (Specification 3.7 & FR-15)
  const metrics = React.useMemo(() => {
    let gross = new Decimal(0);
    let collected = new Decimal(0);
    let balance = new Decimal(0);
    const nonVoided = dayOrders.filter((o) => o.status !== "voided");

    nonVoided.forEach((order) => {
      const orderTotal = new Decimal(order.total_amount || 0);
      const paid = new Decimal(order.paid_amount || 0);
      gross = gross.plus(orderTotal);
      collected = collected.plus(paid);
      const diff = orderTotal.minus(paid);
      if (diff.greaterThan(0)) {
        balance = balance.plus(diff);
      }
    });

    return {
      count: nonVoided.length,
      gross: gross.toFixed(2),
      collected: collected.toFixed(2),
      balance: balance.toFixed(2),
    };
  }, [dayOrders]);

  // Cash received today (Specification 3.7: payments whose payment date is D)
  const cashReceivedToday = React.useMemo(() => {
    let cash = new Decimal(0);
    const targetDate = effectiveDate || new Date();
    allOrders.forEach((o) => {
      if (o.status === "voided") return;
      (o.payments || []).forEach((p) => {
        if (p.payment_method === "cash" && isSameDayInAddis(p.created_at, targetDate)) {
          cash = cash.plus(new Decimal(p.amount || 0));
        }
      });
    });
    return cash.toFixed(2);
  }, [allOrders, effectiveDate]);

  // Payments breakdown by payment method for the donut card
  const paymentsByMethod = React.useMemo(() => {
    const breakdown = {
      cash: 0,
      telebirr: 0,
      bank_transfer: 0,
      cbe_birr: 0,
    };
    const targetDate = effectiveDate || new Date();
    allOrders.forEach((o) => {
      if (o.status === "voided") return;
      (o.payments || []).forEach((p) => {
        if (isSameDayInAddis(p.created_at, targetDate)) {
          const method = (p.payment_method || "cash").toLowerCase();
          const amt = Number(p.amount || 0);
          if (method in breakdown) {
            breakdown[method as keyof typeof breakdown] += amt;
          } else {
            breakdown.cash += amt;
          }
        }
      });
    });
    const grandTotal = breakdown.cash + breakdown.telebirr + breakdown.bank_transfer + breakdown.cbe_birr;
    return {
      ...breakdown,
      total: grandTotal,
    };
  }, [allOrders, effectiveDate]);

  // Top customers with outstanding balances
  const topDebtors = React.useMemo(() => {
    return allOrders
      .filter((o) => o.status !== "voided" && Number(o.balance_amount || 0) > 0)
      .sort((a, b) => Number(b.balance_amount || 0) - Number(a.balance_amount || 0))
      .slice(0, 5);
  }, [allOrders]);

  // Quantities per photo type for chosen day D (Specification 3.7 & FR-15)
  const quantityTotals = React.useMemo(() => {
    const totals: Record<string, number> = { "3x4": 0, "10x15": 0, "30x45": 0, "13x18": 0, "20x25": 0, Other: 0 };
    dayOrders.forEach((order) => {
      if (order.status === "voided") return;
      (order.items || []).forEach((item) => {
        const name = (item.photo_type_name || "").toLowerCase().replace(/×/g, "x");
        const foundKey = Object.keys(totals).find((k) => k !== "Other" && name.includes(k.toLowerCase()));
        if (foundKey) {
          totals[foundKey] += Number(item.quantity) || 0;
        } else {
          totals["Other"] += Number(item.quantity) || 0;
        }
      });
    });
    return totals;
  }, [dayOrders]);

  // Specification 6.4 Filtered Table List
  const filteredOrders = React.useMemo(() => {
    return dayOrders.filter((o) => {
      const customer = (o.customer?.name || "").toLowerCase();
      const phone = (o.customer?.phone || "").toLowerCase();
      const id = String(o.order_number || o.id || "").toLowerCase();
      const term = search.toLowerCase();
      const matchesSearch = !term || customer.includes(term) || phone.includes(term) || id.includes(term);

      const matchesPhotoType =
        photoTypeFilter === "all" ||
        (o.items || []).some((item) => {
          const name = (item.photo_type_name || "").toLowerCase().replace(/×/g, "x");
          if (photoTypeFilter === "other") {
            return !["3x4", "10x15", "30x45", "13x18", "20x25"].some((std) => name.includes(std));
          }
          return name.includes(photoTypeFilter.toLowerCase());
        });

      const matchesPayment =
        paymentFilter === "all" ||
        (o.payments || []).some((p) => p.payment_method === paymentFilter) ||
        (paymentFilter === "unpaid" && Number(o.paid_amount || 0) === 0);

      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesUnpaid = !unpaidOnly || Number(o.balance_amount || 0) > 0;

      return matchesSearch && matchesPhotoType && matchesPayment && matchesStatus && matchesUnpaid;
    });
  }, [dayOrders, search, photoTypeFilter, paymentFilter, statusFilter, unpaidOnly]);

  const handleExportCSV = React.useCallback(() => {
    if (filteredOrders.length === 0) return;
    const headers = ["#", "Booking Number", "Customer Name", "Phone", "Items", "Total (ETB)", "Paid (ETB)", "Balance (ETB)", "Status", "Date"];
    const rows = filteredOrders.map((o, idx) => [
      idx + 1,
      o.order_number || o.id,
      `"${(o.customer?.name || "Walk-In").replace(/"/g, '""')}"`,
      `"${o.customer?.phone || ""}"`,
      `"${(o.items?.map((i) => `${i.photo_type_name} ×${i.quantity}`).join("; ") || "Studio Photography").replace(/"/g, '""')}"`,
      o.total_amount,
      o.paid_amount,
      o.balance_amount,
      o.status,
      o.created_at,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `addis-bookings-${selectedCalendar?.gregorian.replace(/\//g, "-") || "today"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredOrders, selectedCalendar]);

  const renderStatusBadge = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case "ready":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Ready</span>;
      case "in_progress":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">In prog</span>;
      case "delivered":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">Delivered</span>;
      case "voided":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 line-through">Voided</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">New</span>;
    }
  };

  const userName = user?.name || "Team";

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. TOP GREETING & DATE SELECTION ROW (MATCHES MACBOOK MOCKUP) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e21b23] dark:text-red-400 font-mono">
            {formatDateHeader(effectiveDate)}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Good morning, {userName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Here's what's happening at your studio today.
          </p>
        </div>

        {/* Date Selector Pill Card */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] px-4 py-2.5 shadow-xs">
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Reporting date
              </span>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => isAdmin && setIsCalendarOpen((prev) => !prev)}
                className="flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 hover:text-[#e21b23] transition-colors"
              >
                <span>{selectedCalendar?.gregorian || formatDate(new Date())}</span>
                {isAdmin && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            </div>

            {/* Date Picker Popover (Admin Only) */}
            {isCalendarOpen && isAdmin && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                <div className="absolute right-0 top-14 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-2xl">
                  <DualCalendarPicker
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d || new Date());
                      setIsCalendarOpen(false);
                    }}
                    orders={allOrders}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isTodaySelected
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                  : "bg-white dark:bg-[#18181b] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-[#e21b23] hover:text-[#e21b23]"
              }`}
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            aria-label="Refresh orders"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs transition"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. FOUR SUMMARY METRIC CARDS (MATCHES LAPTOP VIEW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Bookings */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Bookings</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              +8.4%
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">
            {metrics.count}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate max-w-[150px]">
              {isTodaySelected ? "Orders created on today" : `Orders on ${selectedCalendar?.gregorian}`}
            </span>
            {/* Sparkline Visual */}
            <div className="flex items-end gap-1 h-5 shrink-0 opacity-80">
              <span className="w-1.5 h-2 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-3 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-4 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-3.5 rounded-t bg-red-300 dark:bg-red-900/60" />
              <span className="w-1.5 h-5 rounded-t bg-[#e21b23]" />
            </div>
          </div>
        </div>

        {/* Card 2: Paid (Admin Only) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Paid</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              +12.0%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">
            {isAdmin ? `ETB ${Number(metrics.collected).toLocaleString()}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              Payments received on date
            </span>
            <div className="flex items-end gap-1 h-5 shrink-0 opacity-80">
              <span className="w-1.5 h-2.5 rounded-t bg-emerald-100 dark:bg-zinc-800" />
              <span className="w-1.5 h-3.5 rounded-t bg-emerald-200 dark:bg-emerald-950/60" />
              <span className="w-1.5 h-3 rounded-t bg-emerald-300 dark:bg-emerald-900/60" />
              <span className="w-1.5 h-4.5 rounded-t bg-emerald-400 dark:bg-emerald-800/80" />
              <span className="w-1.5 h-5 rounded-t bg-emerald-600" />
            </div>
          </div>
        </div>

        {/* Card 3: Due (Admin Only) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Due</span>
            {!isAdmin && <span className="text-xs text-slate-400">Admin only</span>}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#e21b23] dark:text-red-500 mt-2">
            {isAdmin ? `ETB ${Number(metrics.balance).toLocaleString()}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              Balance on today's bookings
            </span>
            <div className="flex items-end gap-1 h-5 shrink-0 opacity-80">
              <span className="w-1.5 h-4.5 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-3.5 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-2.5 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-3 rounded-t bg-red-300 dark:bg-red-900/60" />
              <span className="w-1.5 h-5 rounded-t bg-[#e21b23]" />
            </div>
          </div>
        </div>

        {/* Card 4: Cash Received */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Cash received today</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              +5.2%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">
            {isAdmin ? `ETB ${Number(cashReceivedToday).toLocaleString()}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              Valid cash payments today
            </span>
            <div className="flex items-end gap-1 h-5 shrink-0 opacity-80">
              <span className="w-1.5 h-2 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-3.5 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-3 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-4.5 rounded-t bg-red-300 dark:bg-red-900/60" />
              <span className="w-1.5 h-5 rounded-t bg-[#e21b23]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. PHOTO QUANTITIES STRIP (MATCHES LAPTOP VIEW) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="shrink-0 pr-4 lg:border-r border-slate-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Photo quantities</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Items booked today</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 flex-1">
          {Object.entries(quantityTotals).map(([label, qty], idx) => (
            <div
              key={label}
              className={`flex items-baseline gap-1.5 px-3 ${
                idx > 0 ? "sm:border-l border-slate-200 dark:border-zinc-800" : ""
              }`}
            >
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-zinc-100">
                {qty}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MAIN 2-COLUMN SECTION (70% TABLE / 30% CHARTS & BALANCES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: TODAY'S BOOKINGS TABLE (8 COLUMNS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
            {/* Table Header: Title & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                  Today's bookings
                </h2>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  {filteredOrders.length} of {dayOrders.length} bookings shown
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredOrders.length === 0}
                className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 gap-1.5 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </Button>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Search input */}
              <div className="sm:col-span-5 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Name, phone, or reference"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/60 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 transition"
                />
              </div>

              {/* Photo size filter */}
              <div className="sm:col-span-3">
                <select
                  value={photoTypeFilter}
                  onChange={(e) => setPhotoTypeFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition"
                >
                  <option value="all">All photo types</option>
                  <option value="3x4">3x4</option>
                  <option value="10x15">10x15</option>
                  <option value="30x45">30x45</option>
                  <option value="13x18">13x18</option>
                  <option value="20x25">20x25</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment filter */}
              <div className="sm:col-span-2">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-medium text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition"
                >
                  <option value="all">All payments</option>
                  <option value="cash">Cash</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="sm:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-medium text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition"
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-3.5">BOOKING</th>
                    <th className="py-3 px-3.5">CUSTOMER</th>
                    <th className="py-3 px-3.5">ITEMS</th>
                    <th className="py-3 px-3.5 text-right">TOTAL</th>
                    <th className="py-3 px-3.5 text-right">PAID</th>
                    <th className="py-3 px-3.5 text-right">BALANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No orders match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const hasDue = Number(order.balance_amount || 0) > 0;
                      const itemsSummary = (order.items || [])
                        .map((it) => `${it.photo_type_name} ×${it.quantity}`)
                        .join(", ");

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          {/* BOOKING */}
                          <td className="py-3.5 px-3.5 font-mono font-bold text-slate-800 dark:text-zinc-200">
                            <Link href={`/orders/${order.id}`} className="group-hover:text-[#e21b23] transition-colors">
                              {order.order_number || order.id}
                            </Link>
                          </td>

                          {/* CUSTOMER */}
                          <td className="py-3.5 px-3.5">
                            <Link href={`/orders/${order.id}`} className="block">
                              <span className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#e21b23] transition-colors">
                                {order.customer?.name || "Walk-In"}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                                {order.customer?.phone || "-"}
                              </span>
                            </Link>
                          </td>

                          {/* ITEMS */}
                          <td className="py-3.5 px-3.5 text-slate-600 dark:text-zinc-300 max-w-xs truncate" title={itemsSummary}>
                            {itemsSummary || "Studio Photography"}
                          </td>

                          {/* TOTAL */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-medium text-slate-900 dark:text-zinc-100">
                            {formatETB(order.total_amount)}
                          </td>

                          {/* PAID */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-medium text-slate-900 dark:text-zinc-100">
                            {formatETB(order.paid_amount)}
                          </td>

                          {/* BALANCE */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-bold">
                            <span className={hasDue ? "text-[#e21b23] dark:text-red-500" : "text-slate-500 dark:text-zinc-400"}>
                              {formatETB(order.balance_amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PAYMENTS BY METHOD & OUTSTANDING BALANCES (4 COLUMNS) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Payments by method with Donut Chart */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Payments by method
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  Valid payments · {selectedCalendar?.gregorian || "Today"}
                </p>
              </div>
            </div>

            {/* Donut Chart & Legend Visual */}
            <div className="flex items-center gap-5 pt-2">
              {/* Circular SVG Donut */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    className="stroke-slate-100 dark:stroke-zinc-800"
                    strokeWidth="4"
                  />
                  {/* Telebirr segment */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#e21b23"
                    strokeWidth="4"
                    strokeDasharray="60 100"
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                  {/* Cash segment */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="25 100"
                    strokeDashoffset="-60"
                    className="transition-all duration-500"
                  />
                  {/* Bank transfer segment */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="4"
                    strokeDasharray="15 100"
                    strokeDashoffset="-85"
                    className="transition-all duration-500"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black text-slate-900 dark:text-zinc-100 leading-none">
                    {isAdmin
                      ? Number(metrics.collected) > 1000
                        ? `${(Number(metrics.collected) / 1000).toFixed(1)}K`
                        : Number(metrics.collected).toFixed(0)
                      : "••••"}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase mt-0.5">
                    Total ETB
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#e21b23]" />
                    Cash
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {isAdmin ? Number(paymentsByMethod.cash).toLocaleString() : "••••"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Telebirr
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {isAdmin ? Number(paymentsByMethod.telebirr).toLocaleString() : "••••"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    Bank transfer
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {isAdmin ? Number(paymentsByMethod.bank_transfer).toLocaleString() : "••••"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    CBE Birr
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {isAdmin ? Number(paymentsByMethod.cbe_birr).toLocaleString() : "••••"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Outstanding balances */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Outstanding balances
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  Top customers with pending balance
                </p>
              </div>

              <Link
                href="/customers"
                className="text-xs font-bold text-[#e21b23] hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {topDebtors.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 py-3 text-center">
                  All customer accounts are fully paid.
                </p>
              ) : (
                topDebtors.map((order) => {
                  const initials = (order.customer?.name || "Customer")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-red-50 dark:bg-red-950/60 text-[11px] font-bold text-[#e21b23] dark:text-red-400">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 truncate">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-bold text-xs text-slate-900 dark:text-zinc-100 hover:text-[#e21b23] truncate block"
                          >
                            {order.customer?.name || "Customer"}
                          </Link>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            {order.order_number || order.id}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-[#e21b23] dark:text-red-500 shrink-0">
                        {formatETB(order.balance_amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM STATUS BAR: Open & Overdue Requests */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] px-5 py-3 text-xs shadow-xs">
        <Link
          href="/requests"
          className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#e21b23] dark:hover:text-red-400 transition"
        >
          <span>Open requests ({requestsSummary.open})</span>
          <span className="text-slate-300 dark:text-zinc-700">·</span>
          <span className={requestsSummary.overdue > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 dark:text-zinc-400"}>
            Overdue ({requestsSummary.overdue})
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>
        <span className="text-[11px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
          Click to manage studio retouches & editing requests
        </span>
      </div>
    </div>
  );
}
