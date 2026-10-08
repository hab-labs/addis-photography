"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Users,
  Search,
  Plus,
  Phone,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Calendar,
  MoreHorizontal,
  FolderOpen,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { studioStore } from "@/lib/api/store";
import type { Customer as StoreCustomer } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Customer = StoreCustomer;

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      setCustomers(studioStore.getCustomers());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const metrics = React.useMemo(() => {
    let spent = new Decimal(0);
    let balance = new Decimal(0);

    customers.forEach((c) => {
      spent = spent.plus(new Decimal(c.total_spent));
      balance = balance.plus(new Decimal(c.balance_due));
    });

    return {
      totalClients: customers.length,
      lifetimeValue: spent.toFixed(2),
      totalBalance: balance.toFixed(2),
    };
  }, [customers]);

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              Customers Directory
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700  border border-indigo-500/20">
              <Users className="h-3 w-3" /> Studio Clients
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Search customer records, profile histories, and outstanding account balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-60 rounded-full bg-white border border-slate-200/80 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            />
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 shadow-sm shadow-indigo-600/25"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Customer</span>
          </Button>
        </div>
      </div>

      {/* Top Floating Apple KPI Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Card 1: Total Registered */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Clients
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600  ">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 ">
              {metrics.totalClients}
            </div>
          </div>
          <p className="text-xs font-semibold text-indigo-600  flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Studio repeat rate: 65%
          </p>
        </div>

        {/* Card 2: Cumulative Revenue */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Revenue Spent
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600  ">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-slate-900  tabular-nums">
              ETB {metrics.lifetimeValue}
            </div>
          </div>
          <p className="text-xs text-emerald-600  font-medium">
            Settled customer bookings
          </p>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  flex flex-col justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Receivables Due
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600  ">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black tracking-tight text-rose-600  tabular-nums">
              ETB {metrics.totalBalance}
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Pending collection at delivery
          </p>
        </div>
      </div>

      {/* Main Customers Table Container */}
      <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 ">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 ">
          <div>
            <h2 className="text-lg font-bold text-slate-900 ">
              Customer Registry
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified accounts, contact links, and billing milestones.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Showing {filteredCustomers.length} clients
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <Table>
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <TableHead className="w-64 pl-4">Customer</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead className="text-center">Total Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Client Since</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/80 ">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-xs text-slate-400">
                    Loading customer records…
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const hasDue = Number(cust.balance_due) > 0;

                  return (
                    <TableRow
                      key={cust.id}
                      className="border-none hover:bg-slate-50/80  transition-colors group cursor-pointer"
                    >
                      {/* Name & Avatar */}
                      <TableCell className="pl-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-slate-200/60 ">
                            <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-700    text-xs font-bold">
                              {getInitials(cust.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 ">
                                {cust.name}
                              </span>
                              {cust.total_orders >= 4 && (
                                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 ">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">ID: #{cust.id}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="text-xs font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80  px-2.5 py-1 text-[11px]">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {cust.phone}
                        </span>
                      </TableCell>

                      {/* Orders */}
                      <TableCell className="text-center font-semibold text-xs text-slate-700 ">
                        {cust.total_orders}
                      </TableCell>

                      {/* Spent */}
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-slate-800 ">
                        ETB {Number(cust.total_spent).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Balance */}
                      <TableCell className="text-right">
                        {hasDue ? (
                          <span className="font-mono text-xs font-bold tabular-nums text-rose-500">
                            ETB {Number(cust.balance_due).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700  ">
                            <CheckCircle2 className="h-3 w-3" />
                            CLEAR
                          </span>
                        )}
                      </TableCell>

                      {/* Client Since */}
                      <TableCell className="text-xs font-medium text-slate-400">
                        {new Intl.DateTimeFormat("en-GB", {
                          timeZone: "Africa/Addis_Ababa",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(cust.created_at))}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right pr-4">
                        <Link
                          href={`/customers/${cust.id}`}
                          aria-label={`Open ${cust.name} profile`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <p className="text-xs font-medium text-slate-400">No customers found.</p>
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