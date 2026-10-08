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
  DailyReport,
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
import { calculateBalance, calculateLineTotal, calculateOrderTotal } from "../money";
import { isTodayInAddis } from "../date";

const STORAGE_KEY_PREFIX = "addis_studio_data_";

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

export const studioStore = {
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
    return newCust;
  },

  getPrices: (): PriceItem[] => {
    return getStored<PriceItem[]>("prices", INITIAL_PRICES);
  },

  updatePrice: (id: string, newPrice: string): PriceItem => {
    const prices = getStored<PriceItem[]>("prices", INITIAL_PRICES);
    const updated = prices.map((p) =>
      p.id === id ? { ...p, standard_unit_price: Number(newPrice).toFixed(2) } : p
    );
    setStored("prices", updated);
    return updated.find((p) => p.id === id)!;
  },

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

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
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
                order_id: `ord-${Date.now()}`,
                amount: Number(data.paid_amount).toFixed(2),
                payment_method: data.payment_method,
                created_by_name: data.created_by.name,
                created_at: new Date().toISOString(),
              },
            ]
          : [],
      total_amount: orderTotal,
      paid_amount: Number(data.paid_amount).toFixed(2),
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

    // Update customer stats
    const customers = getStored<Customer[]>("customers", INITIAL_CUSTOMERS);
    const updatedCustomers = customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          total_orders: c.total_orders + 1,
          total_spent: (Number(c.total_spent) + Number(orderTotal)).toFixed(2),
          balance_due: (Number(c.balance_due) + Number(balance)).toFixed(2),
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

    const newPaid = (Number(target.paid_amount) + Number(amount)).toFixed(2);
    const newBalance = calculateBalance(target.total_amount, newPaid);

    const payment = {
      id: `pay-${Date.now()}`,
      order_id: orderId,
      amount: Number(amount).toFixed(2),
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

    return updated.find((o) => o.id === orderId)!;
  },

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
    return updated.find((r) => r.id === id)!;
  },

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

  createAlbum: (data: {
    title: string;
    token: string;
    customer_id: string;
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
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      event_date: data.event_date,
      is_locked: !!data.pin,
      pin_set: !!data.pin,
      quota_bytes: 1073741824, // 1 GB
      used_bytes: 0,
      file_count: 0,
      allow_download: true,
      allow_zip: true,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    if (data.pin) {
      localStorage.setItem(`addis_album_pin_${newAlb.token}`, data.pin);
    }
    setStored("albums", [newAlb, ...albums]);
    return newAlb;
  },

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

  getUsers: (): User[] => {
    return getStored<User[]>("users", INITIAL_USERS);
  },

  updateUser: (id: string, updates: Partial<User>): User => {
    const users = getStored<User[]>("users", INITIAL_USERS);
    const updated = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setStored("users", updated);
    return updated.find((u) => u.id === id)!;
  },

  getAuditLogs: (): AuditLog[] => {
    return getStored<AuditLog[]>("audit_logs", INITIAL_AUDIT_LOGS);
  },

  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp" | "ip_address">): void => {
    const logs = getStored<AuditLog[]>("audit_logs", INITIAL_AUDIT_LOGS);
    const entry: AuditLog = {
      ...log,
      id: `aud-${Date.now()}`,
      ip_address: "192.168.1.50",
      timestamp: new Date().toISOString(),
    };
    setStored("audit_logs", [entry, ...logs]);
  },

  getSettings: (): StudioSettings => {
    return getStored<StudioSettings>("settings", INITIAL_SETTINGS);
  },

  updateSettings: (newSettings: Partial<StudioSettings>): StudioSettings => {
    const current = getStored<StudioSettings>("settings", INITIAL_SETTINGS);
    const updated = { ...current, ...newSettings };
    setStored("settings", updated);
    return updated;
  },
};
