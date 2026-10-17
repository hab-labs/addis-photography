import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { orderService } from "@/server/services/order.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json(
        { error: "A mandatory cancellation reason must be provided to void an order." },
        { status: 400 }
      );
    }

    const order = await orderService.voidOrder(params.id, reason, user.id);
    return NextResponse.json({ order });
  } catch (error) {
    return handleAuthError(error);
  }
}
