import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { orderService } from "@/server/services/order.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const order = await orderService.getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const status = body?.status;
    const notes = typeof body?.notes === "string" ? body.notes : undefined;

    if (!status) {
      return NextResponse.json({ error: "Status is required." }, { status: 400 });
    }

    const updated = await orderService.updateOrderStatus(params.id, status, notes, user.id);
    return NextResponse.json({ order: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
