import Decimal from "decimal.js";
import { db, TransactionClient } from "../db/client";
import { logAudit } from "./audit.service";
import { getOrderById, getStudioTodayDate, OrderDetail } from "./order.service";

export interface RecordPaymentInput {
  order_id: string;
  amount: string | number;
  method: "Cash" | "Telebirr" | "Bank Transfer" | "Card" | "Other";
  reference_no?: string;
  note?: string;
  payment_date?: string; // Africa/Addis_Ababa date, default today
}

export async function recordPayment(
  input: RecordPaymentInput,
  actor: { id: string; name: string; role: string }
): Promise<OrderDetail> {
  const amount = new Decimal(input.amount || 0);
  if (amount.isNegative() || amount.isZero()) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const paymentDate = input.payment_date || getStudioTodayDate();

  // Execute in transaction to verify balance and avoid race conditions
  await db.transaction(async (txClient: TransactionClient) => {
    // 1. Fetch current order with line items and existing payments
    const order = await getOrderById(input.order_id);
    if (!order) throw new Error("Order not found.");
    if (order.voided) throw new Error("Cannot record payment against a voided order.");
    if (order.status === "Cancelled") throw new Error("Cannot record payment against a cancelled order.");

    const currentBalance = new Decimal(order.balance_amount);
    if (amount.greaterThan(currentBalance)) {
      throw new Error(
        `Overpayment rejected: Requested payment amount (ETB ${amount.toFixed(2)}) exceeds current outstanding balance (ETB ${currentBalance.toFixed(2)}).`
      );
    }

    const payId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await txClient.query(
      `INSERT INTO payments (id, order_id, amount, method, paid_at, payment_date, reference_no, note, created_by, voided, created_at)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, FALSE, NOW())`,
      [
        payId,
        input.order_id,
        amount.toFixed(2),
        input.method,
        paymentDate,
        input.reference_no || null,
        input.note || null,
        actor.id,
      ]
    );

    await logAudit(actor, "PAYMENT_RECORDED", "Payment", payId, {
      order_id: input.order_id,
      booking_no: order.booking_no,
      amount: amount.toFixed(2),
      method: input.method,
      reference_no: input.reference_no,
      payment_date: paymentDate,
    });
  });

  return (await getOrderById(input.order_id))!;
}

export async function voidPayment(
  paymentId: string,
  reason: string,
  actor: { id: string; name: string; role: string }
): Promise<OrderDetail> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can void payments.");
  }

  const cleanReason = reason ? reason.trim() : "";
  if (!cleanReason) {
    throw new Error("A mandatory reason is required to void a payment.");
  }

  const payRes = await db.query(
    `SELECT * FROM payments WHERE id = $1`,
    [paymentId]
  );
  if (payRes.rows.length === 0) throw new Error("Payment record not found.");
  const payment = payRes.rows[0];

  if (payment.voided) {
    throw new Error("This payment is already voided.");
  }

  await db.query(
    `UPDATE payments SET voided = TRUE, void_reason = $1, voided_at = NOW(), voided_by = $2 WHERE id = $3`,
    [cleanReason, actor.id, paymentId]
  );

  await logAudit(actor, "PAYMENT_VOIDED", "Payment", paymentId, {
    order_id: payment.order_id,
    amount: payment.amount,
    reason: cleanReason,
  });

  return (await getOrderById(payment.order_id))!;
}

export const paymentService = {
  recordPayment: async (
    orderId: string,
    input: any,
    userIdOrActor?: string | { id: string; name: string; role: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Staff", role: "staff" }
        : userIdOrActor || { id: "system", name: "Staff", role: "staff" };
    const order = await recordPayment(
      {
        order_id: orderId,
        amount: input.amount,
        method: input.method,
        reference_no: input.reference || input.reference_no,
        note: input.note || input.notes,
        payment_date: input.payment_date,
      },
      actor
    );
    return { order, payment: order.payments[order.payments.length - 1] };
  },
  voidPayment: async (
    paymentId: string,
    reason: string,
    userIdOrActor?: string | { id: string; name: string; role: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Admin", role: "admin" }
        : userIdOrActor || { id: "system", name: "Admin", role: "admin" };
    return voidPayment(paymentId, reason, actor);
  },
};

