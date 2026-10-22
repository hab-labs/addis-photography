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
import { DualCalendarPicker } from "@/components/calendar/DualCalendarPicker";

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
    return selectedDate;
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
        return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Ready</span>;
      case "in_progress":
        return <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">In prog</span>;
      case "delivered":
        return <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Delivered</span>;
      case "voided":
        return <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 line-through">Voided</span>;
      default:
        return <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">New</span>;
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] space-y-4">
      {/* HEADER SECTION: Specification 6.4 */}
      {/* Date: [ 12/08/2026 ▾ ] [Today] */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 relative">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Date:</span>

          {/* Date Selector [ 12/08/2026 ▾ ] */}
          <div className="relative">
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => isAdmin && setIsCalendarOpen((prev) => !prev)}
              aria-label="Select Studio Date"
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
                !isAdmin
                  ? "border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-default"
                  : isCalendarOpen
                  ? "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-500/30"
                  : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              <span>{selectedCalendar?.gregorian || formatDate(new Date())}</span>
              {isAdmin && <ChevronDown className="h-3 w-3 text-slate-400" />}
            </button>

            {/* Date Picker Popover (Admin Only) */}
            {isCalendarOpen && isAdmin && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                <div className="absolute left-0 top-10 z-50 animate-in fade-in zoom-in-95 duration-100">
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
          </div>

          {/* [Today] Button */}
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
              isTodaySelected
                ? "border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            Today
          </button>

          {!isAdmin && (
            <span className="text-[10px] text-slate-400 italic">
              (Staff view locked to today)
            </span>
          )}

          {isAdmin && selectedCalendar && !isTodaySelected && (
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 ml-1">
              • Historical/Future Date: {selectedEthDetails?.textAm} EC
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="h-8 text-xs font-semibold border-slate-300 dark:border-zinc-700 dark:bg-[#18181b] dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Export CSV
          </Button>
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            aria-label="Refresh orders"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-red-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* THREE SUMMARY CARDS: Specification 6.4 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Bookings */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Bookings</span>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {metrics.count}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500">
            {isTodaySelected ? "Orders created today" : `Orders on ${selectedCalendar?.gregorian}`}
          </span>
        </div>

        {/* Card 2: Paid (Admin Only) */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Paid</span>
            {!isAdmin && <span className="text-[9px] text-slate-400">Admin only</span>}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
            {isAdmin ? `ETB ${metrics.collected}` : "ETB ••••••"}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500">Excel booking-date collections</span>
        </div>

        {/* Card 3: Due (Admin Only) */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Due</span>
            {!isAdmin && <span className="text-[9px] text-slate-400">Admin only</span>}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-[#e21b23] dark:text-red-400">
            {isAdmin ? `ETB ${metrics.balance}` : "ETB ••••••"}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500">Remaining balance on bookings</span>
        </div>

        {/* Card 4: Cash Received */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Cash Received</span>
            {!isAdmin && <span className="text-[9px] text-slate-400">Admin only</span>}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {isAdmin ? `ETB ${cashReceivedToday}` : "ETB ••••••"}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500">Cash payments on date</span>
        </div>
      </div>

      {/* QUANTITY BY PHOTO TYPE BAR: Specification 3.7 & FR-15 */}
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] px-4 py-2.5 shadow-xs overflow-x-auto text-xs">
        <span className="font-bold text-slate-700 dark:text-zinc-300 shrink-0 mr-4 text-[11px]">
          Quantities:
        </span>
        {Object.entries(quantityTotals).map(([label, qty], idx) => (
          <div key={label} className={`flex items-center gap-1 px-3 ${idx > 0 ? "border-l border-slate-200 dark:border-zinc-800" : ""}`}>
            <span className="text-slate-500 dark:text-zinc-400 font-medium">{label} =</span>
            <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">{qty}</span>
          </div>
        ))}
      </div>

      {/* FILTERS BAR: Specification 6.4 */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] p-2.5 shadow-xs text-xs">
        {/* Photo type filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Photo:</span>
          <select
            value={photoTypeFilter}
            onChange={(e) => setPhotoTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/80 px-2 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500"
          >
            <option value="all">All Sizes</option>
            <option value="3x4">3x4</option>
            <option value="10x15">10x15</option>
            <option value="30x45">30x45</option>
            <option value="13x18">13x18</option>
            <option value="20x25">20x25</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Payment filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Payment:</span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/80 px-2 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/80 px-2 text-xs text-slate-700 dark:text-zinc-200 outline-none focus:border-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        {/* [☐ Unpaid only] Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-zinc-300 select-none pl-1">
          <input
            type="checkbox"
            checked={unpaidOnly}
            onChange={(e) => setUnpaidOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-red-600 focus:ring-red-500"
          />
          <span>Unpaid only</span>
        </label>

        {/* [Search…] Input */}
        <div className="relative ml-auto flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, phone, booking #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pl-8 pr-3 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* MAIN ORDERS TABLE: Specification 6.4 */}
      <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/60 font-bold uppercase text-[10px] text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No orders found for this date and filter selection.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const hasDue = Number(order.balance_amount || 0) > 0;
                  const itemsSummary = (order.items || [])
                    .map((it) => `${it.photo_type_name} ×${it.quantity}`)
                    .join(", ");

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      {/* # sequential index */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-zinc-400">
                        {idx + 1}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-red-600 transition">
                        <Link href={`/orders/${order.id}`}>
                          {order.customer?.name || "Walk-In"}
                        </Link>
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-400 text-[11px]">
                        {order.customer?.phone || "-"}
                      </td>

                      {/* Items */}
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300 max-w-xs truncate" title={itemsSummary}>
                        {itemsSummary || "Studio Photography"}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-zinc-100">
                        {formatETB(order.total_amount)}
                      </td>

                      {/* Paid */}
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {formatETB(order.paid_amount)}
                      </td>

                      {/* Balance */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <span className={hasDue ? "text-[#e21b23] dark:text-red-400" : "text-slate-400 dark:text-zinc-500"}>
                            {formatETB(order.balance_amount)}
                          </span>
                          {hasDue && <span className="text-red-500 font-bold">🔴</span>}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderStatusBadge(order.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM STATUS BAR: Specification 6.4 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141417] px-4 py-2.5 text-xs shadow-xs">
        <Link
          href="/requests"
          className="flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition"
        >
          <span>Open requests ({requestsSummary.open})</span>
          <span className="text-slate-300 dark:text-zinc-700">·</span>
          <span className={requestsSummary.overdue > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 dark:text-zinc-400"}>
            Overdue ({requestsSummary.overdue})
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
        </Link>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
          Click to manage studio retouches & editing requests
        </span>
      </div>
    </div>
  );
}
