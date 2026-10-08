"use client";

import * as React from "react";
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Action Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ">
              <Zap className="h-4 w-4 fill-current" />
            </div>

            {formError && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 ">
              Fast Walk-In Order
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700   border border-amber-200/60 ">
              <Sparkles className="h-3 w-3" /> Under 60s Flow
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400">
            Rapid customer intake, service allocation, and instant counter receipt.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-600 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:bg-slate-50    transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      {/* Main Grid: Form Left, Receipt Right */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Side: Form Sections (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Customer Profile */}
          <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span>1. Customer Identity</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ">
                  Ethiopian Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="09... or +251..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 rounded-2xl bg-slate-50/80 pl-10 text-xs font-mono border-slate-200/80   focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="e.g. Abebe Kebede"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 rounded-2xl bg-slate-50/80 pl-10 text-xs font-medium border-slate-200/80   focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Services & Line Items */}
          <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>2. Services & Prints</span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100   transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Custom Item</span>
              </button>
            </div>

            {/* Quick Preset Selector Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center pr-1">Quick Add:</span>
              {PRESET_SERVICES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAddItem(preset)}
                  className="rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600    transition-all"
                >
                  + {preset.name.split(" ")[0]} ({preset.price} ETB)
                </button>
              ))}
            </div>

            {/* Line Items List */}
            <div className="space-y-3 pt-2">
              {items.map((item, idx) => {
                const lineTotal = new Decimal(item.price || 0).times(item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl bg-slate-50/80  p-3.5 border border-slate-100 "
                  >
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        disabled={item.locked}
                        onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                        className="h-9 rounded-xl bg-white  text-xs font-medium border-slate-200/80 "
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="h-9 text-center rounded-xl bg-white  text-xs font-bold border-slate-200/80 "
                        />
                      </div>

                      <div className="w-28 relative">
                        <Input
                          type="number"
                          value={item.price}
                          disabled={item.locked}
                          onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                          className="h-9 pr-6 rounded-xl bg-white  text-xs font-mono font-semibold border-slate-200/80 "
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "locked", !item.locked)}
                          className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {item.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-amber-500" />}
                        </button>
                      </div>

                      <div className="w-24 text-right font-mono text-xs font-bold text-slate-800  tabular-nums">
                        ETB {lineTotal.toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1.5 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Notes & Instructions */}
          <div className="rounded-3xl bg-white  p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100  space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Specific Photo Instructions
            </label>
            <Input
              placeholder="e.g. White background for US Visa, slight skin touch-up, pickup before 5:00 PM..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-2xl bg-slate-50/80 text-xs border-slate-200/80   focus:bg-white"
            />
          </div>
        </div>

        {/* Right Side: Sticky Apple Receipt & Payment (4 Cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#1C1F3B] to-[#121429] p-6 text-white shadow-xl shadow-indigo-950/20 border border-indigo-900/40 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold tracking-tight">Checkout Summary</h3>
              </div>
              <span className="text-[10px] font-mono text-indigo-300">Live Bill</span>
            </div>

            {/* Payment Method Selector Pills */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300/80">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 rounded-2xl p-2.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-md shadow-white/10 font-bold"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <method.icon className={`h-3.5 w-3.5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Paid Field */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-200">Amount Paid (ETB)</span>
                <button
                  type="button"
                  onClick={handleSetFull}
                  className="text-[11px] font-semibold text-amber-400 hover:underline"
                >
                  Pay Full (ETB {total.toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  className="h-11 rounded-2xl bg-white/10 border-white/10 text-white font-mono text-base font-bold pl-4 focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Financial Ledger Display */}
            <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal Items</span>
                <span className="font-mono tabular-nums">ETB {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Paid Now</span>
                <span className="font-mono tabular-nums">ETB {paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10">
                <span>Balance Due</span>
                <span className={`font-mono tabular-nums ${balance.isPositive() && !balance.isZero() ? "text-rose-400" : "text-slate-400"}`}>
                  ETB {balance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder(true)}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                <span>Save & Mark Delivered</span>
              </Button>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrder(false)}
                className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10"
              >
                <span>Save Order to Queue</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}