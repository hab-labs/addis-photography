import Decimal from "decimal.js";
import { normalizeEthiopianPhone, createCustomer, getCustomerByPhone } from "./customer.service";
import { getPhotoTypeByName, listPhotoTypes } from "./price.service";
import { createOrder } from "./order.service";
import { logAudit } from "./audit.service";

export interface ExcelRowInput {
  row_number: number;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  booking_no?: number | string;
  customer_name: string;
  phone?: string;
  photo_type: string;
  quantity: number | string;
  unit_price?: number | string;
  paid?: number | string;
  payment_method?: string;
  notes?: string;
}

export interface MigrationSummary {
  total_rows_read: number;
  orders_created: number;
  items_created: number;
  payments_created: number;
  customers_matched: number;
  customers_created: number;
  skipped_rows: Array<{ row: number; reason: string }>;
  repaired_phones: Array<{ row: number; original: string; normalized: string }>;
}

export async function migrateExcelBookings(
  rows: ExcelRowInput[],
  actor: { id: string; name: string; role: string }
): Promise<MigrationSummary> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can execute data migrations.");
  }

  const summary: MigrationSummary = {
    total_rows_read: rows.length,
    orders_created: 0,
    items_created: 0,
    payments_created: 0,
    customers_matched: 0,
    customers_created: 0,
    skipped_rows: [],
    repaired_phones: [],
  };

  const validPhotoTypes = await listPhotoTypes(true);
  const photoTypeMap = new Map(validPhotoTypes.map((pt) => [pt.name.toLowerCase(), pt]));

  // 1. Filter and clean rows
  interface CleanedRow {
    row_number: number;
    date: string;
    customer_name: string;
    normalized_phone: string | null;
    photo_type_id: string;
    photo_type_name: string;
    quantity: number;
    unit_price: string;
    paid: string;
    payment_method: "Cash" | "Telebirr" | "Bank Transfer" | "Card" | "Other";
    notes?: string;
  }

  const cleanedRows: CleanedRow[] = [];

  for (const r of rows) {
    // Specification Section 11: Skip rows missing a date or quantity
    if (!r.date || !r.quantity) {
      summary.skipped_rows.push({
        row: r.row_number,
        reason: "Missing date or quantity",
      });
      continue;
    }

    const cleanCust = (r.customer_name || "").trim();
    if (!cleanCust) {
      summary.skipped_rows.push({ row: r.row_number, reason: "Missing customer name" });
      continue;
    }

    // Specification Section 11: Skip sample rows (Example Customer 1–3)
    if (/example\s+customer/i.test(cleanCust) || /sample/i.test(cleanCust)) {
      summary.skipped_rows.push({
        row: r.row_number,
        reason: "Illustrative sample row skipped",
      });
      continue;
    }

    const qty = parseInt(String(r.quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      summary.skipped_rows.push({ row: r.row_number, reason: "Quantity is not a positive integer" });
      continue;
    }

    // Match Photo Type
    const ptKey = (r.photo_type || "").trim().toLowerCase();
    const matchedPt = photoTypeMap.get(ptKey) || photoTypeMap.get("other");
    if (!matchedPt) {
      summary.skipped_rows.push({ row: r.row_number, reason: `Unknown photo type: ${r.photo_type}` });
      continue;
    }

    // Normalize phone
    let normPhone: string | null = null;
    if (r.phone && r.phone.trim()) {
      try {
        normPhone = normalizeEthiopianPhone(r.phone);
        if (normPhone && normPhone !== r.phone.trim()) {
          summary.repaired_phones.push({
            row: r.row_number,
            original: r.phone,
            normalized: normPhone,
          });
        }
      } catch (err) {
        summary.skipped_rows.push({
          row: r.row_number,
          reason: `Invalid phone format: ${r.phone}`,
        });
        continue;
      }
    }

    // Format date YYYY-MM-DD
    let cleanDate = r.date.trim();
    if (cleanDate.includes("/")) {
      const parts = cleanDate.split("/");
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        cleanDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }

    // Method mapping
    let method: "Cash" | "Telebirr" | "Bank Transfer" | "Card" | "Other" = "Cash";
    const rawMethod = (r.payment_method || "").toLowerCase();
    if (rawMethod.includes("telebirr")) method = "Telebirr";
    else if (rawMethod.includes("bank") || rawMethod.includes("cbe")) method = "Bank Transfer";
    else if (rawMethod.includes("card")) method = "Card";
    else if (rawMethod.includes("cash")) method = "Cash";
    else if (rawMethod) method = "Other";

    const unitPrice = r.unit_price ? new Decimal(r.unit_price).toFixed(2) : matchedPt.standard_price || "0.00";
    const paid = r.paid ? new Decimal(r.paid).toFixed(2) : "0.00";

    cleanedRows.push({
      row_number: r.row_number,
      date: cleanDate,
      customer_name: cleanCust,
      normalized_phone: normPhone,
      photo_type_id: matchedPt.id,
      photo_type_name: matchedPt.name,
      quantity: qty,
      unit_price: unitPrice,
      paid,
      payment_method: method,
      notes: r.notes,
    });
  }

  // 2. Group rows with the same date, customer name and normalized phone into one order (Spec 11)
  const groupMap = new Map<string, CleanedRow[]>();
  cleanedRows.forEach((row) => {
    const key = `${row.date}|${row.customer_name.toLowerCase()}|${row.normalized_phone || ""}`;
    const group = groupMap.get(key) || [];
    group.push(row);
    groupMap.set(key, group);
  });

  // 3. Create Orders and Payments
  for (const group of Array.from(groupMap.values())) {
    const first = group[0];

    // Customer matching
    let customerId: string | undefined;
    if (first.normalized_phone) {
      const existing = await getCustomerByPhone(first.normalized_phone);
      if (existing) {
        customerId = existing.id;
        summary.customers_matched++;
      }
    }

    if (!customerId) {
      const newCust = await createCustomer(
        { name: first.customer_name, phone: first.normalized_phone },
        actor,
        true
      );
      customerId = newCust.customer.id;
      summary.customers_created++;
    }

    // Build items
    const items = group.map((g) => ({
      photo_type_id: g.photo_type_id,
      photo_type_name: g.photo_type_name,
      quantity: g.quantity,
      unit_price: g.unit_price,
      notes: g.notes,
    }));

    // Aggregate paid amount across grouped rows
    const totalPaid = group.reduce(
      (acc, g) => acc.plus(new Decimal(g.paid)),
      new Decimal(0)
    );

    const primaryMethod = group.find((g) => Number(g.paid) > 0)?.payment_method || "Cash";

    await createOrder(
      {
        customer_id: customerId,
        order_date: first.date,
        items,
        notes: group.map((g) => g.notes).filter(Boolean).join("; ") || undefined,
        payment: totalPaid.greaterThan(0)
          ? {
              amount: totalPaid.toFixed(2),
              method: primaryMethod,
              note: "Imported from Excel Bookings migration",
            }
          : undefined,
        is_delivered: true,
      },
      actor
    );

    summary.orders_created++;
    summary.items_created += items.length;
    if (totalPaid.greaterThan(0)) {
      summary.payments_created++;
    }
  }

  await logAudit(actor, "EXCEL_MIGRATION_COMPLETED", "Migration", "ExcelBookings", {
    orders_created: summary.orders_created,
    items_created: summary.items_created,
    skipped_rows_count: summary.skipped_rows.length,
  });

  return summary;
}
