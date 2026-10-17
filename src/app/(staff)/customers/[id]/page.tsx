"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  Calendar,
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  PlusCircle,
} from "lucide-react";
import { studioStore } from "@/lib/api/store";
import { formatETB } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = (params?.id as string) || "";

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      studioStore.syncCustomers(),
      studioStore.syncOrders(),
    ]).then(() => setRefreshTrigger((c) => c + 1));
  }, [customerId]);

  const customer = useMemo(() => {
    return studioStore.getCustomerById(customerId);
  }, [customerId, refreshTrigger]);

  const orders = useMemo(() => {
    const all = studioStore.getOrders();
    return all.filter((o) => o.customer_id === customerId);
  }, [customerId, refreshTrigger]);

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Customer Not Found</h2>
        <p className="text-sm text-slate-500">The requested customer record does not exist.</p>
        <Link href="/customers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const hasDue = Number(customer.balance_due) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </Link>

        <Link href={`/orders/new?customer_id=${customer.id}&name=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone)}`}>
          <Button variant="gold" size="sm">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            New Order for {customer.name.split(" ")[0]}
          </Button>
        </Link>
      </div>

      {/* Customer Header Card */}
      <Card className="border border-slate-200 shadow-sm p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-mono flex items-center space-x-1 text-slate-700">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </span>
                <span>• Client since {formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold">Total Balance Due</div>
            <div className={`text-2xl font-black font-mono mt-0.5 ${hasDue ? "text-rose-600" : "text-emerald-600"}`}>
              {formatETB(customer.balance_due)}
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Profile Notes:</span> {customer.notes}
          </div>
        )}
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Orders
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{orders.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Lifetime Spent
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {formatETB(customer.total_spent)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Payment Status
              </p>
              <div className="mt-1">
                {hasDue ? (
                  <Badge variant="due" className="text-xs">
                    Outstanding Balance
                  </Badge>
                ) : (
                  <Badge variant="paid" className="text-xs">
                    All Paid & Cleared
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order History Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Order & Service History ({orders.length})
          </h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items / Services</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-slate-400">
                  No orders recorded for this customer yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono font-semibold">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-amber-600 hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-slate-500">
                    {formatDate(o.created_at)}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {o.items.map((i) => `${i.quantity}x ${i.photo_type_name}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatETB(o.total_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">
                    {formatETB(o.paid_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(o.balance_amount) > 0 ? (
                      <Badge variant="due">{formatETB(o.balance_amount)}</Badge>
                    ) : (
                      <Badge variant="paid">PAID</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/orders/${o.id}`}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 inline-block"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
