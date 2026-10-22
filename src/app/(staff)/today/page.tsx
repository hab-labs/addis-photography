"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Calendar as CalendarIcon,
  Search,
  Users,
  CreditCard,
  RefreshCcw,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  MoreHorizontal,
  ChevronDown,
  CalendarDays,
  LayoutList,
  CheckCircle2,
  Package,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import {
  formatCalendarPair,
  formatDate,
  isTodayInAddis,
  isSameDayInAddis,
  getEthiopianDateDetails,
} from "@/lib/date";
import { formatETB } from "@/lib/money";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DualCalendarPicker } from "@/components/calendar/DualCalendarPicker";

export default function TodayLedgerPage() {
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"ledger" | "schedule">("ledger");

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadOrders = React.useCallback(() => {
    setIsRefreshing(true);
    if (typeof studioStore !== "undefined" && studioStore.getOrders) {
      setAllOrders(studioStore.getOrders());
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
    loadOrders();
  }, [loadOrders]);

  // Selected date pair
  const selectedCalendar = React.useMemo(() => {
    return selectedDate ? formatCalendarPair(selectedDate) : null;
  }, [selectedDate]);

  const selectedEthDetails = React.useMemo(() => {
    return selectedDate ? getEthiopianDateDetails(selectedDate) : null;
  }, [selectedDate]);

  const isTodaySelected = React.useMemo(() => {
    return selectedDate ? isTodayInAddis(selectedDate) : false;
  }, [selectedDate]);

  // Filter orders for the selected date
  const orders = React.useMemo(() => {
    if (!selectedDate) return allOrders;
    return allOrders.filter((o) => isSameDayInAddis(o.created_at, selectedDate));
  }, [allOrders, selectedDate]);

  const metrics = React.useMemo(() => {
    let collected = new Decimal(0);
    let balance = new Decimal(0);

    orders.forEach((order) => {
      collected = collected.plus(new Decimal(order.paid_amount || 0));
      const total = new Decimal(order.total_amount || 0);
      const paid = new Decimal(order.paid_amount || 0);
      const diff = total.minus(paid);
      if (diff.greaterThan(0)) {
        balance = balance.plus(diff);
      }
    });

    return {
      count: orders.length,
      collected: collected.toFixed(2),
      balance: balance.toFixed(2),
    };
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const customer = (o.customer?.name || "").toLowerCase();
      const phone = (o.customer?.phone || "").toLowerCase();
      const id = String(o.id || o.order_number || "").toLowerCase();
      const term = search.toLowerCase();

      const matchesSearch = !term || customer.includes(term) || phone.includes(term) || id.includes(term);
      const matchesStatus = status === "all" || o.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  const handleExportCSV = React.useCallback(() => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order Number", "Customer Name", "Phone", "Services", "Total (ETB)", "Paid (ETB)", "Balance (ETB)", "Status", "Date"];
    const rows = filteredOrders.map((o) => [
      o.order_number || o.id,
      `"${(o.customer?.name || "Walk-In").replace(/"/g, '""')}"`,
      `"${o.customer?.phone || ""}"`,
      `"${(o.items?.map((i) => `${i.quantity}x ${i.photo_type_name}`).join("; ") || "Studio Photography").replace(/"/g, '""')}"`,
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
    link.setAttribute("download", `addis-ledger-${selectedCalendar ? selectedCalendar.gregorian.replace(/\//g, "-") : "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredOrders, selectedCalendar]);

  const paymentTotals = React.useMemo(() => {
    const totals: Record<string, Decimal> = {};
    orders.forEach((order) => {
      (order.payments || []).forEach((payment) => {
        const method = payment.payment_method || "other";
        totals[method] = (totals[method] || new Decimal(0)).plus(payment.amount || 0);
      });
    });
    return totals;
  }, [orders]);

  const outstandingCustomers = React.useMemo(() => {
    const balances = new Map<string, { name: string; orderNumber: string; balance: Decimal }>();
    orders.forEach((order) => {
      const balance = new Decimal(order.balance_amount || 0);
      if (!balance.greaterThan(0)) return;
      const customerId = order.customer_id || order.customer?.id || order.id;
      const current = balances.get(customerId);
      balances.set(customerId, {
        name: order.customer?.name || "Walk-In Guest",
        orderNumber: order.order_number || order.id,
        balance: (current?.balance || new Decimal(0)).plus(balance),
      });
    });
    return Array.from(balances.values()).sort((a, b) => b.balance.comparedTo(a.balance)).slice(0, 3);
  }, [orders]);

  const quantityTotals = React.useMemo(() => {
    const totals: Record<string, number> = { "3×4": 0, "10×15": 0, "30×45": 0, "13×18": 0, "20×25": 0, Other: 0 };
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.photo_type_name || "";
        const label = Object.keys(totals).find((candidate) => candidate !== "Other" && name.includes(candidate.replace("×", "x")));
        totals[label || "Other"] += Number(item.quantity) || 0;
      });
    });
    return totals;
  }, [orders]);

  const renderStatus = (orderStatus: string) => {
    switch (orderStatus?.toLowerCase()) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/60">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100">
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            New
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-[1128px] space-y-3">
      {/* Title & Interactive Calendar Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[25px] font-medium leading-none tracking-[-0.04em] text-slate-900">
            Good morning, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            {isTodaySelected
              ? "Here’s what’s happening at your studio today."
              : selectedCalendar
              ? `Viewing ledger for ${selectedCalendar.gregorian} (${selectedEthDetails?.textAm || ""}).`
              : "Viewing all recorded studio orders."}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto relative">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("ledger")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === "ledger"
                  ? "bg-[#e21b23] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutList className="h-3 w-3" />
              <span>Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("schedule")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === "schedule"
                  ? "bg-[#e21b23] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              <span>Schedule</span>
            </button>
          </div>

          {/* Interactive Dual Calendar Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCalendarOpen((prev) => !prev)}
              aria-label="Open Studio Calendar"
              className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-[11px] font-semibold shadow-sm transition sm:min-w-[190px] sm:flex-none sm:px-4 ${
                isCalendarOpen
                  ? "border-red-500 bg-red-50/60 text-[#e21b23] ring-2 ring-red-500/20"
                  : isTodaySelected
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "border-red-400 bg-red-50/30 text-red-700 hover:bg-red-50/60"
              }`}
            >
              <CalendarIcon className={`h-3.5 w-3.5 ${isCalendarOpen || !isTodaySelected ? "text-[#e21b23]" : "text-slate-400"}`} />
              <span className="truncate">
                {selectedCalendar ? (
                  <>
                    {selectedCalendar.gregorian} <span className="text-slate-400">•</span>{" "}
                    {selectedCalendar.ethiopian} EC
                  </>
                ) : (
                  "All Dates"
                )}
              </span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isCalendarOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Popover */}
            {isCalendarOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:bg-transparent"
                  onClick={() => setIsCalendarOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <DualCalendarPicker
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                      setIsCalendarOpen(false);
                    }}
                    orders={allOrders}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={isRefreshing}
            aria-label="Refresh today ledger"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-red-600" : "text-slate-500"}`} />
          </button>
        </div>
      </div>

      {/* Date Banner if Viewing a Non-Today Date */}
      {!isTodaySelected && selectedCalendar && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/60 px-4 py-2.5 text-xs text-red-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white font-bold text-[10px]">!</span>
            <span>
              Viewing historical/future bookings for <b>{selectedCalendar.gregorian}</b> ({selectedEthDetails?.textAm || ""}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className="flex items-center gap-1 rounded-md bg-white border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 shadow-xs transition"
          >
            Jump to Today
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative flex min-h-[118px] flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Bookings</span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isTodaySelected ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
              • {isTodaySelected ? "Today" : selectedCalendar?.gregorian || "Selected"}
            </span>
          </div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">{metrics.count}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400">
            <span>Orders created on {selectedCalendar ? selectedCalendar.gregorian : "catalog"}</span>
            <span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%_100%)] opacity-80" />
          </div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Paid</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">• Collected</span>
          </div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">{isAdmin ? `ETB ${metrics.collected}` : "ETB ••••••"}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400">
            <span>Payments on {selectedCalendar ? selectedCalendar.gregorian : "all"}</span>
            <span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%)] opacity-80" />
          </div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-600">Due</div>
          <div className="text-[21px] font-bold tracking-tight text-[#e21b23]">{isAdmin ? `ETB ${metrics.balance}` : "ETB ••••••"}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400">
            <span>Balance on bookings</span>
            <span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%)] opacity-80" />
          </div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Cash received</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">• Valid</span>
          </div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">
            {isAdmin ? `ETB ${(paymentTotals["cash"] || new Decimal(0)).toFixed(2)}` : "ETB ••••••"}
          </div>
          <div className="flex items-end justify-between text-[9px] text-slate-400">
            <span>Valid cash payments</span>
            <span className="h-5 w-16 bg-[linear-gradient(to_top,#f2b4b7_0_70%,transparent_70%)] opacity-80" />
          </div>
        </div>
      </div>

      {/* Package & Photo Quantities Bar */}
      <div className="flex h-[56px] items-center rounded-lg border border-slate-200 bg-white px-4 shadow-sm overflow-x-auto">
        <div className="w-[190px] shrink-0">
          <p className="text-[11px] font-bold text-slate-800">Photo & Package Quantities</p>
          <p className="text-[9px] text-slate-400">
            {selectedCalendar ? `Booked on ${selectedCalendar.gregorian}` : "All booked items"}
          </p>
        </div>
        {Object.entries(quantityTotals).map(([label, value]) => (
          <div key={label} className="flex flex-1 min-w-[70px] items-center justify-center gap-2 border-l border-slate-200 text-[9px] text-slate-400">
            <strong className="text-[16px] text-slate-900">{value}</strong>{label}
          </div>
        ))}
      </div>

      {/* MAIN VIEW: Calendar Schedule View vs Table Ledger */}
      {viewMode === "schedule" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#e21b23]" />
              Monthly Schedule & Bookings Calendar
            </h2>
            <DualCalendarPicker
              selectedDate={selectedDate}
              onSelectDate={(d) => setSelectedDate(d)}
              orders={allOrders}
              isInline={true}
            />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Bookings on {selectedCalendar?.gregorian || "Date"}</span>
                <span className="text-[10px] text-red-600 font-semibold">{selectedEthDetails?.textAm}</span>
              </h3>

              <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No sessions or orders booked for this date.
                  </p>
                ) : (
                  orders.map((ord) => (
                    <Link
                      key={ord.id}
                      href={`/orders/${ord.id}`}
                      className="block p-3 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/20 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-900 group-hover:text-red-600">
                          {ord.order_number || ord.id}
                        </span>
                        {renderStatus(ord.status)}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {ord.customer?.name || "Walk-In Customer"}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                        {(ord.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>• {it.quantity}x {it.photo_type_name}</span>
                            <span className="font-semibold text-slate-700">ETB {it.line_total}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Total: ETB {ord.total_amount}</span>
                        <span className="text-emerald-600 font-bold">Paid: ETB {ord.paid_amount}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Table Ledger View */
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isTodaySelected ? "Today’s bookings" : `Bookings on ${selectedCalendar?.gregorian || "Selected Date"}`}
                </h2>
                <p className="text-[10px] text-slate-400">
                  {selectedEthDetails ? `${selectedEthDetails.textAm} • ` : ""}
                  All studio appointments, sessions, and instant prints
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer, phone, ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-44 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredOrders.length === 0}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-[10px] font-bold uppercase text-slate-500">Booking</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-500">Customer</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-500">Packages / Services</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500">Total</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500">Paid</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400">
                        No orders recorded for this date and filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const isUnpaid = Number(order.balance_amount || 0) > 0;
                      return (
                        <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-slate-900">
                            <Link href={`/orders/${order.id}`} className="hover:text-[#e21b23] hover:underline">
                              {order.order_number || order.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-slate-800">{order.customer?.name || "Walk-In"}</p>
                            <p className="text-[10px] text-slate-400">{order.customer?.phone || "-"}</p>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate text-xs text-slate-600">
                              {(order.items || []).map((i) => `${i.quantity}x ${i.photo_type_name}`).join(", ") || "Studio Photography"}
                            </p>
                          </TableCell>
                          <TableCell>{renderStatus(order.status)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-slate-900">
                            {formatETB(order.total_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-emerald-600">
                            {formatETB(order.paid_amount)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${isUnpaid ? "text-[#e21b23]" : "text-slate-400"}`}>
                            {formatETB(order.balance_amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Right-Side Financial Breakdown */}
          <aside className="space-y-3">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-3 py-3">
                <h2 className="text-xs font-semibold text-slate-800">Payments by method</h2>
                <p className="mt-1 text-[9px] text-slate-400">
                  Valid payments · {selectedCalendar ? selectedCalendar.gregorian : "All"}
                </p>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-full"
                  style={{
                    background:
                      "conic-gradient(#e21b23 0 64%, #111 64% 82%, #aeb0b4 82% 94%, #ddd 94% 100%)",
                  }}
                >
                  <div className="flex h-[55px] w-[55px] flex-col items-center justify-center rounded-full bg-white text-center">
                    <strong className="text-[14px] text-slate-800">
                      {isAdmin ? formatETB(metrics.collected).replace("ETB ", "") : "••••"}
                    </strong>
                    <span className="text-[7px] text-slate-400">Total ETB</span>
                  </div>
                </div>
                <div className="space-y-2 text-[9px] text-slate-600">
                  {[
                    ["🔴", "Cash", "cash"],
                    ["⚫", "Telebirr", "telebirr"],
                    ["◾", "Bank transfer", "bank_transfer"],
                    ["◽", "CBE Birr", "cbe_birr"],
                  ].map(([icon, label, method]) => (
                    <p key={method}>
                      {icon} {label}{" "}
                      <b className="float-right ml-4">
                        {isAdmin ? formatETB(paymentTotals[method] || 0).replace("ETB ", "") : "••••"}
                      </b>
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <div>
                  <h2 className="text-xs font-semibold text-slate-800">Outstanding balances</h2>
                  <p className="mt-1 text-[9px] text-slate-400">Top customers for this date</p>
                </div>
              </div>
              {outstandingCustomers.map(({ name, orderNumber, balance }) => (
                <div key={name} className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5dddd] text-[9px] font-bold text-[#c52b2f]">
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-slate-800">{name}</p>
                    <p className="text-[8px] text-slate-400">{orderNumber}</p>
                  </div>
                  <b className="text-[9px] text-[#e21b23]">{isAdmin ? formatETB(balance) : "ETB ••••••"}</b>
                </div>
              ))}
              {outstandingCustomers.length === 0 && (
                <p className="px-3 py-5 text-center text-[10px] text-slate-400">
                  No outstanding balances for this date.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
