"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Loader2,
  Calendar as CalendarIcon,
  ChevronDown,
  Tags,
  Search,
  Package,
  Clock,
  Layers,
} from "lucide-react";

import { studioStore } from "@/lib/api/store";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DualCalendarPicker } from "@/components/calendar/DualCalendarPicker";
import {
  formatCalendarPair,
  formatDate,
  getEthiopianDateDetails,
} from "@/lib/date";
import type { PaymentMethod, Customer, PriceItem } from "@/types";

interface OrderItem {
  id: string;
  price_item_id?: string;
  name: string;
  photo_type_name?: string;
  price: number;
  quantity: number;
  locked: boolean;
}

const PAYMENT_METHODS = [
  { id: "telebirr", label: "Telebirr", icon: Smartphone, color: "from-amber-500 to-amber-600" },
  { id: "cash", label: "Cash", icon: Banknote, color: "from-emerald-500 to-emerald-600" },
  { id: "cbe_birr", label: "CBE Birr", icon: CreditCard, color: "from-violet-500 to-violet-600" },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, color: "from-blue-500 to-blue-600" },
];

const CATEGORIES = [
  { id: "all", label: "All Packages" },
  { id: "passport", label: "Passport & ID" },
  { id: "instant", label: "Instant Prints" },
  { id: "portrait", label: "Studio Portraits" },
  { id: "event", label: "Events & Graduation" },
  { id: "wedding", label: "Wedding Coverage" },
  { id: "framing", label: "Framing" },
];

function NewWalkInOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Form States
  const [phone, setPhone] = React.useState(searchParams.get("phone") || "");
  const [customerName, setCustomerName] = React.useState(searchParams.get("name") || "");
  const [customerId, setCustomerId] = React.useState(searchParams.get("customer_id") || "");
  const [notes, setNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("telebirr");
  const [transactionRef, setTransactionRef] = React.useState("");
  const [paidInput, setPaidInput] = React.useState("350");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Packages Catalog State
  const [packages, setPackages] = React.useState<PriceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [packageSearch, setPackageSearch] = React.useState("");

  // Delivery / Session Date with Calendar
  const [deliveryDate, setDeliveryDate] = React.useState<Date | null>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const [previewNumber, setPreviewNumber] = React.useState("APS-261015-043");

  React.useEffect(() => {
    setPreviewNumber(`AP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  }, []);

  // Load packages catalog dynamically from store
  React.useEffect(() => {
    try {
      const active = studioStore.getPrices().filter((p) => p.is_active !== false);
      setPackages(active);
      studioStore
        .syncPrices()
        .then((all) => setPackages(all.filter((p) => p.is_active !== false)))
        .catch(() => {});
    } catch {}
  }, []);

  // Customer auto-detection from store
  const allCustomers = React.useMemo(() => {
    try {
      return studioStore.getCustomers();
    } catch {
      return [];
    }
  }, []);

  const matchedCustomer = React.useMemo(() => {
    const clean = phone.replace(/[\s-]/g, "");
    if (!clean || clean.length < 9) return null;
    return allCustomers.find((c) => c.phone.replace(/[\s-]/g, "") === clean);
  }, [phone, allCustomers]);

  React.useEffect(() => {
    if (matchedCustomer) {
      setCustomerName(matchedCustomer.name);
      setCustomerId(matchedCustomer.id);
    }
  }, [matchedCustomer]);

  // Items State (Defaulting to first package from catalog)
  const [items, setItems] = React.useState<OrderItem[]>([
    {
      id: "item-default",
      price_item_id: "prc-1",
      name: "3x4 Passport Photo",
      photo_type_name: "3x4",
      price: 100,
      quantity: 1,
      locked: true,
    },
  ]);

  // Synchronize first item price when packages load if unmodified
  React.useEffect(() => {
    if (packages.length > 0 && items.length === 1 && items[0].id === "item-default") {
      const p1 = packages[0];
      setItems([
        {
          id: `item-${Date.now()}`,
          price_item_id: p1.id,
          name: p1.name,
          photo_type_name: p1.name,
          price: Number(p1.standard_unit_price) || 100,
          quantity: 1,
          locked: true,
        },
      ]);
      setPaidInput(String(Number(p1.standard_unit_price) || 100));
    }
  }, [packages]);

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

  // Add package from catalog
  const handleAddPackage = (pkg: PriceItem) => {
    // If item already exists, increment quantity
    const existingIndex = items.findIndex((it) => it.price_item_id === pkg.id || it.name === pkg.name);
    if (existingIndex >= 0) {
      setItems((prev) => {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: `pkg-${pkg.id}-${Date.now()}`,
        price_item_id: pkg.id,
        name: pkg.name,
        photo_type_name: pkg.name,
        price: Number(pkg.standard_unit_price) || 0,
        quantity: 1,
        locked: true,
      },
    ]);

    // Update estimated delivery date if package has turnaround
    if (pkg.turnaround_days > 0) {
      const target = new Date();
      target.setDate(target.getDate() + pkg.turnaround_days);
      setDeliveryDate(target);
    }
  };

  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: "Other / Studio Custom Service",
        photo_type_name: "Other",
        price: 500,
        quantity: 1,
        locked: false,
      },
    ]);
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
        id: `item-${Date.now()}`,
        price_item_id: packages[0]?.id || "pt-1",
        name: packages[0]?.name || "3x4 Standard Passport Photo",
        photo_type_name: "3x4",
        price: Number(packages[0]?.standard_unit_price) || 100,
        quantity: 1,
        locked: true,
      },
    ]);
    setPaidInput(packages[0]?.standard_unit_price || "100");
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
      const scheduledDateStr = deliveryDate ? formatDate(deliveryDate) : undefined;
      const deliveryNote = scheduledDateStr ? `[Scheduled/Delivery: ${scheduledDateStr}]` : "";
      const finalNotes = [notes.trim(), deliveryNote].filter(Boolean).join(" ");

      studioStore.createOrder({
        customer_id: customerId || undefined,
        customer_name: customerName.trim(),
        customer_phone: normalizedPhone,
        items: items.map((item) => {
          const catalogItem = packages.find(
            (price) => price.id === item.price_item_id || price.name === item.name
          );
          return {
            price_item_id: catalogItem?.id || item.photo_type_name || item.id,
            photo_type_name: item.photo_type_name || catalogItem?.name || item.name.trim(),
            quantity: item.quantity,
            unit_price: item.price.toFixed(2),
            notes: item.name !== item.photo_type_name ? item.name : undefined,
          };
        }),
        payment_method: paymentMethod as PaymentMethod,
        paid_amount: paid.toFixed(2),
        reference_no: transactionRef.trim() || undefined,
        notes: finalNotes || undefined,
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

  // Filter packages based on category and search
  const filteredPackages = React.useMemo(() => {
    return packages.filter((pkg) => {
      const matchesCat = selectedCategory === "all" || pkg.category === selectedCategory;
      const term = packageSearch.toLowerCase();
      const matchesTerm =
        !term ||
        pkg.name.toLowerCase().includes(term) ||
        (pkg.description || "").toLowerCase().includes(term) ||
        pkg.code.toLowerCase().includes(term);

      return matchesCat && matchesTerm;
    });
  }, [packages, selectedCategory, packageSearch]);

  const deliveryCalendarPair = deliveryDate ? formatCalendarPair(deliveryDate) : null;
  const deliveryEthDetails = deliveryDate ? getEthiopianDateDetails(deliveryDate) : null;

  return (
    <div className="mx-auto max-w-[1140px] space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <Link href="/today" className="text-[11px] font-medium text-slate-400 hover:text-slate-700">
            ← Back to today
          </Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">New Order & Booking</h1>
          <p className="text-[11px] text-slate-500">
            Select photography packages, set scheduled dates, and record payments.
          </p>
        </div>
        <div className="hidden rounded-md border border-slate-200 bg-white px-4 py-2 text-right sm:block">
          <p className="text-[9px] text-slate-400">Booking number</p>
          <p className="font-mono text-[11px] font-semibold text-slate-700">{previewNumber}</p>
        </div>
      </div>

      {formError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {formError}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          {/* STEP 1: CUSTOMER */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                  1
                </span>
                <div>
                  <h2 className="text-xs font-bold text-slate-800">Customer Details</h2>
                  <p className="text-[10px] text-slate-400">Search customer by Ethiopian phone number or add new.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomerName("");
                  setPhone("");
                  setCustomerId("");
                }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                ＋ New Customer
              </button>
            </div>
            <label className="mb-1 block text-[10px] font-medium text-slate-500">Search customer by phone</label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="09XXXXXXXX or +2519XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 rounded-md border-slate-200 pr-8 text-xs font-mono"
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">⌄</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                  {customerName ? customerName.slice(0, 2).toUpperCase() : "CU"}
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-slate-700">{customerName || "New customer profile"}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{phone || "Phone number pending"}</p>
                </div>
              </div>
              <span className="text-right text-[9px] text-slate-400">
                Outstanding balance<br />
                <b className="text-slate-700">ETB {matchedCustomer ? matchedCustomer.balance_due : "0.00"}</b>{" "}
                {matchedCustomer && Number(matchedCustomer.balance_due) > 0 ? (
                  <span className="text-red-600 font-bold">!</span>
                ) : (
                  <span className="text-emerald-600">✓</span>
                )}
              </span>
            </div>
            <label className="mt-3 mb-1 block text-[10px] font-medium text-slate-500">Customer full name</label>
            <Input
              placeholder="e.g. Abebe Kebede"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-9 rounded-md border-slate-200 text-xs"
            />
          </section>

          {/* STEP 2: PACKAGES & PRICE CATALOG INTEGRATION */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-[#e21b23]" />
                    Studio Packages Catalog
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Click any package to instantly add it to this order.
                  </p>
                </div>
              </div>

              {/* Package Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search packages..."
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                  className="h-7 w-48 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-[11px] text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                    selectedCategory === cat.id
                      ? "bg-[#e21b23] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Packages Grid */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredPackages.map((pkg) => {
                const isSelected = items.some((it) => it.price_item_id === pkg.id || it.name === pkg.name);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleAddPackage(pkg)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? "border-red-400 bg-red-50/40 ring-1 ring-red-400/30"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-[11px] font-bold text-slate-800 group-hover:text-red-600 transition leading-snug">
                          {pkg.name}
                        </h3>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          ETB {Number(pkg.standard_unit_price).toFixed(0)}
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] text-slate-500 line-clamp-2">
                        {pkg.description || "Studio photography package"}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[8.5px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {pkg.turnaround_days === 0 ? "⚡ Same Day" : `🕒 ${pkg.turnaround_days} Days`}
                      </span>
                      <span className="font-bold text-red-600 group-hover:underline">
                        {isSelected ? "＋ Add Another" : "＋ Add Package"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STEP 3: ORDER ITEMS & SCHEDULED CALENDAR DATE */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                  3
                </span>
                <div>
                  <h2 className="text-xs font-bold text-slate-800">Order Items & Quantities</h2>
                  <p className="text-[10px] text-slate-400">Review selected packages or customize item prices.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                ＋ Custom Service
              </button>
            </div>

            <div className="hidden grid-cols-[1fr_82px_100px_100px_18px] gap-2 px-2 pb-1 text-[8px] uppercase text-slate-400 sm:grid">
              <span>Package / Photo type</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span>Line total</span>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const lineTotal = new Decimal(item.price || 0).times(item.quantity || 1);
                return (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[1fr_82px_100px_100px_18px] sm:items-center"
                  >
                    <Input
                      value={item.name}
                      disabled={item.locked}
                      onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                      className="h-8 rounded-md text-[11px]"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-8 rounded-md text-center text-[11px]"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      disabled={item.locked}
                      onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                      className="h-8 rounded-md text-[11px]"
                    />
                    <span className="text-right font-mono text-[11px] font-bold text-slate-700">
                      ETB {lineTotal.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-30 transition"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Integrated Dual Calendar for Delivery / Session Date */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-[#e21b23]" />
                  Scheduled Session / Delivery Date
                </label>
                <p className="text-[9px] text-slate-400">
                  Target date for photo shoot, studio session, or print pickup.
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {deliveryCalendarPair
                      ? `${deliveryCalendarPair.gregorian} (${deliveryEthDetails?.textAm || ""})`
                      : "Pick Date"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {isCalendarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
                      onClick={() => setIsCalendarOpen(false)}
                    />
                    <div className="absolute right-0 bottom-full mb-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <DualCalendarPicker
                        selectedDate={deliveryDate}
                        onSelectDate={(d) => {
                          setDeliveryDate(d);
                          setIsCalendarOpen(false);
                        }}
                        onClose={() => setIsCalendarOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* STEP 4: PAYMENT */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                4
              </span>
              <div>
                <h2 className="text-xs font-bold text-slate-800">Payment Recording</h2>
                <p className="text-[10px] text-slate-400">Record a payment now or leave the balance due.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-500">Payment amount (ETB)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="h-9 rounded-md text-xs font-mono font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSetFull}
                    className="h-9 text-[10px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 shrink-0"
                  >
                    Full Paid
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-500">Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                >
                  <option value="telebirr">Telebirr</option>
                  <option value="cash">Cash</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <Input
                placeholder="Transaction reference (e.g. Telebirr / CBE Ref)"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="h-9 rounded-md text-xs"
              />
              <Input
                placeholder="Internal notes — visible only to studio staff"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 rounded-md text-xs"
              />
            </div>

            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-[9px] font-semibold text-emerald-700">
              ✓ ETB {paid.toFixed(2)} will be recorded as a valid payment.{" "}
              <span className="block font-normal">Remaining balance: ETB {balance.toFixed(2)}</span>
            </div>
          </section>
        </div>

        {/* SIDEBAR SUMMARY */}
        <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
          <h2 className="border-b border-slate-200 pb-3 text-xs font-bold text-slate-700">Order Summary</h2>
          <div className="space-y-2 border-b border-slate-100 py-3 text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>Items × {items.length}</span>
              <b className="text-slate-700">ETB {total.toFixed(2)}</b>
            </div>
            <div className="flex justify-between">
              <span>Payment</span>
              <b className="text-emerald-600">− ETB {paid.toFixed(2)}</b>
            </div>
          </div>
          <div className="flex justify-between py-3 text-xs font-bold text-slate-800">
            <span>Remaining balance</span>
            <span className="text-red-600">ETB {balance.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveOrder(false)}
              className="h-8 w-full rounded-md bg-[#e21b23] text-[10px] font-bold hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving Order...
                </>
              ) : (
                "Save Order"
              )}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveOrder(true)}
              variant="outline"
              className="h-8 w-full rounded-md text-[10px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Mark Delivered"
              )}
            </Button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-700 transition"
            >
              Reset Form
            </button>
          </div>

          <p className="mt-3 border-t border-slate-100 pt-3 text-[8px] text-slate-400">
            🔒 Financial records are signed and synchronized with studio daily reports.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function NewWalkInOrderPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading order form…</div>}>
      <NewWalkInOrderForm />
    </React.Suspense>
  );
}
