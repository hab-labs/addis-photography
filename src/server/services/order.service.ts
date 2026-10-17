import Decimal from "decimal.js";
import { db, TransactionClient } from "../db/client";
import { logAudit } from "./audit.service";
import { getPhotoTypeById, getPhotoTypeByName } from "./price.service";
import { getCustomerById, createCustomer } from "./customer.service";

export interface OrderItemInput {
  photo_type_id?: string;
  photo_type_name?: string;
  quantity: number;
  unit_price?: string | number; // Only admin can override
  notes?: string;
}

export interface CreateOrderInput {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  order_date?: string; // YYYY-MM-DD in Africa/Addis_Ababa, default today
  items: OrderItemInput[];
  notes?: string;
  payment?: {
    amount: string | number;
    method: "Cash" | "Telebirr" | "Bank Transfer" | "Card" | "Other";
    reference_no?: string;
    note?: string;
  };
  initial_payment?: {
    amount: string | number;
    method: "Cash" | "Telebirr" | "Bank Transfer" | "Card" | "Other" | string;
    reference_no?: string;
    note?: string;
  };
  is_delivered?: boolean;
}

export interface OrderDetail {
  id: string;
  booking_no: number;
  booking_ref: string; // e.g. 20260812-001
  order_date: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  status: "New" | "In Progress" | "Ready" | "Delivered" | "Cancelled";
  notes: string | null;
  order_total: string;
  paid_amount: string;
  balance_amount: string;
  voided: boolean;
  void_reason: string | null;
  created_by_name: string;
  created_at: string;
  items: Array<{
    id: string;
    photo_type_id: string;
    photo_type_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    notes: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    paid_at: string;
    reference_no: string | null;
    note: string | null;
    voided: boolean;
    void_reason: string | null;
    created_by_name: string;
  }>;
}

export function getStudioTodayDate(): string {
  // Africa/Addis_Ababa (UTC+3)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export async function createOrder(
  input: CreateOrderInput,
  actor: { id: string; name: string; role: string }
): Promise<OrderDetail> {
  const orderDate = input.order_date || getStudioTodayDate();

  // Validate items
  if (!input.items || input.items.length === 0) {
    throw new Error("An order must contain at least one item.");
  }

  // Resolve Customer
  let customerId = input.customer_id;
  if (!customerId) {
    if (!input.customer_name) throw new Error("Customer name or customer ID is required.");
    const custRes = await createCustomer(
      { name: input.customer_name, phone: input.customer_phone },
      actor,
      true
    );
    customerId = custRes.customer.id;
  }

  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error("Customer record not found.");

  // Process items & validate pricing
  const processedItems: Array<{
    photo_type_id: string;
    photo_type_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    notes?: string;
  }> = [];

  let orderTotal = new Decimal(0);

  for (const item of input.items) {
    const qty = parseInt(String(item.quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("Item quantity must be a positive integer greater than zero.");
    }

    const photoType = item.photo_type_id
      ? await getPhotoTypeById(item.photo_type_id)
      : (item.photo_type_name ? await getPhotoTypeByName(item.photo_type_name) : null);
    if (!photoType) throw new Error(`Invalid photo type: ${item.photo_type_id || item.photo_type_name}`);
    if (!photoType.active) throw new Error(`Photo type "${photoType.name}" is deactivated and cannot be selected for new orders.`);

    let unitPrice = photoType.standard_price;

    // Price override check
    if (item.unit_price !== undefined && item.unit_price !== null) {
      const requestedPrice = new Decimal(item.unit_price).toFixed(2);
      if (unitPrice !== null && requestedPrice !== unitPrice) {
        if (actor.role !== "admin") {
          throw new Error("Forbidden: Only an administrator can override photo service prices.");
        }
      }
      unitPrice = requestedPrice;
    }

    if (unitPrice === null) {
      throw new Error(
        `Photo type "${photoType.name}" has no standard price configured. An administrator must set or override the price before ordering.`
      );
    }

    const lineTotal = new Decimal(qty).times(new Decimal(unitPrice));
    orderTotal = orderTotal.plus(lineTotal);

    processedItems.push({
      photo_type_id: photoType.id,
      photo_type_name: photoType.name,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal.toFixed(2),
      notes: item.notes,
    });
  }

  // Validate initial payment if present
  const paymentInput = input.payment || (input as any).initial_payment;
  let initialPaid = new Decimal(0);
  if (paymentInput && Number(paymentInput.amount) > 0) {
    initialPaid = new Decimal(paymentInput.amount);
    if (initialPaid.isNegative()) {
      throw new Error("Payment amount cannot be negative.");
    }
    if (initialPaid.greaterThan(orderTotal)) {
      throw new Error(
        `Payment (ETB ${initialPaid.toFixed(2)}) cannot exceed the order balance (ETB ${orderTotal.toFixed(2)}).`
      );
    }
  }

  const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const status = input.is_delivered ? "Delivered" : "New";

  // Execute in Transaction to guarantee atomic sequential daily booking number
  const bookingNo = await db.transaction(async (txClient: TransactionClient) => {
    // Lock table for date & get max booking number
    const maxRes = await txClient.query(
      `SELECT COALESCE(MAX(booking_no), 0) as max_no FROM orders WHERE order_date = $1`,
      [orderDate]
    );
    const nextBookingNo = (maxRes.rows[0]?.max_no || 0) + 1;

    // Insert Order
    await txClient.query(
      `INSERT INTO orders (id, customer_id, order_date, booking_no, status, notes, created_by, voided, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW(), NOW())`,
      [orderId, customerId, orderDate, nextBookingNo, status, input.notes || null, actor.id]
    );

    // Insert Items
    for (const item of processedItems) {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await txClient.query(
        `INSERT INTO order_items (id, order_id, photo_type_id, photo_type_name, quantity, unit_price, line_total, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          itemId,
          orderId,
          item.photo_type_id,
          item.photo_type_name,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.notes || null,
        ]
      );
    }

    // Insert Payment if present
    if (initialPaid.isPositive() && paymentInput) {
      const payId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await txClient.query(
        `INSERT INTO payments (id, order_id, amount, method, paid_at, payment_date, reference_no, note, created_by, voided, created_at)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, FALSE, NOW())`,
        [
          payId,
          orderId,
          initialPaid.toFixed(2),
          paymentInput.method,
          orderDate,
          paymentInput.reference_no || (paymentInput as any).reference || null,
          paymentInput.note || (paymentInput as any).notes || null,
          actor.id,
        ]
      );
    }

    return nextBookingNo;
  });

  const bookingRef = `${orderDate.replace(/-/g, "")}-${String(bookingNo).padStart(3, "0")}`;

  await logAudit(actor, "ORDER_CREATED", "Order", orderId, {
    booking_no: bookingNo,
    booking_ref: bookingRef,
    order_date: orderDate,
    customer: customer.name,
    order_total: orderTotal.toFixed(2),
    paid: initialPaid.toFixed(2),
  });

  return (await getOrderById(orderId))!;
}

export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const orderRes = await db.query(
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.name as created_by_name
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     JOIN users u ON o.created_by = u.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderRes.rows.length === 0) return null;
  const o = orderRes.rows[0];

  const itemsRes = await db.query(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );

  const paymentsRes = await db.query(
    `SELECT p.*, u.name as created_by_name
     FROM payments p
     JOIN users u ON p.created_by = u.id
     WHERE p.order_id = $1
     ORDER BY p.paid_at ASC`,
    [orderId]
  );

  let orderTotal = new Decimal(0);
  itemsRes.rows.forEach((it) => {
    orderTotal = orderTotal.plus(new Decimal(it.line_total));
  });

  let totalPaid = new Decimal(0);
  paymentsRes.rows.forEach((p) => {
    const isVoided = p.voided === true || p.voided === "true" || p.voided === "TRUE";
    if (!isVoided) {
      totalPaid = totalPaid.plus(new Decimal(p.amount));
    }
  });

  const balance = Decimal.max(0, orderTotal.minus(totalPaid));
  const dateStr = typeof o.order_date === "string" ? o.order_date.split("T")[0] : getStudioTodayDate();
  const bookingRef = `${dateStr.replace(/-/g, "")}-${String(o.booking_no).padStart(3, "0")}`;

  return {
    id: o.id,
    booking_no: o.booking_no,
    booking_ref: bookingRef,
    order_date: dateStr,
    customer_id: o.customer_id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    status: o.status,
    notes: o.notes,
    order_total: orderTotal.toFixed(2),
    paid_amount: totalPaid.toFixed(2),
    balance_amount: balance.toFixed(2),
    voided: o.voided === true || o.voided === "true" || o.voided === "TRUE",
    void_reason: o.void_reason,
    created_by_name: o.created_by_name,
    created_at: o.created_at,
    items: itemsRes.rows.map((it) => ({
      id: it.id,
      photo_type_id: it.photo_type_id,
      photo_type_name: it.photo_type_name,
      quantity: it.quantity,
      unit_price: new Decimal(it.unit_price).toFixed(2),
      line_total: new Decimal(it.line_total).toFixed(2),
      notes: it.notes,
    })),
    payments: paymentsRes.rows.map((p) => ({
      id: p.id,
      amount: new Decimal(p.amount).toFixed(2),
      method: p.method,
      paid_at: p.paid_at,
      reference_no: p.reference_no,
      note: p.note,
      voided: p.voided === true || p.voided === "true" || p.voided === "TRUE",
      void_reason: p.void_reason,
      created_by_name: p.created_by_name,
    })),
  };
}

export async function listOrders(filters: {
  date?: string;
  status?: string;
  payment_method?: string;
  photo_type_id?: string;
  unpaid_only?: boolean;
  search?: string;
}): Promise<OrderDetail[]> {
  let sql = `SELECT id FROM orders WHERE 1=1`;
  const params: any[] = [];

  if (filters.date) {
    sql += ` AND order_date = $${params.length + 1}`;
    params.push(filters.date);
  }

  if (filters.status && filters.status !== "all") {
    sql += ` AND status = $${params.length + 1}`;
    params.push(filters.status);
  }

  sql += ` ORDER BY order_date DESC, booking_no DESC LIMIT 200`;
  const res = await db.query(sql, params);

  const orders = await Promise.all(res.rows.map((r) => getOrderById(r.id)));
  let validOrders = orders.filter((o): o is OrderDetail => o !== null);

  // Apply in-memory secondary filters
  if (filters.unpaid_only) {
    validOrders = validOrders.filter((o) => Number(o.balance_amount) > 0);
  }

  if (filters.payment_method && filters.payment_method !== "all") {
    validOrders = validOrders.filter((o) =>
      o.payments.some((p) => !p.voided && p.method.toLowerCase() === filters.payment_method!.toLowerCase())
    );
  }

  if (filters.photo_type_id && filters.photo_type_id !== "all") {
    validOrders = validOrders.filter((o) =>
      o.items.some((it) => it.photo_type_id === filters.photo_type_id || it.photo_type_name === filters.photo_type_id)
    );
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    validOrders = validOrders.filter(
      (o) =>
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q)) ||
        o.booking_ref.toLowerCase().includes(q)
    );
  }

  return validOrders;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderDetail["status"],
  actor: { id: string; name: string; role: string },
  confirmationAcknowledgeBalance = false
): Promise<OrderDetail> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Order not found.");

  if (order.status === newStatus) return order;

  // Validation rules (Spec 3.5)
  if (newStatus === "Cancelled") {
    if (actor.role !== "admin") {
      throw new Error("Forbidden: Only administrators can cancel orders.");
    }
    if (order.status === "Delivered") {
      throw new Error("Delivered orders cannot be cancelled.");
    }
  }

  if (order.status === "Delivered" && actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can alter the status of delivered orders.");
  }

  if (newStatus === "Delivered") {
    const balance = new Decimal(order.balance_amount);
    if (balance.isPositive() && !confirmationAcknowledgeBalance) {
      throw new Error(
        `Warning: This order has an outstanding balance of ETB ${balance.toFixed(2)}. Delivery requires explicit balance confirmation.`
      );
    }
  }

  await db.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, orderId]
  );

  await logAudit(actor, "ORDER_STATUS_CHANGED", "Order", orderId, {
    old_status: order.status,
    new_status: newStatus,
  });

  return (await getOrderById(orderId))!;
}

export async function voidOrder(
  orderId: string,
  reason: string,
  actor: { id: string; name: string; role: string }
): Promise<OrderDetail> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can void orders.");
  }

  const cleanReason = reason ? reason.trim() : "";
  if (!cleanReason) {
    throw new Error("A mandatory reason is required to void an order.");
  }

  const order = await getOrderById(orderId);
  if (!order) throw new Error("Order not found.");

  await db.query(
    `UPDATE orders SET voided = TRUE, void_reason = $1, voided_at = NOW(), voided_by = $2, updated_at = NOW() WHERE id = $3`,
    [cleanReason, actor.id, orderId]
  );

  await logAudit(actor, "ORDER_VOIDED", "Order", orderId, {
    booking_no: order.booking_no,
    reason: cleanReason,
  });

  return (await getOrderById(orderId))!;
}

export const orderService = {
  listOrders: async (filters: any) => {
    return listOrders(filters || {});
  },
  getOrderById,
  createOrder: async (input: any, userIdOrActor?: string | { id: string; name: string; role: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff", role: "staff" } : (userIdOrActor || { id: "system", name: "Staff", role: "staff" });
    return createOrder(input, actor);
  },
  updateOrderStatus: async (orderId: string, status: any, notes?: string, userIdOrActor?: string | { id: string; name: string; role: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff", role: "staff" } : (userIdOrActor || { id: "system", name: "Staff", role: "staff" });
    return updateOrderStatus(orderId, status, actor, true);
  },
  voidOrder: async (orderId: string, reason: string, userIdOrActor?: string | { id: string; name: string; role: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Admin", role: "admin" } : (userIdOrActor || { id: "system", name: "Admin", role: "admin" });
    return voidOrder(orderId, reason, actor);
  },
};

