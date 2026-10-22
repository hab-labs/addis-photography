"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Decimal from "decimal.js";
import { Trash2, Loader2, ArrowLeft } from "lucide-react";

import { studioStore } from "@/lib/api/store";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/date";
import type { PaymentMethod, Customer, PriceItem } from "@/types";

interface OrderItemRow {
  id: string;
  price_item_id: string;
  photo_type_name: string;
  price: number;
  quantity: number;
}

const DEFAULT_PHOTO_TYPES = [
  { id: "prc-1", name: "3x4", price: 100 },
  { id: "prc-2", name: "10x15", price: 100 },
  { id: "prc-3", name: "13x18", price: 400 },
  { id: "prc-4", name: "20x25", price: 600 },
  { id: "prc-5", name: "30x45", price: 800 },
  { id: "prc-6", name: "Other", price: 500 },
];

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();

  // Price Catalog
  const [catalog, setCatalog] = React.useState<PriceItem[]>([]);

  // Customer State
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("phone") || searchParams.get("name") || "");
  const [customerName, setCustomerName] = React.useState(searchParams.get("name") || "");
  const [customerPhone, setCustomerPhone] = React.useState(searchParams.get("phone") || "");
  const [customerId, setCustomerId] = React.useState(searchParams.get("customer_id") || "");
  const [isNewCustomerManual, setIsNewCustomerManual] = React.useState(false);

  // Form State
  const [notes, setNotes] = React.useState("");
  const [paidInput, setPaidInput] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("telebirr");
  const [referenceNo, setReferenceNo] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Booking numbering (Specification 3.4 & 6.5: e.g. Booking #4 · 12/08/2026)
  const [bookingNumberToday, setBookingNumberToday] = React.useState(1);
  const todayFormatted = React.useMemo(() => formatDate(new Date()), []);

  // Load Catalog and today order count
  React.useEffect(() => {
    try {
      const activePrices = studioStore.getPrices().filter((p) => p.is_active !== false);
      setCatalog(activePrices);
      studioStore
        .syncPrices()
        .then((all) => setCatalog(all.filter((p) => p.is_active !== false)))
        .catch(() => {});

      const todayOrders = studioStore.getTodayOrders();
      setBookingNumberToday(todayOrders.length + 1);
    } catch {}
  }, []);

  // Customer auto-matching from store
  const allCustomers = React.useMemo(() => {
    try {
      return studioStore.getCustomers();
    } catch {
      return [];
    }
  }, []);

  const matchedCustomer = React.useMemo(() => {
    const clean = searchQuery.trim().toLowerCase();
    if (!clean || clean.length < 3) return null;
    return (
      allCustomers.find(
        (c) =>
          c.phone.replace(/[\s-]/g, "").includes(clean.replace(/[\s-]/g, "")) ||
          c.name.toLowerCase().includes(clean)
      ) || null
    );
  }, [searchQuery, allCustomers]);

  React.useEffect(() => {
    if (matchedCustomer && !isNewCustomerManual) {
      setCustomerName(matchedCustomer.name);
      setCustomerPhone(matchedCustomer.phone);
      setCustomerId(matchedCustomer.id);
    }
  }, [matchedCustomer, isNewCustomerManual]);

  // Items State (Section 6.5: Photo type, Qty, Unit price, Line total)
  const [items, setItems] = React.useState<OrderItemRow[]>([
    {
      id: "item-1",
      price_item_id: "prc-1",
      photo_type_name: "3x4",
      price: 100,
      quantity: 4,
    },
  ]);

  // Synchronize item prices once catalog loads
  React.useEffect(() => {
    if (catalog.length > 0) {
      setItems((prev) =>
        prev.map((it) => {
          const match = catalog.find((c) => c.id === it.price_item_id || c.name === it.photo_type_name);
          if (match && it.id === "item-1") {
            return {
              ...it,
              price_item_id: match.id,
              photo_type_name: match.name,
              price: Number(match.standard_unit_price) || it.price,
            };
          }
          return it;
        })
      );
    }
  }, [catalog]);

  // Available photo types for dropdown
  const availablePhotoTypes = React.useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map((c) => ({
        id: c.id,
        name: c.name,
        price: Number(c.standard_unit_price) || 0,
      }));
    }
    return DEFAULT_PHOTO_TYPES;
  }, [catalog]);

  // Reactive Totals
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

  const handleAddItem = () => {
    const firstType = availablePhotoTypes[0];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        price_item_id: firstType.id,
        photo_type_name: firstType.name,
        price: firstType.price,
        quantity: 1,
      },
    ]);
  };

  const handlePhotoTypeChange = (index: number, newTypeName: string) => {
    const matched = availablePhotoTypes.find((p) => p.name === newTypeName);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        photo_type_name: newTypeName,
        price_item_id: matched?.id || copy[index].price_item_id,
        price: matched ? matched.price : copy[index].price,
      };
      return copy;
    });
  };

  const handleUpdateItem = (index: number, field: keyof OrderItemRow, val: any) => {
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

  const handleSaveOrder = (markDelivered: boolean = false) => {
    const finalPhone = (isNewCustomerManual ? customerPhone : matchedCustomer?.phone || customerPhone || searchQuery).replace(/[\s-]/g, "");
    const finalName = (isNewCustomerManual ? customerName : matchedCustomer?.name || customerName || searchQuery).trim();

    if (!finalName) {
      setFormError("Customer name is required.");
      return;
    }

    const validPhone = /^(09\d{8}|\+2519\d{8})$/.test(finalPhone);
    if (!validPhone) {
      setFormError("Enter a valid Ethiopian phone number (09XXXXXXXX or +2519XXXXXXXX).");
      return;
    }

    if (items.some((it) => it.quantity < 1 || it.price < 0)) {
      setFormError("Check item quantities and prices.");
      return;
    }

    if (paid.isNegative()) {
      setFormError("Payment cannot be negative.");
      return;
    }

    // Specification 6.5: "Save is blocked with a clear message if the payment exceeds the total."
    if (paid.greaterThan(total)) {
      setFormError("Payment cannot exceed the order total.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      studioStore.createOrder({
        customer_id: customerId || undefined,
        customer_name: finalName,
        customer_phone: finalPhone,
        items: items.map((item) => ({
          price_item_id: item.price_item_id,
          photo_type_name: item.photo_type_name,
          quantity: item.quantity,
          unit_price: item.price.toFixed(2),
          notes: undefined,
        })),
        payment_method: paymentMethod,
        paid_amount: paid.toFixed(2),
        reference_no: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        is_delivered: markDelivered,
        created_by: {
          id: user?.id || "usr-current",
          name: user?.name || "Staff",
        },
      });

      router.push("/today");
    } catch (err) {
      setIsSubmitting(false);
      setFormError(err instanceof Error ? err.message : "Failed to save order.");
    }
  };

  return (
    <div className="mx-auto max-w-[860px] space-y-4">
      {/* HEADER: Specification 6.5 */}
      {/* New Order                                        Booking #4 · 12/08/2026 */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Link href="/today" className="text-slate-400 hover:text-slate-700 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">New Order</h1>
        </div>
        <div className="font-mono text-xs font-bold text-slate-700">
          Booking #{bookingNumberToday} · {todayFormatted}
        </div>
      </div>

      {formError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </div>
      )}

      {/* CUSTOMER SECTION: Specification 6.5 */}
      {/* Customer:  [ Search name or phone…              ]   [+ New customer]     */}
      {/*            Meron T. · 0922… · Owes ETB 80.00 (1 order)                   */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700">Customer:</label>
          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <Input
              type="text"
              placeholder="Search name or phone…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (isNewCustomerManual) setCustomerPhone(e.target.value);
              }}
              className="h-8 text-xs font-medium"
            />
            <button
              type="button"
              onClick={() => {
                setIsNewCustomerManual((v) => !v);
                setCustomerId("");
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold shrink-0 transition ${
                isNewCustomerManual
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isNewCustomerManual ? "✕ Existing search" : "+ New customer"}
            </button>
          </div>
        </div>

        {/* Customer Status line */}
        {isNewCustomerManual ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-medium text-slate-500">Full Name *</label>
              <Input
                placeholder="Customer full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500">Phone (09XXXXXXXX) *</label>
              <Input
                placeholder="09XXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        ) : matchedCustomer ? (
          <div className="text-xs text-slate-600 bg-slate-50 rounded px-2.5 py-1.5 flex items-center justify-between">
            <span>
              <b>{matchedCustomer.name}</b> · {matchedCustomer.phone}
            </span>
            <span className={Number(matchedCustomer.balance_due) > 0 ? "text-red-600 font-bold" : "text-emerald-700 font-medium"}>
              Owes ETB {matchedCustomer.balance_due} ({matchedCustomer.total_orders} orders)
            </span>
          </div>
        ) : searchQuery.length >= 3 ? (
          <div className="text-xs text-slate-400 italic">
            No existing customer matched &quot;{searchQuery}&quot;. Click &quot;+ New customer&quot; to create profile.
          </div>
        ) : null}
      </div>

      {/* ITEMS SECTION: Specification 6.5 */}
      {/* Items                                                                    */}
      {/*  Photo type   Qty   Unit price     Line total                            */}
      {/*  [3x4     ▾]  [ 4]  [ 50.00 ]      200.00              [🗑]              */}
      {/*  [+ Add item]                                                            */}
      {/*                                                  Total:  ETB 360.00      */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Items</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
              <tr>
                <th className="pb-2 w-48">Photo type</th>
                <th className="pb-2 w-20 text-center">Qty</th>
                <th className="pb-2 w-28 text-right">Unit price</th>
                <th className="pb-2 w-28 text-right">Line total</th>
                <th className="pb-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const lineTotal = new Decimal(item.price || 0).times(item.quantity || 1);
                return (
                  <tr key={item.id} className="group">
                    {/* Photo type dropdown */}
                    <td className="py-2 pr-2">
                      <select
                        value={item.photo_type_name}
                        onChange={(e) => handlePhotoTypeChange(idx, e.target.value)}
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-red-500"
                      >
                        {availablePhotoTypes.map((pt) => (
                          <option key={pt.id} value={pt.name}>
                            {pt.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-1 text-center">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 w-16 text-center text-xs mx-auto"
                      />
                    </td>

                    {/* Unit price (Read-only for Staff, editable by Admin, Specification 6.5) */}
                    <td className="py-2 px-1 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={item.price}
                        onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                        className={`h-8 w-24 text-right text-xs font-mono ml-auto ${
                          !isAdmin ? "bg-slate-50 text-slate-600 cursor-not-allowed" : ""
                        }`}
                        title={!isAdmin ? "Unit price is configured in Admin Price List" : "Edit price"}
                      />
                    </td>

                    {/* Line total */}
                    <td className="py-2 pl-2 text-right font-mono font-bold text-slate-900">
                      ETB {lineTotal.toFixed(2)}
                    </td>

                    {/* Delete button */}
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-30 transition p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="h-8 text-xs font-semibold"
          >
            + Add item
          </Button>

          <div className="text-right">
            <span className="text-xs text-slate-500 mr-2">Total:</span>
            <span className="font-mono text-base font-bold text-slate-900">
              ETB {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* PAYMENT & NOTES: Specification 6.5 */}
      {/* Payment now (optional)                                                   */}
      {/*  Amount [ 200.00 ]  Method [Cash ▾]  Reference [ optional ]              */}
      {/*                                                  Balance: ETB 160.00     */}
      {/* Notes: [                                                    ]            */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Payment now (optional)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-1">Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-1">Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-red-500"
            >
              <option value="cash">Cash</option>
              <option value="telebirr">Telebirr</option>
              <option value="cbe_birr">CBE Birr</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-500 block mb-1">Reference (optional)</label>
            <Input
              placeholder="e.g. Telebirr code"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <span className="text-xs text-slate-500 mr-2">Balance:</span>
          <span className={`font-mono text-sm font-bold ${balance.greaterThan(0) ? "text-[#e21b23]" : "text-emerald-700"}`}>
            ETB {balance.toFixed(2)}
          </span>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-500 block mb-1">Notes</label>
          <Input
            placeholder="Studio instructions or customer notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* ACTIONS: Specification 6.5 */}
      {/*  [ Save ]   [ Save & mark delivered ]   [ Cancel ]                       */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSaveOrder(false)}
          className="h-9 px-5 bg-[#e21b23] text-white text-xs font-bold hover:bg-red-700 shadow-xs"
        >
          {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>

        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSaveOrder(true)}
          variant="outline"
          className="h-9 px-4 text-xs font-semibold"
        >
          Save &amp; mark delivered
        </Button>

        <Link
          href="/today"
          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 transition px-3 py-1.5"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading order form…</div>}>
      <NewOrderForm />
    </React.Suspense>
  );
}
