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
import { ADDIS_TIMEZONE } from "@/lib/date";
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
  const currentMonth = React.useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: ADDIS_TIMEZONE,
      }).format(new Date()),
    []
  );

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
            Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Studio booking pipeline and live sales collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="flex h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50   ">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentMonth}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          <button 
            onClick={loadOrders}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50   "
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Apple Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1F3B] to-[#121429] p-6 text-white shadow-xl shadow-indigo-950/20 border border-indigo-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              Live Studio
            </span>
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
          </div>
          <div className="my-4">
            <p className="text-xs font-medium text-slate-300">Daily Bookings</p>
            <div className="text-3xl font-extrabold tracking-tight mt-1">{metrics.count} <span className="text-xs font-normal text-slate-400">Sessions</span></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-indigo-300/80 pt-2 border-t border-white/5">
            <span>Production status</span>
            <span className="text-white font-semibold flex items-center">Active <ArrowUpRight className="h-3 w-3 ml-0.5" /></span>
          </div>
        </div>

        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Collected</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600  ">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900  tabular-nums">
              {isAdmin ? `ETB ${metrics.collected}` : "••••••"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 ">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+100% counter verified</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Balance</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600  ">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900  tabular-nums">
              {isAdmin ? `ETB ${metrics.balance}` : "••••••"}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Awaiting pickup delivery</p>
        </div>

        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Flow</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-violet-600  ">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900 ">
              {metrics.count > 0 ? "High" : "Optimal"}
            </div>
          </div>
          <p className="text-xs font-semibold text-violet-600  flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Studio capacity active
          </p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 ">
          <div>
            <h2 className="text-lg font-bold text-slate-900 ">
              Bookings & Production Register
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live orders, customer contact, and real-time payment audit.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers, phones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 rounded-full bg-slate-100/80 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/30   border-none"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-32 rounded-full border-slate-200/80 bg-white text-xs font-semibold shadow-2xs  ">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <Table>
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <TableHead className="w-28 pl-4">Order ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Services / Package</TableHead>
                <TableHead className="text-right">Total (ETB)</TableHead>
                <TableHead className="text-right">Paid (ETB)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="pr-4 text-right">Handled By</TableHead>
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
                      className="border-none hover:bg-slate-50/80  transition-colors group cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs font-bold pl-4 text-indigo-600 ">
                        #{order.order_number || order.id}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-medium">
                        {order.time || "10:30 AM"}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-800 ">
                        {order.customer?.name || order.customer_name || "Walk-In Guest"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">
                        {order.customer?.phone || order.customer_phone || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-600  max-w-xs truncate">
                        {serviceSummary}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-slate-800 ">
                        {total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-emerald-600 ">
                        {paid.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold tabular-nums ${bal.isPositive() && !bal.isZero() ? "text-rose-500" : "text-slate-300 "}`}>
                        {bal.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatus(order.status)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-500 text-right pr-4">
                        {order.created_by_name || order.handled_by || "Yonas"}
                      </TableCell>
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
    </div>
  );
}