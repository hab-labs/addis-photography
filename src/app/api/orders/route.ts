import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { orderService } from "@/server/services/order.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("payment_status") || undefined;
    const date = searchParams.get("date") || undefined;
    const customerId = searchParams.get("customer_id") || undefined;
    const search = searchParams.get("search") || undefined;

    const orders = await orderService.listOrders({
      status,
      payment_status: paymentStatus,
      date,
      customer_id: customerId,
      search,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item." },
        { status: 400 }
      );
    }

    const order = await orderService.createOrder(
      {
        customer_id: body.customer_id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        items: body.items,
        initial_payment: body.initial_payment,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
