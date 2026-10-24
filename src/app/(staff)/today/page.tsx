"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  RefreshCcw,
  ArrowRight,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import {
  formatCalendarPair,
  formatDate,
  isTodayInAddis,
  isSameDayInAddis,
  isOverdue,
} from "@/lib/date";
import { formatETB } from "@/lib/money";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
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

  // Specification 6.4 Filters: [Photo type ▾] [Payment ▾] [Status ▾] [☐ Unpaid only] [Search...]
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

  // Dashboard Metrics for chosen studio day D (Specification 3.7 & Section 6.4)
  // Bookings, Paid, Due (Admin only: Paid and Due)
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

  // Unpaid count for the filter badge
  const unpaidCount = React.useMemo(() => {
    return dayOrders.filter((o) => o.status !== "voided" && Number(o.balance_amount || 0) > 0).length;
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

    const headers = ["Booking #", "Customer", "Phone", "Items", "Total (ETB)", "Paid (ETB)", "Balance (ETB)", "Status", "Date"];
    const rows = filteredOrders.map((o) => {
      const itemsStr = (o.items || []).map((it) => `${it.photo_type_name} x${it.quantity}`).join("; ");
      return [
        `"${o.order_number || o.id}"`,
        `"${o.customer?.name || ""}"`,
        `"${o.customer?.phone || ""}"`,
        `"${itemsStr}"`,
        o.total_amount,
        o.paid_amount,
        o.balance_amount,
        o.status,
        new Date(o.created_at).toISOString(),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `addis-bookings-${selectedCalendar?.gregorian ? selectedCalendar.gregorian.replace(/\//g, "-") : "today"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredOrders, selectedCalendar]);

  const renderStatusBadge = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case "ready":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Ready
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            In prog
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
            Delivered
          </span>
        );
      case "voided":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 line-through">
            Voided
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            New
          </span>
        );
    }
  };

  const userName = user?.name || "Team";

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-8">
      {/* 1. TOP GREETING & DATE SELECTION ROW (SECTION 6.4 + LAPTOP SCALING) */}
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

        {/* Date Selector: Date: [ 12/08/2026 ▾ ] [Today] */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] px-4 py-2.5 shadow-xs">
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Date
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

      {/* 2. THREE SUMMARY METRIC CARDS (SECTION 6.4: BOOKINGS | PAID | DUE) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Bookings */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Bookings</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {metrics.count} total
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2">
            {metrics.count}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">
              {isTodaySelected ? "Orders booked today" : `Orders on ${selectedCalendar?.gregorian}`}
            </span>
            <div className="flex items-end gap-1 h-4 shrink-0 opacity-80">
              <span className="w-1.5 h-2 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-3 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-4 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-3.5 rounded-t bg-red-300 dark:bg-red-900/60" />
              <span className="w-1.5 h-5 rounded-t bg-[#e21b23]" />
            </div>
          </div>
        </div>

        {/* Card 2: Paid (Admin Only per Specification 6.4) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Paid</span>
            {!isAdmin ? (
              <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">(Admin only)</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Collected
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 mt-2 font-mono">
            {isAdmin ? `ETB ${Number(metrics.collected).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              {isAdmin ? "Total payments recorded" : "Restricted financial metric"}
            </span>
            <div className="flex items-end gap-1 h-4 shrink-0 opacity-80">
              <span className="w-1.5 h-2.5 rounded-t bg-emerald-100 dark:bg-zinc-800" />
              <span className="w-1.5 h-3.5 rounded-t bg-emerald-200 dark:bg-emerald-950/60" />
              <span className="w-1.5 h-3 rounded-t bg-emerald-300 dark:bg-emerald-900/60" />
              <span className="w-1.5 h-4.5 rounded-t bg-emerald-400 dark:bg-emerald-800/80" />
              <span className="w-1.5 h-5 rounded-t bg-emerald-600" />
            </div>
          </div>
        </div>

        {/* Card 3: Due (Admin Only per Specification 6.4) */}
        <div
          onClick={() => setUnpaidOnly((prev) => !prev)}
          className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between min-h-[140px] cursor-pointer transition-all ${
            unpaidOnly
              ? "border-[#e21b23] bg-red-50/30 dark:bg-red-950/20 ring-2 ring-red-500/20"
              : "border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Due</span>
            {!isAdmin ? (
              <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">(Admin only)</span>
            ) : unpaidCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                {unpaidCount} unpaid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                All cleared
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#e21b23] dark:text-red-500 mt-2 font-mono">
            {isAdmin ? `ETB ${Number(metrics.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              {unpaidOnly ? "Showing unpaid only (click to reset)" : "Click to filter unpaid orders"}
            </span>
            <div className="flex items-end gap-1 h-4 shrink-0 opacity-80">
              <span className="w-1.5 h-4.5 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-3.5 rounded-t bg-red-200 dark:bg-red-950/60" />
              <span className="w-1.5 h-2.5 rounded-t bg-slate-200 dark:bg-zinc-800" />
              <span className="w-1.5 h-3 rounded-t bg-red-300 dark:bg-red-900/60" />
              <span className="w-1.5 h-5 rounded-t bg-[#e21b23]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S BOOKINGS & FILTER SECTION (EXACT SPECIFICATION 6.4) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#141417] p-5 shadow-xs space-y-4">
        {/* Header Strip with Title & Export */}
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
            className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Filters Row: Filters: [Photo type ▾] [Payment ▾] [Status ▾] [☐ Unpaid only] [Search...] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 pr-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* [Photo type ▾] */}
          <div className="w-[140px] sm:w-[150px]">
            <select
              aria-label="Filter by photo type"
              value={photoTypeFilter}
              onChange={(e) => setPhotoTypeFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
            >
              <option value="all">Photo type</option>
              <option value="3x4">3×4</option>
              <option value="10x15">10×15</option>
              <option value="30x45">30×45</option>
              <option value="13x18">13×18</option>
              <option value="20x25">20×25</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* [Payment ▾] */}
          <div className="w-[130px] sm:w-[140px]">
            <select
              aria-label="Filter by payment method"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
            >
              <option value="all">Payment</option>
              <option value="cash">Cash</option>
              <option value="telebirr">Telebirr</option>
              <option value="cbe_birr">CBE Birr</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* [Status ▾] */}
          <div className="w-[130px] sm:w-[140px]">
            <select
              aria-label="Filter by order status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500 transition shadow-2xs cursor-pointer"
            >
              <option value="all">Status</option>
              <option value="new">New</option>
              <option value="in_progress">In prog</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          {/* [☐ Unpaid only] (Section 6.4 Outstanding Balance Filter) */}
          <label className={`flex items-center gap-2 cursor-pointer select-none rounded-xl border px-3 h-10 text-xs font-bold transition shadow-2xs ${
            unpaidOnly
              ? "border-[#e21b23] bg-red-50/50 dark:bg-red-950/30 text-[#e21b23] dark:text-red-400"
              : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
          }`}>
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-zinc-600 text-red-600 focus:ring-red-500 accent-red-600"
            />
            <span>Unpaid only</span>
            {unpaidCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                unpaidOnly
                  ? "bg-red-600 text-white"
                  : "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"
              }`}>
                {unpaidCount}
              </span>
            )}
          </label>

          {/* [Search...] */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-900/60 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 transition shadow-2xs"
            />
          </div>
        </div>

        {/* 4. BOOKINGS TABLE (MATCHES SPECIFICATION 6.4: # | Customer | Phone | Items | Total | Paid | Balance | Status) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-[11px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
              <tr>
                <th className="py-3 px-3.5 w-16">#</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5">Phone</th>
                <th className="py-3 px-3.5">Items</th>
                <th className="py-3 px-3.5 text-right">Total</th>
                <th className="py-3 px-3.5 text-right">Paid</th>
                <th className="py-3 px-3.5 text-right">Balance</th>
                <th className="py-3 px-3.5 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    {unpaidOnly
                      ? "No unpaid bookings found for this day."
                      : "No orders match your filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const hasDue = Number(order.balance_amount || 0) > 0;
                  const itemsSummary = (order.items || [])
                    .map((it) => `${it.photo_type_name || "Photo"} ×${it.quantity}`)
                    .join(", ");

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                    >
                      {/* # (Row Number / Order Number) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="block">
                          <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#e21b23]">
                            {idx + 1}
                          </span>
                          <span className="block text-[10px] font-mono text-slate-400">
                            {order.order_number || `#${order.id.slice(0, 6)}`}
                          </span>
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="hover:text-[#e21b23] block">
                          {order.customer?.name || "Customer"}
                        </Link>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3.5 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="block">
                          {order.customer?.phone || "—"}
                        </Link>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-3.5 text-slate-600 dark:text-zinc-300 max-w-[200px] truncate">
                        <Link href={`/orders/${order.id}`} className="block truncate" title={itemsSummary}>
                          {itemsSummary || "—"}
                        </Link>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="block">
                          {isAdmin ? Number(order.total_amount).toLocaleString() : "••••"}
                        </Link>
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="block">
                          {isAdmin ? Number(order.paid_amount || 0).toLocaleString() : "••••"}
                        </Link>
                      </td>

                      {/* Balance (Specification 6.4: shows red dot 🔴 if balance > 0) */}
                      <td className="py-3.5 px-3.5 text-right font-mono whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-end gap-1.5 w-full">
                          {isAdmin ? (
                            <>
                              <span className={`font-bold ${hasDue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-zinc-400"}`}>
                                {Number(order.balance_amount || 0).toLocaleString()}
                              </span>
                              {hasDue && (
                                <span
                                  className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse shrink-0"
                                  title={`Pending balance: ETB ${Number(order.balance_amount).toLocaleString()}`}
                                />
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">••••</span>
                          )}
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="block">
                          {renderStatusBadge(order.status)}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BOTTOM STATUS BAR (EXACT SPECIFICATION 6.4: Open requests (2) · Overdue (1)) */}
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
