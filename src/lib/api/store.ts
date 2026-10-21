"use client";

import {
  Customer,
  PriceItem,
  Order,
  ClientRequest,
  Album,
  MediaFile,
  User,
  AuditLog,
  StudioSettings,
  OrderStatus,
  PaymentMethod,
} from "@/types";
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRICES,
  INITIAL_ORDERS,
  INITIAL_REQUESTS,
  INITIAL_ALBUMS,
  INITIAL_MEDIA,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
} from "./mockData";
import Decimal from "decimal.js";
import { calculateBalance, calculateLineTotal, calculateOrderTotal, toDecimal } from "../money";
import { isTodayInAddis } from "../date";
import { api } from "./client";

const STORAGE_KEY_PREFIX = "addis_studio_data_";

function isBrowser(): boolean {
  return typeof window !== "undefined" && !process.env.VITEST;
}

function getStored<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error("Storage error:", err);
  }
}

function mapBackendOrder(o: any): Order {
  const statusMap: Record<string, OrderStatus> = {
    New: "received",
    "In Progress": "in_progress",
    Ready: "ready",
    Delivered: "delivered",
    Cancelled: "voided",
  };
  const isVoid = o.voided === true || o.voided === "true" || o.voided === "TRUE";
  const status: OrderStatus = isVoid
    ? "voided"
    : statusMap[o.status] || (o.status?.toLowerCase() as OrderStatus) || "received";

  return {
    id: o.id,
    order_number: o.booking_ref || `AP-${o.booking_no || o.id.slice(-5)}`,
    customer_id: o.customer_id,
    customer: {
      id: o.customer_id,
      name: o.customer_name || "Customer",
      phone: o.customer_phone || "",
      total_orders: 1,
      total_spent: o.order_total || o.total_amount || "0.00",
      balance_due: o.balance_amount || "0.00",
      created_at: o.created_at,
      updated_at: o.created_at,
    },
    items: (o.items || []).map((it: any, idx: number) => ({
      id: it.id || `item-${idx}`,
      price_item_id: it.photo_type_id || it.price_item_id || "",
      photo_type_name: it.photo_type_name || "Service",
      quantity: Number(it.quantity || 1),
      unit_price: new Decimal(it.unit_price || 0).toFixed(2),
      line_total: new Decimal(it.line_total || 0).toFixed(2),
      notes: it.notes || undefined,
    })),
    payments: (o.payments || []).map((p: any) => ({
      id: p.id,
      order_id: o.id,
      amount: new Decimal(p.amount || 0).toFixed(2),
      payment_method: (p.method?.toLowerCase() === "telebirr"
        ? "telebirr"
        : p.method?.toLowerCase() === "bank transfer"
        ? "bank_transfer"
        : "cash") as PaymentMethod,
      reference_no: p.reference_no || undefined,
      created_by_name: p.created_by_name || "Staff",
      created_at: p.created_at || p.paid_at || new Date().toISOString(),
    })),
    total_amount: new Decimal(o.order_total || o.total_amount || 0).toFixed(2),
    paid_amount: new Decimal(o.paid_amount || 0).toFixed(2),
    balance_amount: new Decimal(o.balance_amount || 0).toFixed(2),
    status,
    notes: o.notes || undefined,
    created_by_id: o.created_by_id || "usr-1",
    created_by_name: o.created_by_name || "Staff",
    is_instant_delivery: status === "delivered",
    delivered_at: status === "delivered" ? o.created_at : null,
    void_reason: o.void_reason || null,
    voided_at: o.voided_at || null,
    voided_by: o.voided_by || null,
    created_at: o.created_at || new Date().toISOString(),
    updated_at: o.updated_at || o.created_at || new Date().toISOString(),
  };
}

let isSyncing = false;
let lastSyncTime = 0;

export const studioStore = {
  // --- Customers ---
  getCustomers: (query?: string): Customer[] => {
    const customers = getStored<Customer[]>("customers", INITIAL_CUSTOMERS);
    if (!query || !query.trim()) return customers;
    const clean = query.trim().toLowerCase();
    const phoneClean = clean.replace(/[^0-9+]/g, "");
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(clean) ||
        (phoneClean && c.phone.replace(/[^0-9+]/g, "").includes(phoneClean))
    );
  },

  getCustomerById: (id: string): Customer | undefined => {
    const customers = getStored<Customer[]>("customers", INITIAL_CUSTOMERS);
    return customers.find((c) => c.id === id);
  },

  createCustomer: (name: string, phone: string, notes?: string): Customer => {
    const customers = getStored<Customer[]>("customers", INITIAL_CUSTOMERS);
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      notes,
      total_orders: 0,
      total_spent: "0.00",
      balance_due: "0.00",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStored("customers", [newCust, ...customers]);

    if (isBrowser()) {
      api.post("/api/customers", { name, phone, notes })
        .then((res) => {
          if (res?.customer) {
            studioStore.syncCustomers().catch(() => {});
          }
        })
        .catch(console.error);
    }

    return newCust;
  },

  async syncCustomers(): Promise<Customer[]> {
    try {
      const res = await api.get<{ customers: Customer[] }>("/api/customers");
      if (res?.customers && Array.isArray(res.customers)) {
        setStored("customers", res.customers);
        return res.customers;
      }
    } catch {
      // Fallback
    }
    return studioStore.getCustomers();
  },

  // --- Prices / Photo Types ---
  getPrices: (): PriceItem[] => {
    return getStored<PriceItem[]>("prices", INITIAL_PRICES);
  },

  updatePrice: (id: string, newPrice: string): PriceItem => {
    const prices = getStored<PriceItem[]>("prices", INITIAL_PRICES);
    const updated = prices.map((p) =>
      p.id === id ? { ...p, standard_unit_price: new Decimal(newPrice || 0).toFixed(2) } : p
    );
    setStored("prices", updated);

    if (isBrowser()) {
      api.patch(`/api/photo-types/${id}`, {
        standard_price: new Decimal(newPrice || 0).toFixed(2),
      })
        .then(() => studioStore.syncPrices().catch(() => {}))
        .catch(console.error);
    }

    return updated.find((p) => p.id === id)!;
  },

  createPrice: (data: {
    name: string;
    category: PriceItem["category"];
    standard_unit_price: string;
    turnaround_days: number;
    description?: string;
  }): PriceItem => {
    const prices = getStored<PriceItem[]>("prices", INITIAL_PRICES);
    const code = data.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SRV";
    const newPrice: PriceItem = {
      id: `prc-${Date.now()}`,
      code,
      name: data.name,
      category: data.category,
      standard_unit_price: new Decimal(data.standard_unit_price || 0).toFixed(2),
      turnaround_days: data.turnaround_days,
      description: data.description,
      is_active: true,
    };
    setStored("prices", [...prices, newPrice]);

    if (isBrowser()) {
      api.post("/api/photo-types", {
        name: data.name,
        category: data.category,
        standard_unit_price: data.standard_unit_price,
        turnaround_days: data.turnaround_days,
        description: data.description,
      })
        .then(() => studioStore.syncPrices().catch(() => {}))
        .catch(console.error);
    }

    return newPrice;
  },

  deletePrice: (id: string): void => {
    const prices = getStored<PriceItem[]>("prices", INITIAL_PRICES);
    setStored("prices", prices.filter((p) => p.id !== id));

    if (isBrowser()) {
      api.delete(`/api/photo-types/${id}`)
        .then(() => studioStore.syncPrices().catch(() => {}))
        .catch(console.error);
    }
  },

  async syncPrices(): Promise<PriceItem[]> {
    try {
      const res = await api.get<{ photo_types: any[] }>("/api/photo-types?include_inactive=true");
      if (res?.photo_types && Array.isArray(res.photo_types)) {
        const mapped: PriceItem[] = res.photo_types.map((pt) => ({
          id: pt.id,
          code: pt.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SRV",
          name: pt.name,
          category: (pt.category || "portrait") as PriceItem["category"],
          standard_unit_price: pt.standard_price ? new Decimal(pt.standard_price).toFixed(2) : "0.00",
          turnaround_days: pt.turnaround_days || 1,
          description: pt.description || undefined,
          is_active: pt.active !== false,
        }));
        setStored("prices", mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
    return studioStore.getPrices();
  },

  // --- Orders ---
  getOrders: (): Order[] => {
    return getStored<Order[]>("orders", INITIAL_ORDERS);
  },

  getTodayOrders: (): Order[] => {
    const orders = getStored<Order[]>("orders", INITIAL_ORDERS);
    return orders.filter((o) => isTodayInAddis(o.created_at));
  },

  getOrderById: (id: string): Order | undefined => {
    const orders = getStored<Order[]>("orders", INITIAL_ORDERS);
    return orders.find((o) => o.id === id);
  },

  createOrder: (data: {
    customer_id?: string;
    customer_name: string;
    customer_phone: string;
    items: Array<{ price_item_id: string; photo_type_name: string; quantity: number; unit_price: string; notes?: string }>;
    payment_method: PaymentMethod;
    paid_amount: string;
    reference_no?: string;
    notes?: string;
    is_delivered?: boolean;
    created_by: { id: string; name: string };
  }): Order => {
    let customer: Customer;
    const existingCust = data.customer_id ? studioStore.getCustomerById(data.customer_id) : undefined;
    if (existingCust) {
      customer = existingCust;
    } else {
      customer = studioStore.createCustomer(data.customer_name, data.customer_phone);
    }

    const orderTotal = calculateOrderTotal(data.items);
    const balance = calculateBalance(orderTotal, data.paid_amount);

    const orderNumber = `AP-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 90000) + 10000
    )}`;

    const orderId = `ord-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customer.id,
      customer,
      items: data.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        price_item_id: it.price_item_id,
        photo_type_name: it.photo_type_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: calculateLineTotal(it.quantity, it.unit_price),
        notes: it.notes,
      })),
      payments:
        Number(data.paid_amount) > 0
          ? [
              {
                id: `pay-${Date.now()}`,
                order_id: orderId,
                amount: new Decimal(data.paid_amount || 0).toFixed(2),
                payment_method: data.payment_method,
                reference_no: data.reference_no,
                created_by_name: data.created_by.name,
                created_at: new Date().toISOString(),
              },
            ]
          : [],
      total_amount: orderTotal,
      paid_amount: toDecimal(data.paid_amount).toFixed(2),
      balance_amount: balance,
      status: data.is_delivered ? "delivered" : "received",
      notes: data.notes,
      created_by_id: data.created_by.id,
      created_by_name: data.created_by.name,
      is_instant_delivery: !!data.is_delivered,
      delivered_at: data.is_delivered ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orders = getStored<Order[]>("orders", INITIAL_ORDERS);
    setStored("orders", [newOrder, ...orders]);

    // Update customer stats locally
    const customers = getStored<Customer[]>("customers", INITIAL_CUSTOMERS);
    const updatedCustomers = customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          total_orders: c.total_orders + 1,
          total_spent: new Decimal(c.total_spent || 0).plus(orderTotal).toFixed(2),
          balance_due: new Decimal(c.balance_due || 0).plus(balance).toFixed(2),
          updated_at: new Date().toISOString(),
        };
      }
      return c;
    });
    setStored("customers", updatedCustomers);

    // Create Kanban request if not instantly delivered
    if (!data.is_delivered) {
      const requests = getStored<ClientRequest[]>("requests", INITIAL_REQUESTS);
      const newReq: ClientRequest = {
        id: `req-${Date.now()}`,
        order_id: newOrder.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        service_type: data.items.map((i) => i.photo_type_name).join(", "),
        status: "received",
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_overdue: false,
        notes: data.notes,
        assigned_to_name: data.created_by.name,
        created_at: new Date().toISOString(),
      };
      setStored("requests", [newReq, ...requests]);
    }

    // Record audit log
    studioStore.addAuditLog({
      action: data.is_delivered ? "ORDER_DELIVERED" : "ORDER_CREATED",
      actor_id: data.created_by.id,
      actor_name: data.created_by.name,
      actor_role: "staff",
      target_type: "Order",
      target_id: newOrder.id,
      details: `Created order ${newOrder.order_number} for ${customer.name}. Total: ETB ${orderTotal}`,
    });

    // Authoritative Server API Sync
    if (isBrowser()) {
      const methodMap: Record<PaymentMethod, string> = {
        cash: "Cash",
        telebirr: "Telebirr",
        bank_transfer: "Bank Transfer",
        cbe_birr: "Bank Transfer",
      };

      api.post("/api/orders", {
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        items: data.items.map((it) => ({
          photo_type_id: it.price_item_id,
          photo_type_name: it.photo_type_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          notes: it.notes,
        })),
        initial_payment:
          Number(data.paid_amount) > 0
            ? {
                amount: data.paid_amount,
                method: methodMap[data.payment_method] || "Cash",
                reference_no: data.reference_no,
              }
            : undefined,
        notes: data.notes,
        is_delivered: data.is_delivered,
      })
        .then(() => {
          studioStore.syncOrders().catch(() => {});
          studioStore.syncCustomers().catch(() => {});
        })
        .catch(console.error);
    }

    return newOrder;
  },

  voidOrder: (orderId: string, reason: string, user: { id: string; name: string }): Order => {
    const orders = getStored<Order[]>("orders", INITIAL_ORDERS);
    const target = orders.find((o) => o.id === orderId);
    if (!target) throw new Error("Order not found");

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "voided" as OrderStatus,
          void_reason: reason,
          voided_at: new Date().toISOString(),
          voided_by: user.name,
          void_logs: [
            ...(o.void_logs || []),
            {
              id: `void-${Date.now()}`,
              order_id: orderId,
              voided_by_name: user.name,
              void_reason: reason,
              voided_at: new Date().toISOString(),
            },
          ],
        };
      }
      return o;
    });

    setStored("orders", updated);

    studioStore.addAuditLog({
      action: "ORDER_VOIDED",
      actor_id: user.id,
      actor_name: user.name,
      actor_role: "admin",
      target_type: "Order",
      target_id: orderId,
      details: `Voided order ${target.order_number}. Reason: ${reason}`,
    });

    if (isBrowser()) {
      api.post(`/api/orders/${orderId}/void`, { reason })
        .then(() => studioStore.syncOrders().catch(() => {}))
        .catch(console.error);
    }

    return updated.find((o) => o.id === orderId)!;
  },

  recordPayment: (
    orderId: string,
    amount: string,
    method: PaymentMethod,
    referenceNo: string | undefined,
    user: { id: string; name: string }
  ): Order => {
    const orders = getStored<Order[]>("orders", INITIAL_ORDERS);
    const target = orders.find((o) => o.id === orderId);
    if (!target) throw new Error("Order not found");

    const newPaid = toDecimal(target.paid_amount).plus(toDecimal(amount)).toFixed(2);
    const newBalance = calculateBalance(target.total_amount, newPaid);

    const payment = {
      id: `pay-${Date.now()}`,
      order_id: orderId,
      amount: toDecimal(amount).toFixed(2),
      payment_method: method,
      reference_no: referenceNo,
      created_by_name: user.name,
      created_at: new Date().toISOString(),
    };

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paid_amount: newPaid,
          balance_amount: newBalance,
          payments: [...o.payments, payment],
        };
      }
      return o;
    });

    setStored("orders", updated);

    studioStore.addAuditLog({
      action: "PAYMENT_RECORDED",
      actor_id: user.id,
      actor_name: user.name,
      actor_role: "staff",
      target_type: "Payment",
      target_id: payment.id,
      details: `Recorded payment of ETB ${amount} via ${method} for ${target.order_number}`,
    });

    if (isBrowser()) {
      const methodMap: Record<PaymentMethod, string> = {
        cash: "Cash",
        telebirr: "Telebirr",
        bank_transfer: "Bank Transfer",
        cbe_birr: "Bank Transfer",
      };

      api.post(`/api/orders/${orderId}/payments`, {
        amount,
        method: methodMap[method] || "Cash",
        reference_no: referenceNo,
      })
        .then(() => {
          studioStore.syncOrders().catch(() => {});
          studioStore.syncCustomers().catch(() => {});
        })
        .catch(console.error);
    }

    return updated.find((o) => o.id === orderId)!;
  },

  async syncOrders(): Promise<Order[]> {
    try {
      const res = await api.get<{ orders: any[] }>("/api/orders");
      if (res?.orders && Array.isArray(res.orders)) {
        const mapped = res.orders.map(mapBackendOrder);
        setStored("orders", mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
    return studioStore.getOrders();
  },

  // --- Requests ---
  getRequests: (): ClientRequest[] => {
    return getStored<ClientRequest[]>("requests", INITIAL_REQUESTS);
  },

  updateRequestStatus: (
    id: string,
    status: "received" | "in_progress" | "ready" | "delivered"
  ): ClientRequest => {
    const requests = getStored<ClientRequest[]>("requests", INITIAL_REQUESTS);
    const updated = requests.map((r) => (r.id === id ? { ...r, status } : r));
    setStored("requests", updated);

    if (isBrowser()) {
      api.patch(`/api/requests/${id}`, { status })
        .then(() => studioStore.syncRequests().catch(() => {}))
        .catch(console.error);
    }

    return updated.find((r) => r.id === id)!;
  },

  createRequest: (data: {
    customer_name: string;
    customer_phone: string;
    service_type: string;
    due_date?: string;
    notes?: string;
    assigned_to_name?: string;
  }): ClientRequest => {
    const requests = getStored<ClientRequest[]>("requests", INITIAL_REQUESTS);
    const newReq: ClientRequest = {
      id: `req-${Date.now()}`,
      customer_id: `cust-${Date.now()}`,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      service_type: data.service_type,
      status: "received",
      due_date: data.due_date || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      is_overdue: false,
      notes: data.notes,
      assigned_to_name: data.assigned_to_name || "Studio Staff",
      created_at: new Date().toISOString(),
    };
    setStored("requests", [newReq, ...requests]);

    if (isBrowser()) {
      api.post("/api/requests", {
        title: data.service_type,
        due_date: data.due_date,
        notes: data.notes,
      })
        .then(() => studioStore.syncRequests().catch(() => {}))
        .catch(console.error);
    }

    return newReq;
  },

  async syncRequests(): Promise<ClientRequest[]> {
    try {
      const res = await api.get<{ requests: any[] }>("/api/requests");
      if (res?.requests && Array.isArray(res.requests)) {
        const mapped: ClientRequest[] = res.requests.map((r) => ({
          id: r.id,
          order_id: r.order_id || undefined,
          customer_id: r.customer_id || `cust-${r.id}`,
          customer_name: r.customer_name || "Client",
          customer_phone: r.customer_phone || "",
          service_type: r.title || r.service_type || "Photography Service",
          status: (r.status?.toLowerCase() === "done" ? "delivered" : r.status?.toLowerCase() || "received") as ClientRequest["status"],
          due_date: r.due_date || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_overdue: !!r.is_overdue,
          notes: r.description || r.notes || undefined,
          assigned_to_name: r.assigned_to_name || "Studio Staff",
          created_at: r.created_at || new Date().toISOString(),
        }));
        setStored("requests", mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
    return studioStore.getRequests();
  },

  // --- Albums ---
  getAlbums: (): Album[] => {
    return getStored<Album[]>("albums", INITIAL_ALBUMS);
  },

  getAlbumByToken: (token: string): Album | undefined => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    return albums.find((a) => a.token === token);
  },

  getAlbumById: (id: string): Album | undefined => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    return albums.find((a) => a.id === id);
  },

  updateAlbumAccess: (
    id: string,
    access: { isPrivate: boolean; pin?: string; allow_download?: boolean }
  ): Album => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const album = albums.find((item) => item.id === id);
    if (!album) throw new Error("Album not found.");

    if (access.isPrivate && access.pin && !/^\d{4,6}$/.test(access.pin)) {
      throw new Error("A private album requires a 4 to 6 digit PIN.");
    }
    if (access.isPrivate && !album.pin_set && !access.pin) {
      throw new Error("A private album requires a 4 to 6 digit PIN.");
    }

    const updated = albums.map((item) =>
      item.id === id
        ? {
            ...item,
            is_locked: access.isPrivate,
            pin_set: access.isPrivate ? (access.pin ? true : item.pin_set) : false,
            allow_download: access.allow_download !== undefined ? access.allow_download : item.allow_download,
          }
        : item
    );
    const updatedAlbum = updated.find((item) => item.id === id)!;
    if (access.isPrivate && access.pin) {
      if (typeof window !== "undefined") {
        localStorage.setItem(`addis_album_pin_${updatedAlbum.token}`, access.pin);
      }
    } else if (!access.isPrivate) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`addis_album_pin_${updatedAlbum.token}`);
      }
    }
    setStored("albums", updated);

    if (isBrowser()) {
      api.patch(`/api/albums/${id}`, {
        visibility: access.isPrivate ? "private" : "public",
        pin: access.pin,
        allow_download: access.allow_download,
      })
        .then(() => studioStore.syncAlbums().catch(() => {}))
        .catch(console.error);
    }

    return updatedAlbum;
  },

  extendAlbumRetention: (id: string, days: number = 30): Album => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const updated = albums.map((a) => {
      if (a.id === id) {
        const currentExp = new Date(a.expires_at).getTime();
        const base = currentExp > Date.now() ? currentExp : Date.now();
        const nextExp = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
        return { ...a, expires_at: nextExp };
      }
      return a;
    });
    setStored("albums", updated);

    if (isBrowser()) {
      api.post(`/api/albums/${id}/retention`, { days, extension_days: days })
        .then(() => studioStore.syncAlbums().catch(() => {}))
        .catch(console.error);
    }

    return updated.find((a) => a.id === id)!;
  },

  deleteAlbum: async (id: string): Promise<boolean> => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const updated = albums.filter((a) => a.id !== id);
    setStored("albums", updated);

    if (isBrowser()) {
      try {
        await api.delete(`/api/albums/${id}`);
        await studioStore.syncAlbums().catch(() => {});
        return true;
      } catch (err) {
        console.error("Delete album failed:", err);
        return false;
      }
    }
    return true;
  },

  createAlbum: (data: {
    title: string;
    token: string;
    customer_id?: string;
    customer_name: string;
    event_date: string;
    pin?: string;
  }): Album => {
    if (data.pin && !/^\d{4,6}$/.test(data.pin)) {
      throw new Error("Album PIN must contain 4 to 6 digits.");
    }
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const newAlb: Album = {
      id: `alb-${Date.now()}`,
      title: data.title,
      token: data.token.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      customer_id: data.customer_id || "",
      customer_name: data.customer_name,
      event_date: data.event_date,
      is_locked: !!data.pin,
      pin_set: !!data.pin,
      quota_bytes: 1073741824, // 1 GB
      used_bytes: 0,
      file_count: 0,
      allow_download: false,
      allow_zip: false,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    if (data.pin && typeof window !== "undefined") {
      localStorage.setItem(`addis_album_pin_${newAlb.token}`, data.pin);
    }
    setStored("albums", [newAlb, ...albums]);

    if (isBrowser()) {
      api.post("/api/albums", {
        id: newAlb.id,
        token: newAlb.token,
        title: data.title,
        order_id: newAlb.token,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        event_date: data.event_date,
        visibility: data.pin ? "private" : "public",
        pin: data.pin,
      })
        .then(() => studioStore.syncAlbums().catch(() => {}))
        .catch(console.error);
    }

    return newAlb;
  },

  async syncAlbums(): Promise<Album[]> {
    try {
      const res = await api.get<{ albums: any[] }>("/api/albums");
      if (res?.albums && Array.isArray(res.albums)) {
        const mapped: Album[] = res.albums.map((a) => ({
          id: a.id,
          title: a.title,
          token: a.token || a.id,
          customer_id: a.customer_id || "",
          customer_name: a.customer_name || "Customer",
          event_date: a.created_at,
          is_locked: a.visibility === "private" || !!a.pin_set,
          pin_set: !!a.pin_set,
          quota_bytes: Number(a.quota_bytes) || 1073741824,
          used_bytes: Number(a.used_bytes) || 0,
          file_count: Number(a.file_count) || 0,
          cover_image_url: a.cover_image_url || a.cover_url || undefined,
          allow_download: !!a.allow_download,

          allow_zip: !!a.allow_zip,
          expires_at: a.expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: a.created_at || new Date().toISOString(),
        }));

        const currentAlbums = getStored<Album[]>("albums", INITIAL_ALBUMS);
        const merged: Album[] = mapped.map((remote) => {
          const local = currentAlbums.find((l) => l.id === remote.id || l.token === remote.token);
          if (local) {
            return {
              ...remote,
              used_bytes: Math.max(Number(remote.used_bytes) || 0, Number(local.used_bytes) || 0),
              file_count: Math.max(Number(remote.file_count) || 0, Number(local.file_count) || 0),
              cover_image_url: remote.cover_image_url || local.cover_image_url,
            };
          }
          return remote;
        });

        for (const local of currentAlbums) {
          if (!merged.some((m) => m.id === local.id || m.token === local.token)) {
            merged.push(local);
            if (isBrowser()) {
              api.post("/api/albums", {
                id: local.id,
                token: local.token,
                title: local.title,
                customer_id: local.customer_id,
                customer_name: local.customer_name,
                event_date: local.event_date,
                visibility: local.is_locked ? "private" : "public",
                allow_download: local.allow_download,
                allow_zip: local.allow_zip,
                expires_at: local.expires_at,
              }).catch(() => {});
            }
          }
        }

        setStored("albums", merged);
        return merged;
      }
    } catch {
      // Fallback
    }
    return studioStore.getAlbums();
  },

  // --- Media Files ---
  getMediaFiles: (albumId: string): MediaFile[] => {
    const media = getStored<MediaFile[]>("media", INITIAL_MEDIA);
    return media.filter((m) => m.album_id === albumId);
  },

  addMediaFile: (albumId: string, file: MediaFile): void => {
    const media = getStored<MediaFile[]>("media", INITIAL_MEDIA);
    setStored("media", [...media, file]);

    // Update album stats
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const updatedAlbums = albums.map((a) => {
      if (a.id === albumId) {
        return {
          ...a,
          used_bytes: a.used_bytes + file.file_size,
          file_count: a.file_count + 1,
          cover_image_url: a.cover_image_url || file.url,
        };
      }
      return a;
    });
    setStored("albums", updatedAlbums);
  },

  deleteMediaFile: async (albumId: string, mediaId: string): Promise<boolean> => {
    const media = getStored<MediaFile[]>("media", INITIAL_MEDIA);
    const target = media.find((m) => m.id === mediaId);
    const updated = media.filter((m) => m.id !== mediaId);
    setStored("media", updated);

    if (target) {
      const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
      const updatedAlbums = albums.map((a) => {
        if (a.id === albumId) {
          return {
            ...a,
            used_bytes: Math.max(0, a.used_bytes - target.file_size),
            file_count: Math.max(0, a.file_count - 1),
            cover_image_url: a.cover_image_url === target.url ? undefined : a.cover_image_url,
          };
        }
        return a;
      });
      setStored("albums", updatedAlbums);
    }

    if (isBrowser()) {
      try {
        await api.delete(`/api/albums/${albumId}/media/${mediaId}`);
        await studioStore.syncAlbums().catch(() => {});
        return true;
      } catch (err) {
        console.error("Delete media file failed:", err);
        return false;
      }
    }
    return true;
  },

  setAlbumCover: (albumId: string, coverUrl: string): Album => {
    const albums = getStored<Album[]>("albums", INITIAL_ALBUMS);
    const updated = albums.map((a) => (a.id === albumId ? { ...a, cover_image_url: coverUrl } : a));
    setStored("albums", updated);

    if (isBrowser()) {
      api.patch(`/api/albums/${albumId}`, { cover_image_url: coverUrl })
        .then(() => studioStore.syncAlbums().catch(() => {}))
        .catch(console.error);
    }
    return updated.find((a) => a.id === albumId)!;
  },

  async syncMediaFiles(albumId: string): Promise<MediaFile[]> {
    try {
      const res = await api.get<{ media: any[] }>(`/api/albums/${encodeURIComponent(albumId)}/media`);
      if (res?.media && Array.isArray(res.media)) {
        const mapped: MediaFile[] = res.media.map((m) => ({
          id: m.id,
          album_id: m.album_id || albumId,
          filename: m.original_name || m.original_filename || m.filename,
          file_size: Number(m.size_bytes || m.file_size_bytes || m.file_size) || 0,
          mime_type: m.mime_type || "image/jpeg",
          url: m.data_url || m.path_web || m.url || `/api/media/stream/${m.id}`,
          thumbnail_url: m.data_url || m.path_thumb || m.thumbnail_url || m.path_web || m.url || `/api/media/stream/${m.id}`,
          data_url: m.data_url,
          upload_status: "completed" as const,
          created_at: m.created_at || new Date().toISOString(),
        }));


        const allMedia = getStored<MediaFile[]>("media", INITIAL_MEDIA);
        const currentAlbumFiles = allMedia.filter((item) => item.album_id === albumId);

        const mergedFiles: MediaFile[] = [...mapped];
        for (const local of currentAlbumFiles) {
          if (!mergedFiles.some((m) => m.id === local.id || m.filename === local.filename)) {
            mergedFiles.push(local);
          }
        }

        const others = allMedia.filter((item) => item.album_id !== albumId);
        setStored("media", [...others, ...mergedFiles]);
        return mergedFiles;
      }
    } catch {
      // Fallback
    }
    return studioStore.getMediaFiles(albumId);
  },

  // --- Users / Operators ---
  getUsers: (): User[] => {
    return getStored<User[]>("users", INITIAL_USERS);
  },

  updateUser: (id: string, updates: Partial<User>): User => {
    const users = getStored<User[]>("users", INITIAL_USERS);
    const updated = users.map((u) => {
      if (u.id === id) {
        const next = { ...u, ...updates };
        if (updates.active !== undefined) next.is_active = updates.active;
        if (updates.is_active !== undefined) next.active = updates.is_active;
        return next;
      }
      return u;
    });
    setStored("users", updated);

    if (isBrowser()) {
      api.put("/api/admin/operators", { id, ...updates })
        .then(() => studioStore.syncUsers().catch(() => {}))
        .catch(console.error);
    }

    return updated.find((u) => u.id === id)!;
  },

  async syncUsers(): Promise<User[]> {
    try {
      const res = await api.get<{ users: any[] }>("/api/admin/operators");
      if (res?.users && Array.isArray(res.users)) {
        const mapped: User[] = res.users.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email || "",
          phone: u.phone || "",
          role: u.role === "admin" ? "admin" : "staff",
          is_active: u.active !== false && u.is_active !== false,
          active: u.active !== false && u.is_active !== false,
          created_at: u.created_at || new Date().toISOString(),
        }));
        setStored("users", mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
    return studioStore.getUsers();
  },

  // --- Audit Logs ---
  getAuditLogs: (): AuditLog[] => {
    return getStored<AuditLog[]>("audit_logs", INITIAL_AUDIT_LOGS);
  },

  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp" | "ip_address">): void => {
    const logs = getStored<AuditLog[]>("audit_logs", INITIAL_AUDIT_LOGS);
    const entry: AuditLog = {
      ...log,
      id: `aud-${Date.now()}`,
      ip_address: "127.0.0.1",
      timestamp: new Date().toISOString(),
    };
    setStored("audit_logs", [entry, ...logs]);
  },

  async syncAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await api.get<{ logs: any[] }>("/api/audit-logs");
      if (res?.logs && Array.isArray(res.logs)) {
        const mapped: AuditLog[] = res.logs.map((l) => ({
          id: l.id,
          action: l.action,
          actor_id: l.user_id || "system",
          actor_name: l.user_name || "System",
          actor_role: "staff",
          target_type: l.entity_type || "System",
          target_id: l.entity_id || "",
          details: typeof l.details === "object" ? JSON.stringify(l.details) : String(l.details || ""),
          ip_address: l.ip_address || "127.0.0.1",
          timestamp: l.created_at || new Date().toISOString(),
        }));
        setStored("audit_logs", mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
    return studioStore.getAuditLogs();
  },

  // --- Settings ---
  getSettings: (): StudioSettings => {
    return getStored<StudioSettings>("settings", INITIAL_SETTINGS);
  },

  updateSettings: (newSettings: Partial<StudioSettings>): StudioSettings => {
    const current = getStored<StudioSettings>("settings", INITIAL_SETTINGS);
    const updated = { ...current, ...newSettings };
    setStored("settings", updated);

    if (isBrowser()) {
      api.put("/api/settings", newSettings)
        .then(() => studioStore.syncSettings().catch(() => {}))
        .catch(console.error);
    }

    return updated;
  },

  async syncSettings(): Promise<StudioSettings> {
    try {
      const res = await api.get<{ settings: StudioSettings }>("/api/settings");
      if (res?.settings) {
        setStored("settings", res.settings);
        return res.settings;
      }
    } catch {
      // Fallback
    }
    return studioStore.getSettings();
  },

  // --- Complete Synchronizer ---
  async syncWithServer(role?: string): Promise<void> {
    const now = Date.now();
    if (isSyncing || now - lastSyncTime < 2000) return;
    isSyncing = true;
    lastSyncTime = now;
    try {
      const promises: Promise<unknown>[] = [
        studioStore.syncCustomers(),
        studioStore.syncPrices(),
        studioStore.syncOrders(),
        studioStore.syncRequests(),
        studioStore.syncAlbums(),
        studioStore.syncSettings(),
      ];
      if (role === "admin") {
        promises.push(studioStore.syncUsers(), studioStore.syncAuditLogs());
      }
      await Promise.allSettled(promises);
    } finally {
      isSyncing = false;
    }
  },
};
