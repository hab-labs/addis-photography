"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import {
  Zap,
  RotateCcw,
  User,
  Phone,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  Receipt,
  Sparkles,
  ArrowRight,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
} from "lucide-react";

import { studioStore } from "@/lib/api/store";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/types";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  locked: boolean;
}

const PRESET_SERVICES = [
  { id: "pass-4", name: "Standard Passport / Visa (4 Copies)", price: 350 },
  { id: "pass-8", name: "Standard Passport / Visa (8 Copies)", price: 600 },
  { id: "port-std", name: "Studio Portrait Session (Digital)", price: 1200 },
  { id: "print-a4", name: "Glossy Frame Print (A4)", price: 850 },
  { id: "grad-pkg", name: "Graduation Express Mini-Shoot", price: 2500 },
];

const PAYMENT_METHODS = [
  { id: "telebirr", label: "Telebirr", icon: Smartphone, color: "from-amber-500 to-amber-600" },
  { id: "cash", label: "Cash", icon: Banknote, color: "from-emerald-500 to-emerald-600" },
  { id: "cbe_birr", label: "CBE Birr", icon: CreditCard, color: "from-violet-500 to-violet-600" },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, color: "from-blue-500 to-blue-600" },
];

export default function NewWalkInOrderPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Form States
  const [phone, setPhone] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("telebirr");
  const [paidInput, setPaidInput] = React.useState("350");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Items State
  const [items, setItems] = React.useState<OrderItem[]>([
    {
      id: "pass-4",
      name: "Standard Passport / Visa (4 Copies)",
      price: 350,
      quantity: 1,
      locked: true,
    },
  ]);

  // Reactive financial totals using Decimal
  const { total, paid, balance } = React.useMemo(() => {
    let orderTotal = new Decimal(0);
    items.forEach((item) => {
      const line = new Decimal(item.price || 0).times(item.quantity || 1);
      orderTotal = orderTotal.plus(line);
    });

    const parsedPaid = new Decimal(paidInput === "" ? 0 : paidInput || 0);
    const orderBalance = orderTotal.minus(parsedPaid);

    return {
      total: orderTotal,
      paid: parsedPaid,
      balance: orderBalance,
    };
  }, [items, paidInput]);

  // Set paid to full amount shortcut
  const handleSetFull = () => {
    setPaidInput(total.toString());
  };

  const handleAddItem = (preset?: typeof PRESET_SERVICES[0]) => {
    if (preset) {
      setItems((prev) => [
        ...prev,
        {
          id: `${preset.id}-${Date.now()}`,
          name: preset.name,
          price: preset.price,
          quantity: 1,
          locked: true,
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          name: "Studio Custom Service",
          price: 500,
          quantity: 1,
          locked: false,
        },
      ]);
    }
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setPhone("");
    setCustomerName("");
    setNotes("");
    setPaymentMethod("telebirr");
    setItems([
      {
        id: "pass-4",
        name: "Standard Passport / Visa (4 Copies)",
        price: 350,
        quantity: 1,
        locked: true,
      },
    ]);
    setPaidInput("350");
  };

  const handleSaveOrder = (markDelivered: boolean = false) => {
    const normalizedPhone = phone.replace(/[\s-]/g, "");
    const validPhone = /^(09\d{8}|\+2519\d{8})$/.test(normalizedPhone);

    if (!customerName.trim()) {
      setFormError("Enter the customer's full name.");
      return;
    }
    if (!validPhone) {
      setFormError("Enter a valid Ethiopian phone number (09XXXXXXXX or +2519XXXXXXXX).");
      return;
    }
    if (items.some((item) => !item.name.trim() || item.quantity < 1 || item.price < 0)) {
      setFormError("Check each service name, quantity, and price before saving.");
      return;
    }
    if (paid.isNegative()) {
      setFormError("Payment cannot be negative.");
      return;
    }
    if (paid.greaterThan(total)) {
      setFormError("Payment cannot exceed the order total.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    try {
      const prices = studioStore.getPrices();
      studioStore.createOrder({
        customer_name: customerName.trim(),
        customer_phone: normalizedPhone,
        items: items.map((item) => {
          const catalogItem = prices.find((price) => price.name === item.name);
          return {
            price_item_id: catalogItem?.id || item.id,
            photo_type_name: item.name.trim(),
            quantity: item.quantity,
            unit_price: item.price.toFixed(2),
          };
        }),
        payment_method: paymentMethod as PaymentMethod,
        paid_amount: paid.toFixed(2),
        notes: notes.trim() || undefined,
        is_delivered: markDelivered,
        created_by: {
          id: user?.id || "usr-demo",
          name: user?.name || "Demo Staff",
        },
      });
      router.push("/today");
    } catch (error) {
      setIsSubmitting(false);
      setFormError(error instanceof Error ? error.message : "Unable to save the order. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <Link href="/today" className="text-[11px] font-medium text-slate-400 hover:text-slate-700">← Back to today</Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">New Order</h1>
          <p className="text-[11px] text-slate-500">Create a booking and record an optional first payment.</p>
        </div>
        <div className="hidden rounded-md border border-slate-200 bg-white px-4 py-2 text-right sm:block">
          <p className="text-[9px] text-slate-400">Booking number</p>
          <p className="font-mono text-[11px] font-semibold text-slate-700">APS-261015-043</p>
        </div>
      </div>

      {formError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{formError}</div>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_198px]">
        <div className="space-y-3">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">1</span><div><h2 className="text-xs font-bold text-slate-800">Customer</h2><p className="text-[10px] text-slate-400">Find an existing customer or create a new profile.</p></div></div>
              <button type="button" onClick={() => { setCustomerName(""); setPhone(""); }} className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">＋ New Customer</button>
            </div>
            <label className="mb-1 block text-[10px] font-medium text-slate-500">Search customer</label>
            <div className="relative">
              <Input type="tel" placeholder="09XXXXXXXX or +2519XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-md border-slate-200 pr-8 text-xs" />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">⌄</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
              <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">{customerName ? customerName.slice(0, 2).toUpperCase() : "CU"}</span><div><p className="text-[10px] font-semibold text-slate-700">{customerName || "New customer"}</p><p className="text-[9px] text-slate-400">{phone || "Phone number pending"}</p></div></div>
              <span className="text-right text-[9px] text-slate-400">Outstanding balance<br /><b className="text-slate-700">ETB 0.00</b> <span className="text-emerald-600">✓</span></span>
            </div>
            <label className="mt-3 mb-1 block text-[10px] font-medium text-slate-500">Customer full name</label>
            <Input placeholder="e.g. Abebe Kebede" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-9 rounded-md border-slate-200 text-xs" />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">2</span><div><h2 className="text-xs font-bold text-slate-800">Order Items</h2><p className="text-[10px] text-slate-400">Prices are populated from the active price list.</p></div></div><button type="button" onClick={() => handleAddItem()} className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">＋ Add Item</button></div>
            <div className="hidden grid-cols-[1fr_82px_100px_100px_18px] gap-2 px-2 pb-1 text-[8px] uppercase text-slate-400 sm:grid"><span>Photo type</span><span>Quantity</span><span>Unit price</span><span>Line total</span></div>
            <div className="space-y-2">
              {items.map((item, idx) => { const lineTotal = new Decimal(item.price || 0).times(item.quantity || 1); return (
                <div key={item.id} className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[1fr_82px_100px_100px_18px] sm:items-center">
                  <Input value={item.name} disabled={item.locked} onChange={(e) => handleUpdateItem(idx, "name", e.target.value)} className="h-8 rounded-md text-[10px]" />
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="h-8 rounded-md text-center text-[10px]" />
                  <Input type="number" value={item.price} disabled={item.locked} onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)} className="h-8 rounded-md text-[10px]" />
                  <span className="text-right font-mono text-[10px] font-bold text-slate-700">ETB {lineTotal.toFixed(2)}</span>
                  <button type="button" onClick={() => handleRemoveItem(idx)} disabled={items.length <= 1} className="text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-3 w-3" /></button>
                </div>
              ); })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">3</span><div><h2 className="text-xs font-bold text-slate-800">Payment</h2><p className="text-[10px] text-slate-400">Record a payment now or leave the balance due.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-[10px] font-medium text-slate-500">Payment amount</label><Input type="number" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} className="h-9 rounded-md text-xs" /></div>
              <div><label className="mb-1 block text-[10px] font-medium text-slate-500">Payment method</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="cash">Cash</option><option value="telebirr">Telebirr</option><option value="cbe_birr">CBE Birr</option><option value="bank_transfer">Bank Transfer</option></select></div>
              <Input placeholder="Transaction reference (optional)" value="" readOnly className="h-9 rounded-md text-xs" /><Input placeholder="Internal notes — visible only to staff" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 rounded-md text-xs" />
            </div>
            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-[9px] font-semibold text-emerald-700">✓ ETB {paid.toFixed(2)} will be recorded as a valid payment. <span className="block font-normal">Remaining balance: ETB {balance.toFixed(2)}</span></div>
          </section>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
          <h2 className="border-b border-slate-200 pb-3 text-xs font-bold text-slate-700">Order summary</h2>
          <div className="space-y-2 border-b border-slate-100 py-3 text-[10px] text-slate-500"><div className="flex justify-between"><span>Items × {items.length}</span><b className="text-slate-700">ETB {total.toFixed(2)}</b></div><div className="flex justify-between"><span>Payment</span><b className="text-emerald-600">− ETB {paid.toFixed(2)}</b></div></div>
          <div className="flex justify-between py-3 text-xs font-bold text-slate-800"><span>Remaining balance</span><span className="text-red-600">ETB {balance.toFixed(2)}</span></div>
          <div className="space-y-2"><Button type="button" disabled={isSubmitting} onClick={() => handleSaveOrder(false)} className="h-8 w-full rounded-md bg-[#e21b23] text-[10px] font-bold hover:bg-red-700">Save Order</Button><Button type="button" disabled={isSubmitting} onClick={() => handleSaveOrder(true)} variant="outline" className="h-8 w-full rounded-md text-[10px]">Save & Mark Delivered</Button><button type="button" onClick={handleReset} className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-700">Cancel</button></div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[8px] text-slate-400">🔒 Payment info — this payment will be recorded.</p>
        </aside>
      </div>
    </div>
  );
}