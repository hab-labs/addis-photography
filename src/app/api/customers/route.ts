import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { customerService } from "@/server/services/customer.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;

    const customers = await customerService.searchCustomers(q);
    return NextResponse.json({ customers });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Customer name and phone number are required." },
        { status: 400 }
      );
    }

    const customer = await customerService.createCustomer({ name, phone, notes }, user.id);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
