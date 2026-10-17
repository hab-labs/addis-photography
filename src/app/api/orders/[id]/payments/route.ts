import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { paymentService } from "@/server/services/payment.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const amount = body?.amount !== undefined ? String(body.amount) : "";
    const method = body?.method;
    const reference = typeof body?.reference === "string" ? body.reference.trim() : undefined;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;

    if (!amount || !method) {
      return NextResponse.json(
        { error: "Payment amount and method are required." },
        { status: 400 }
      );
    }

    const result = await paymentService.recordPayment(
      params.id,
      { amount, method, reference, notes },
      user.id
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
