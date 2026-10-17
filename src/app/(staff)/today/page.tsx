"use client";

import * as React from "react";
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
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { studioStore } from "@/lib/api/store";
import { formatCalendarPair } from "@/lib/date";
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

export default function TodayLedgerPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [orders, setOrders] = React.useState<any[]>([]);
  const currentCalendar = React.useMemo(() => formatCalendarPair(new Date()), []);

  const loadOrders = React.useCallback(() => {
    if (typeof studioStore !== "undefined" && studioStore.getOrders) {
      setOrders(studioStore.getOrders());
    }
  }, []);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const metrics = React.useMemo(() => {
    let collected = new Decimal(0);
    let balance = new Decimal(0);

    orders.forEach((order) => {
      collected = collected.plus(new Decimal(order.paid || order.paid_amount || 0));
      const total = new Decimal(order.total || order.total_amount || 0);
      const paid = new Decimal(order.paid || order.paid_amount || 0);
      const diff = total.minus(paid);
      if (diff.isPositive()) {
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
      const customer = (o.customer?.name || o.customer_name || "").toLowerCase();
      const phone = (o.customer?.phone || o.customer_phone || "").toLowerCase();
      const id = String(o.id || o.order_number || "").toLowerCase();
      const term = search.toLowerCase();

      const matchesSearch = !term || customer.includes(term) || phone.includes(term) || id.includes(term);
      const matchesStatus = status === "all" || o.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  const renderStatus = (orderStatus: string) => {
    switch (orderStatus?.toLowerCase()) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50   border border-emerald-200/60 ">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50   border border-amber-200/60 ">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100  ">
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50   border border-indigo-200/60 ">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            New
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-[1128px] space-y-3">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[25px] font-medium leading-none tracking-[-0.04em] text-slate-900 ">
            Good morning, Meron
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Here’s what’s happening at your studio today.
          </p>
        </div>

        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <button className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[178px] sm:flex-none sm:px-4">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">
              {currentCalendar.gregorian} <span className="text-slate-400">•</span>{" "}
              {currentCalendar.ethiopian} EC
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          <button 
            onClick={loadOrders}
            className="hidden"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative flex min-h-[118px] flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Bookings</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">• +8.4%</span>
          </div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">{metrics.count}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400"><span>Orders created on 15 Oct</span><span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%_100%)] opacity-80" /></div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-600">Paid</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">• +12.6%</span></div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">{isAdmin ? `ETB ${metrics.collected}` : "ETB ••••••"}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400"><span>Payments received on 15 Oct</span><span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%)] opacity-80" /></div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-600">Due</div>
          <div className="text-[21px] font-bold tracking-tight text-[#e21b23]">{isAdmin ? `ETB ${metrics.balance}` : "ETB ••••••"}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400"><span>Balance on today’s bookings</span><span className="h-5 w-16 bg-[linear-gradient(to_top,#ededed_0_55%,transparent_55%)] opacity-80" /></div>
        </div>

        <div className="flex min-h-[118px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-600">Cash received today</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">• +5.2%</span></div>
          <div className="text-[21px] font-bold tracking-tight text-slate-900">{isAdmin ? `ETB ${metrics.collected}` : "ETB ••••••"}</div>
          <div className="flex items-end justify-between text-[9px] text-slate-400"><span>Valid cash payments today</span><span className="h-5 w-16 bg-[linear-gradient(to_top,#f2b4b7_0_70%,transparent_70%)] opacity-80" /></div>
        </div>
      </div>

      <div className="flex h-[56px] items-center rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
        <div className="w-[190px]"><p className="text-[11px] font-bold text-slate-800">Photo quantities</p><p className="text-[9px] text-slate-400">Items booked today</p></div>
        {[
          ["68", "3×4"],
          ["34", "10×15"],
          ["12", "30×45"],
          ["21", "13×18"],
          ["9", "20×25"],
          ["6", "Other"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-1 items-center justify-center gap-2 border-l border-slate-200 text-[9px] text-slate-400">
            <strong className="text-[16px] text-slate-900">{value}</strong>{label}
          </div>
        ))}
      </div>

      {/* Bookings and right-side summaries */}
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 ">
              Today’s bookings
            </h2>
            <p className="mt-0.5 text-[9px] text-slate-400">
              {filteredOrders.length} of {orders.length} bookings shown
            </p>
          </div>

          <button className="hidden h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 sm:flex">
            ↓&nbsp; Export
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-200 px-3 py-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Name, phone, or reference"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[10px] text-slate-700 outline-none sm:w-44"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-full rounded-md border-slate-200 bg-white text-[10px] font-semibold shadow-none sm:w-44">
                <SelectValue placeholder="All photo types" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <button className="hidden h-8 rounded-md border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 sm:block">⚱ More filters</button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-none bg-[#fafafa] text-[8px] font-bold uppercase tracking-wide text-slate-400 hover:bg-[#fafafa]">
                <TableHead className="w-24 pl-3">Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-3 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/80 ">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const total = new Decimal(order.total || order.total_amount || 0);
                  const paid = new Decimal(order.paid || order.paid_amount || 0);
                  const bal = total.minus(paid);

                  const serviceSummary = Array.isArray(order.items) && order.items.length > 0
                    ? order.items
                        .map((i: any) => `${i.quantity || 1}x ${i.name || i.service_name || "Portrait"}`)
                        .join(", ")
                    : order.service_summary || "Studio Photography";

                  return (
                    <TableRow 
                      key={order.id || order.order_number}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50 group cursor-pointer"
                    >
                      <TableCell className="pl-3 font-mono text-[9px] font-bold text-slate-800">
                        {order.order_number || order.id}
                      </TableCell>
                      <TableCell className="text-[10px] font-bold text-slate-800">
                        <div>{order.customer?.name || order.customer_name || "Walk-In Guest"}</div>
                        <div className="text-[8px] font-normal text-slate-400">{order.customer?.phone || order.customer_phone || "—"}</div>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-[9px] text-slate-500">
                        {serviceSummary}
                      </TableCell>
                      <TableCell className="text-[9px] tabular-nums text-slate-600">
                        ETB {total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-[9px] tabular-nums text-slate-600">
                        ETB {paid.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-[9px] tabular-nums ${bal.isPositive() && !bal.isZero() ? "font-bold text-[#e21b23]" : "text-slate-500"}`}>
                        ETB {bal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-[9px] text-slate-500">
                        {order.payments?.[0]?.payment_method || "Cash"}
                      </TableCell>
                      <TableCell>
                        {renderStatus(order.status)}
                      </TableCell>
                      <TableCell className="pr-3 text-right text-slate-500">›</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-44 text-center">
                    <p className="text-xs font-medium text-slate-400">No matching orders in the registry.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-3 py-3">
            <h2 className="text-xs font-semibold text-slate-800">Payments by method</h2>
            <p className="mt-1 text-[9px] text-slate-400">Valid payments · 15 Oct</p>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full" style={{ background: "conic-gradient(#e21b23 0 64%, #111 64% 82%, #aeb0b4 82% 94%, #ddd 94% 100%)" }}>
              <div className="flex h-[55px] w-[55px] flex-col items-center justify-center rounded-full bg-white text-center">
                <strong className="text-[14px] text-slate-800">48.2K</strong>
                <span className="text-[7px] text-slate-400">Total ETB</span>
              </div>
            </div>
            <div className="space-y-2 text-[9px] text-slate-600">
              <p>🔴 Cash <b className="float-right ml-4">31,800</b></p>
              <p>⚫ Telebirr <b className="float-right ml-4">8,450</b></p>
              <p>◾ Bank transfer <b className="float-right ml-4">6,200</b></p>
              <p>◽ Card & other <b className="float-right ml-4">1,800</b></p>
            </div>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
            <div><h2 className="text-xs font-semibold text-slate-800">Outstanding balances</h2><p className="mt-1 text-[9px] text-slate-400">Top five customers</p></div>
            <span className="text-[9px] font-semibold text-[#e21b23]">View all</span>
          </div>
          {[
            ["HA", "Henok Alemu", "ETB 1,400.00"],
            ["RT", "Rahel Tadesse", "ETB 1,550.00"],
            ["BG", "Bethlehem Girma", "ETB 1,600.00"],
          ].map(([initials, name, amount]) => (
            <div key={name} className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5dddd] text-[9px] font-bold text-[#c52b2f]">{initials}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800">{name}</p><p className="text-[8px] text-slate-400">APS-261015-041</p></div>
              <b className="text-[9px] text-[#e21b23]">{amount}</b>
            </div>
          ))}
        </section>
      </aside>
    </div>
    </div>
  );
}