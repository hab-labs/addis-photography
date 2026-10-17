import Decimal from "decimal.js";
import { db } from "../db/client";
import { logAudit } from "./audit.service";

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  archived: boolean;
  total_orders?: number;
  total_spent?: string;
  balance_due?: string;
  created_at: string;
  updated_at: string;
}

export function normalizeEthiopianPhone(phone?: string | null): string | null {
  if (!phone || !phone.trim()) return null;
  const clean = phone.trim().replace(/[\s\-()]/g, "");

  // +2519XXXXXXXX
  if (/^\+2519\d{8}$/.test(clean)) {
    return clean;
  }
  // 09XXXXXXXX
  if (/^09\d{8}$/.test(clean)) {
    return `+251${clean.substring(1)}`;
  }
  // 9XXXXXXXX
  if (/^9\d{8}$/.test(clean)) {
    return `+251${clean}`;
  }

  throw new Error(
    "Invalid Ethiopian phone number. Please enter in format 09XXXXXXXX, 9XXXXXXXX, or +2519XXXXXXXX."
  );
}

export async function searchCustomers(query?: string): Promise<CustomerRecord[]> {
  let sql = `SELECT * FROM customers WHERE archived = FALSE`;
  const params: any[] = [];

  if (query && query.trim()) {
    const q = query.trim();
    sql += ` AND (LOWER(name) LIKE $1 OR phone LIKE $1)`;
    params.push(`%${q.toLowerCase()}%`);
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`;
  const res = await db.query<CustomerRecord>(sql, params);

  // Compute live balances
  const customersWithBalances = await Promise.all(
    res.rows.map(async (c) => {
      const balance = await getCustomerBalance(c.id);
      return {
        ...c,
        balance_due: balance.balanceDue,
        total_spent: balance.totalSpent,
        total_orders: balance.orderCount,
      };
    })
  );

  return customersWithBalances;
}

export async function getCustomerById(id: string): Promise<CustomerRecord | null> {
  const res = await db.query<CustomerRecord>(`SELECT * FROM customers WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;

  const customer = res.rows[0];
  const balance = await getCustomerBalance(customer.id);

  return {
    ...customer,
    balance_due: balance.balanceDue,
    total_spent: balance.totalSpent,
    total_orders: balance.orderCount,
  };
}

export async function getCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const normalized = normalizeEthiopianPhone(phone);
  if (!normalized) return null;

  const res = await db.query<CustomerRecord>(
    `SELECT * FROM customers WHERE phone = $1 AND archived = FALSE`,
    [normalized]
  );
  return res.rows[0] || null;
}

export async function createCustomer(
  input: { name: string; phone?: string | null; notes?: string | null },
  actor: { id: string; name: string },
  allowDuplicatePhone = false
): Promise<{ customer: CustomerRecord; warning?: string }> {
  const cleanName = input.name.trim();
  if (!cleanName) {
    throw new Error("Customer name is required.");
  }

  const normalizedPhone = input.phone ? normalizeEthiopianPhone(input.phone) : null;

  // Check duplicate phone
  if (normalizedPhone) {
    const existing = await getCustomerByPhone(normalizedPhone);
    if (existing) {
      if (!allowDuplicatePhone) {
        return {
          customer: existing,
          warning: `A customer with phone number ${normalizedPhone} already exists: "${existing.name}". Would you like to use this record?`,
        };
      }
    }
  }

  const customerId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await db.query(
    `INSERT INTO customers (id, name, phone, notes, archived, created_at, updated_at)
     VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())`,
    [customerId, cleanName, normalizedPhone, input.notes || null]
  );

  await logAudit(actor, "CUSTOMER_CREATED", "Customer", customerId, {
    name: cleanName,
    phone: normalizedPhone,
  });

  const created = await getCustomerById(customerId);
  return { customer: created! };
}

export async function updateCustomer(
  id: string,
  input: { name?: string; phone?: string | null; notes?: string | null },
  actor: { id: string; name: string }
): Promise<CustomerRecord> {
  const existing = await getCustomerById(id);
  if (!existing) throw new Error("Customer not found.");

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Customer name cannot be empty.");

  let phone = existing.phone;
  if (input.phone !== undefined) {
    phone = input.phone ? normalizeEthiopianPhone(input.phone) : null;
  }

  const notes = input.notes !== undefined ? input.notes : existing.notes;

  await db.query(
    `UPDATE customers SET name = $1, phone = $2, notes = $3, updated_at = NOW() WHERE id = $4`,
    [name, phone, notes, id]
  );

  await logAudit(actor, "CUSTOMER_UPDATED", "Customer", id, {
    old: { name: existing.name, phone: existing.phone },
    new: { name, phone },
  });

  return (await getCustomerById(id))!;
}

export async function deleteOrArchiveCustomer(
  id: string,
  actor: { id: string; name: string; role: string }
): Promise<{ action: "deleted" | "archived" }> {
  if (actor.role !== "admin") {
    throw new Error("Only administrators can delete or archive customers.");
  }

  const existing = await getCustomerById(id);
  if (!existing) throw new Error("Customer not found.");

  // Check associations
  const orders = await db.query(`SELECT id FROM orders WHERE customer_id = $1`, [id]);
  const requests = await db.query(`SELECT id FROM requests WHERE customer_id = $1`, [id]);
  const albums = await db.query(`SELECT id FROM albums WHERE customer_id = $1`, [id]);

  if (orders.rows.length === 0 && requests.rows.length === 0 && albums.rows.length === 0) {
    await db.query(`DELETE FROM customers WHERE id = $1`, [id]);
    await logAudit(actor, "CUSTOMER_DELETED", "Customer", id, { name: existing.name });
    return { action: "deleted" };
  }

  // Has historical records -> Archive instead
  await db.query(`UPDATE customers SET archived = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
  await logAudit(actor, "CUSTOMER_ARCHIVED", "Customer", id, { name: existing.name });
  return { action: "archived" };
}

export async function getCustomerBalance(
  customerId: string
): Promise<{ totalSpent: string; balanceDue: string; orderCount: number }> {
  // Query orders and payments
  const ordersRes = await db.query(
    `SELECT o.id, o.status, o.voided
     FROM orders o
     WHERE o.customer_id = $1 AND o.status != 'Cancelled' AND o.voided = FALSE`,
    [customerId]
  );

  if (ordersRes.rows.length === 0) {
    return { totalSpent: "0.00", balanceDue: "0.00", orderCount: 0 };
  }

  let totalSpent = new Decimal(0);
  let totalPaid = new Decimal(0);

  for (const o of ordersRes.rows) {
    // Get items total
    const itemsRes = await db.query(
      `SELECT SUM(line_total) as total FROM order_items WHERE order_id = $1`,
      [o.id]
    );
    const orderTotal = new Decimal(itemsRes.rows[0]?.total || 0);
    totalSpent = totalSpent.plus(orderTotal);

    // Get payments total
    const paymentsRes = await db.query(
      `SELECT SUM(amount) as paid FROM payments WHERE order_id = $1 AND voided = FALSE`,
      [o.id]
    );
    const orderPaid = new Decimal(paymentsRes.rows[0]?.paid || 0);
    totalPaid = totalPaid.plus(orderPaid);
  }

  const balanceDue = Decimal.max(0, totalSpent.minus(totalPaid));

  return {
    totalSpent: totalSpent.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    orderCount: ordersRes.rows.length,
  };
}

export const customerService = {
  searchCustomers,
  getCustomerById,
  getCustomerByPhone,
  createCustomer: async (
    input: { name: string; phone?: string | null; notes?: string | null },
    userIdOrActor?: string | { id: string; name: string }
  ) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff" } : (userIdOrActor || { id: "system", name: "Staff" });
    const res = await createCustomer(input, actor, true);
    return res.customer;
  },
  updateCustomer: async (
    id: string,
    input: { name?: string; phone?: string | null; notes?: string | null },
    userIdOrActor?: string | { id: string; name: string }
  ) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff" } : (userIdOrActor || { id: "system", name: "Staff" });
    return updateCustomer(id, input, actor);
  },
  deleteCustomer: async (
    id: string,
    userIdOrActor?: string | { id: string; name: string; role?: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Admin", role: "admin" }
        : { id: userIdOrActor?.id || "system", name: userIdOrActor?.name || "Admin", role: userIdOrActor?.role || "admin" };
    return deleteOrArchiveCustomer(id, actor);
  },
  getCustomerBalance,
  normalizeEthiopianPhone,
};

