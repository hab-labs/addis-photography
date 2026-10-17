import Decimal from "decimal.js";
import { db } from "../db/client";
import { getStudioTodayDate } from "./order.service";

export interface DailyReportData {
  date: string;
  bookings_count: number;
  total_value: string;
  total_paid: string; // Booking-date view
  total_due: string;
  cash_received_today: string; // Payment-date view
  quantity_by_photo_type: Record<string, number>;
  paid_by_method: Record<string, string>;
  unpaid_orders: Array<{
    id: string;
    booking_no: number;
    booking_ref: string;
    customer_name: string;
    customer_phone: string | null;
    total: string;
    paid: string;
    balance: string;
  }>;
}

export interface RangeReportData {
  from_date: string;
  to_date: string;
  bookings_count: number;
  total_value: string;
  total_paid: string;
  total_due: string;
  cash_collected_in_period: string;
  quantity_by_photo_type: Record<string, number>;
  paid_by_method: Record<string, string>;
  unpaid_orders: Array<{
    id: string;
    booking_no: number;
    booking_ref: string;
    order_date: string;
    customer_name: string;
    customer_phone: string | null;
    balance: string;
  }>;
}

export async function getDailyReport(dateInput?: string): Promise<DailyReportData> {
  const date = dateInput || getStudioTodayDate();

  // 1. Fetch non-cancelled, non-voided orders for this order_date
  const ordersRes = await db.query(
    `SELECT o.id, o.booking_no, o.order_date, c.name as customer_name, c.phone as customer_phone
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.order_date = $1 AND o.status != 'Cancelled' AND o.voided = FALSE
     ORDER BY o.booking_no ASC`,
    [date]
  );

  let totalValue = new Decimal(0);
  let totalPaidBookingDate = new Decimal(0);
  const quantityByPhotoType: Record<string, number> = {};
  const paidByMethod: Record<string, Decimal> = {};
  const unpaidOrders: DailyReportData["unpaid_orders"] = [];

  for (const o of ordersRes.rows) {
    // Items
    const itemsRes = await db.query(
      `SELECT photo_type_name, quantity, line_total FROM order_items WHERE order_id = $1`,
      [o.id]
    );

    let orderTotal = new Decimal(0);
    itemsRes.rows.forEach((it) => {
      const lineTotal = new Decimal(it.line_total);
      orderTotal = orderTotal.plus(lineTotal);
      quantityByPhotoType[it.photo_type_name] =
        (quantityByPhotoType[it.photo_type_name] || 0) + it.quantity;
    });

    totalValue = totalValue.plus(orderTotal);

    // Payments associated with this order (booking-date view)
    const paymentsRes = await db.query(
      `SELECT amount, method FROM payments WHERE order_id = $1 AND voided = FALSE`,
      [o.id]
    );

    let orderPaid = new Decimal(0);
    paymentsRes.rows.forEach((p) => {
      const amt = new Decimal(p.amount);
      orderPaid = orderPaid.plus(amt);

      paidByMethod[p.method] = (paidByMethod[p.method] || new Decimal(0)).plus(amt);
    });

    totalPaidBookingDate = totalPaidBookingDate.plus(orderPaid);

    const balance = Decimal.max(0, orderTotal.minus(orderPaid));
    const bookingRef = `${date.replace(/-/g, "")}-${String(o.booking_no).padStart(3, "0")}`;

    if (balance.isPositive()) {
      unpaidOrders.push({
        id: o.id,
        booking_no: o.booking_no,
        booking_ref: bookingRef,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        total: orderTotal.toFixed(2),
        paid: orderPaid.toFixed(2),
        balance: balance.toFixed(2),
      });
    }
  }

  const totalDue = Decimal.max(0, totalValue.minus(totalPaidBookingDate));

  // 2. Separate query: Cash received on payment_date = D (payment-date view)
  const paymentDateRes = await db.query(
    `SELECT SUM(amount) as cash_received
     FROM payments
     WHERE payment_date = $1 AND voided = FALSE`,
    [date]
  );
  const cashReceivedToday = new Decimal(paymentDateRes.rows[0]?.cash_received || 0);

  // Format paidByMethod to string
  const formattedPaidByMethod: Record<string, string> = {};
  for (const [k, v] of Object.entries(paidByMethod)) {
    formattedPaidByMethod[k] = v.toFixed(2);
  }

  return {
    date,
    bookings_count: ordersRes.rows.length,
    total_value: totalValue.toFixed(2),
    total_paid: totalPaidBookingDate.toFixed(2),
    total_due: totalDue.toFixed(2),
    cash_received_today: cashReceivedToday.toFixed(2),
    quantity_by_photo_type: quantityByPhotoType,
    paid_by_method: formattedPaidByMethod,
    unpaid_orders: unpaidOrders,
  };
}

export async function getRangeReport(fromDate: string, toDate: string): Promise<RangeReportData> {
  const ordersRes = await db.query(
    `SELECT o.id, o.booking_no, o.order_date, c.name as customer_name, c.phone as customer_phone
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.order_date >= $1 AND o.order_date <= $2 AND o.status != 'Cancelled' AND o.voided = FALSE
     ORDER BY o.order_date ASC, o.booking_no ASC`,
    [fromDate, toDate]
  );

  let totalValue = new Decimal(0);
  let totalPaid = new Decimal(0);
  const quantityByPhotoType: Record<string, number> = {};
  const paidByMethod: Record<string, Decimal> = {};
  const unpaidOrders: RangeReportData["unpaid_orders"] = [];

  for (const o of ordersRes.rows) {
    const itemsRes = await db.query(
      `SELECT photo_type_name, quantity, line_total FROM order_items WHERE order_id = $1`,
      [o.id]
    );

    let orderTotal = new Decimal(0);
    itemsRes.rows.forEach((it) => {
      const lineTotal = new Decimal(it.line_total);
      orderTotal = orderTotal.plus(lineTotal);
      quantityByPhotoType[it.photo_type_name] =
        (quantityByPhotoType[it.photo_type_name] || 0) + it.quantity;
    });

    totalValue = totalValue.plus(orderTotal);

    const paymentsRes = await db.query(
      `SELECT amount, method FROM payments WHERE order_id = $1 AND voided = FALSE`,
      [o.id]
    );

    let orderPaid = new Decimal(0);
    paymentsRes.rows.forEach((p) => {
      const amt = new Decimal(p.amount);
      orderPaid = orderPaid.plus(amt);
      paidByMethod[p.method] = (paidByMethod[p.method] || new Decimal(0)).plus(amt);
    });

    totalPaid = totalPaid.plus(orderPaid);

    const balance = Decimal.max(0, orderTotal.minus(orderPaid));
    const dateStr = typeof o.order_date === "string" ? o.order_date.split("T")[0] : fromDate;
    const bookingRef = `${dateStr.replace(/-/g, "")}-${String(o.booking_no).padStart(3, "0")}`;

    if (balance.isPositive()) {
      unpaidOrders.push({
        id: o.id,
        booking_no: o.booking_no,
        booking_ref: bookingRef,
        order_date: dateStr,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        balance: balance.toFixed(2),
      });
    }
  }

  // Payment date cash collected during range
  const paymentRangeRes = await db.query(
    `SELECT SUM(amount) as cash_period
     FROM payments
     WHERE payment_date >= $1 AND payment_date <= $2 AND voided = FALSE`,
    [fromDate, toDate]
  );
  const cashCollectedPeriod = new Decimal(paymentRangeRes.rows[0]?.cash_period || 0);

  const formattedPaidByMethod: Record<string, string> = {};
  for (const [k, v] of Object.entries(paidByMethod)) {
    formattedPaidByMethod[k] = v.toFixed(2);
  }

  return {
    from_date: fromDate,
    to_date: toDate,
    bookings_count: ordersRes.rows.length,
    total_value: totalValue.toFixed(2),
    total_paid: totalPaid.toFixed(2),
    total_due: Decimal.max(0, totalValue.minus(totalPaid)).toFixed(2),
    cash_collected_in_period: cashCollectedPeriod.toFixed(2),
    quantity_by_photo_type: quantityByPhotoType,
    paid_by_method: formattedPaidByMethod,
    unpaid_orders: unpaidOrders,
  };
}

export function generateCsvExport(report: RangeReportData | DailyReportData): string {
  const isRange = "from_date" in report;
  const lines: string[] = [];

  lines.push("Addis Photography Studio - Financial Ledger Export");
  lines.push(`Period: ${isRange ? `${report.from_date} to ${report.to_date}` : report.date}`);
  lines.push(`Exported At: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("METRIC SUMMARY,VALUE (ETB)");
  lines.push(`Total Bookings,${report.bookings_count}`);
  lines.push(`Total Order Value,${report.total_value}`);
  lines.push(`Total Paid (Booking Date View),${report.total_paid}`);
  lines.push(`Total Outstanding Due,${report.total_due}`);
  lines.push(
    `Total Cash Received (Payment Date View),${
      isRange ? report.cash_collected_in_period : report.cash_received_today
    }`
  );
  lines.push("");

  lines.push("PHOTO TYPE,QUANTITY DELIVERED");
  for (const [pt, qty] of Object.entries(report.quantity_by_photo_type)) {
    lines.push(`"${pt}",${qty}`);
  }
  lines.push("");

  lines.push("PAYMENT METHOD,TOTAL COLLECTED (ETB)");
  for (const [m, amt] of Object.entries(report.paid_by_method)) {
    lines.push(`"${m}",${amt}`);
  }
  lines.push("");

  lines.push("UNPAID ORDERS - OUTSTANDING BALANCES");
  lines.push("Booking Ref,Customer Name,Phone,Balance Due (ETB)");
  for (const u of report.unpaid_orders) {
    lines.push(
      `"${u.booking_ref}","${u.customer_name}","${u.customer_phone || ""}","${u.balance}"`
    );
  }

  return lines.join("\n");
}

export const reportService = {
  getDailyReport,
  getRangeReport,
  exportDailyReportCSV: async (dateStr?: string) => {
    const report = await getDailyReport(dateStr);
    return generateCsvExport(report);
  },
  exportRangeReportCSV: async (fromStr: string, toStr: string) => {
    const report = await getRangeReport(fromStr, toStr);
    return generateCsvExport(report);
  },
};

