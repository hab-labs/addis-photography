import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { paymentService } from "@/server/services/payment.service";

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
        { error: "A mandatory void reason must be provided to void a payment." },
        { status: 400 }
      );
    }

    const payment = await paymentService.voidPayment(params.id, reason, user.id);
    return NextResponse.json({ payment });
  } catch (error) {
    return handleAuthError(error);
  }
}
