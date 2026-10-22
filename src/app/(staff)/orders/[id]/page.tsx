"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Ban,
  Printer,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { studioStore } from "@/lib/api/store";
import { formatETB, calculateBalance } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();

  const orderId = (params?.id as string) || "";
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("telebirr");
  const [payRef, setPayRef] = useState("");

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const order = useMemo(() => {
    return studioStore.getOrderById(orderId);
  }, [orderId, refreshTrigger]);

  useEffect(() => {
    studioStore
      .syncOrders()
      .then(() => setRefreshTrigger((c) => c + 1))
      .catch(() => {});
  }, [orderId]);

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <p className="text-sm text-slate-500">The requested order ID does not exist.</p>
        <Link href="/today">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Today Ledger
          </Button>
        </Link>
      </div>
    );
  }

  const hasDue = Number(order.balance_amount) > 0;
  const isVoid = order.status === "voided";

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!payAmount || Number(payAmount) <= 0) {
      setErrorMessage("Enter a valid payment amount.");
      return;
    }

    if (Number(payAmount) > Number(order.balance_amount)) {
      setErrorMessage(`Payment cannot exceed the outstanding balance of ${formatETB(order.balance_amount)}.`);
      return;
    }

    try {
      studioStore.recordPayment(order.id, payAmount, payMethod, payRef || undefined, {
        id: user?.id || "usr-1",
        name: user?.name || "Staff",
      });
      setPaymentDialogOpen(false);
      setPayAmount("");
      setPayRef("");
      setRefreshTrigger((c) => c + 1);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to record payment");
    }
  };

  const handleVoidOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!voidReason.trim()) {
      setErrorMessage("Please enter an explanation for voiding this order.");
      return;
    }

    try {
      studioStore.voidOrder(order.id, voidReason.trim(), {
        id: user?.id || "usr-1",
        name: user?.name || "Admin",
      });
      setVoidDialogOpen(false);
      setVoidReason("");
      setRefreshTrigger((c) => c + 1);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to void order");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/today"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Ledger</span>
        </Link>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print Receipt
          </Button>

          {!isVoid && hasDue && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setPayAmount(order.balance_amount);
                setPaymentDialogOpen(true);
              }}
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Collect Balance
            </Button>
          )}

          {!isVoid && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setVoidDialogOpen(true)}
              disabled={!isAdmin}
              title={!isAdmin ? "Voiding requires Admin privileges" : undefined}
            >
              <Ban className="h-4 w-4 mr-1.5" />
              Void Order
            </Button>
          )}
        </div>
      </div>

      {/* Void Notice Banner */}
      {isVoid && (
        <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl flex items-start space-x-3 text-red-800">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-base">This Order Has Been VOIDED</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Reason: &ldquo;{order.void_reason}&rdquo;
            </p>
            <p className="text-[11px] text-red-600 mt-1">
              Voided by <strong>{order.voided_by || "Administrator"}</strong> on {formatDateTime(order.voided_at)}
            </p>
          </div>
        </div>
      )}

      {/* Main Order Card */}
      <Card className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-2xl font-black text-amber-400">
                {order.order_number}
              </span>
              <Badge
                variant={
                  isVoid
                    ? "destructive"
                    : order.status === "delivered"
                    ? "delivered"
                    : order.status === "ready"
                    ? "ready"
                    : "in_progress"
                }
                className="uppercase tracking-wider font-bold"
              >
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created: {formatDateTime(order.created_at)}</span>
              <span>• Handled by: {order.created_by_name}</span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase">Order Balance</div>
            <div
              className={`text-2xl font-black font-mono ${
                isVoid
                  ? "text-slate-400 line-through"
                  : hasDue
                  ? "text-rose-400"
                  : "text-emerald-400"
              }`}
            >
              {isVoid ? "VOIDED" : formatETB(order.balance_amount)}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block">
              Customer Profile
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5 mt-0.5">
              <User className="h-4 w-4 text-amber-600" />
              <Link
                href={`/customers/${order.customer_id}`}
                className="hover:underline hover:text-amber-600 dark:hover:text-amber-400"
              >
                {order.customer.name}
              </Link>
            </div>
            <div className="text-slate-600 dark:text-zinc-300 flex items-center space-x-1.5 mt-1 font-mono">
              <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <span>{order.customer.phone}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px] block">
              Order Notes / Specifications
            </span>
            <p className="text-slate-700 dark:text-zinc-300 italic mt-1 bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-700">
              {order.notes || "No special instructions provided."}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
            Services & Prints
          </h4>
          <Table>
            <TableHeader className="bg-slate-100 dark:bg-zinc-800/60">
              <TableRow>
                <TableHead>Service Item</TableHead>
                <TableHead className="w-20 text-center">Qty</TableHead>
                <TableHead className="w-32 text-right">Unit Price</TableHead>
                <TableHead className="w-32 text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100 dark:divide-zinc-800">
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">
                    {item.photo_type_name}
                  </TableCell>
                  <TableCell className="text-center font-mono dark:text-zinc-300">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono dark:text-zinc-300">{formatETB(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {formatETB(item.line_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals Summary */}
          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Subtotal:</span>
                <span>{formatETB(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                <span>Total Paid:</span>
                <span>{formatETB(order.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-slate-200 dark:border-zinc-800 pt-2 text-slate-900 dark:text-zinc-100">
                <span>Balance Due:</span>
                <span className={hasDue ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                  {formatETB(order.balance_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Payment Transactions ({order.payments.length})
            </h4>
            {!isVoid && hasDue && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  setPayAmount(order.balance_amount);
                  setPaymentDialogOpen(true);
                }}
              >
                + Add Payment
              </Button>
            )}
          </div>

          {order.payments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500 italic">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader className="bg-slate-100 dark:bg-zinc-800/60">
                <TableRow>
                  <TableHead className="w-36">Time</TableHead>
                  <TableHead className="w-28">Method</TableHead>
                  <TableHead className="w-40">Reference #</TableHead>
                  <TableHead className="w-32">Received By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100 dark:divide-zinc-800">
                {order.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-slate-600 dark:text-zinc-400">
                      {formatDateTime(p.created_at)}
                    </TableCell>
                    <TableCell className="capitalize font-semibold text-slate-800 dark:text-zinc-200">
                      {p.payment_method.replace("_", " ")}
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 dark:text-zinc-400">
                      {p.reference_no || "-"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-400">{p.created_by_name}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatETB(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Void Logs Timeline */}
        {order.void_logs && order.void_logs.length > 0 && (
          <div className="p-6 border-t border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 mb-2">
              Void Audit Logs
            </h4>
            <div className="space-y-2">
              {order.void_logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 p-3 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-red-900 dark:text-red-300 font-semibold">
                    <span>Voided by {log.voided_by_name}</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                      {formatDateTime(log.voided_at)}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-zinc-300 italic">
                    Reason: &ldquo;{log.void_reason}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Collect Balance Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="dark:bg-[#18181b] dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-zinc-100">Record Payment for {order.order_number}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400">
              Record customer payment against the outstanding balance.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded text-xs text-rose-700 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Payment Amount (ETB) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={order.balance_amount}
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-zinc-400">
                Current outstanding balance: <strong>{formatETB(order.balance_amount)}</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Payment Channel
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="telebirr">Telebirr</option>
                <option value="cash">Cash</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Transaction Reference # (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. TLB123456789"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold">
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Void Order Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span>Void Order {order.order_number}</span>
            </DialogTitle>
            <DialogDescription>
              Voiding an order cancels its active production and creates an unalterable system audit record.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleVoidOrder} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Voiding *
              </label>
              <Input
                type="text"
                placeholder="e.g. Accidental duplicate entry, customer cancelled..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                required
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Confirm Void
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
