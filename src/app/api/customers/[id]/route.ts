import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { customerService } from "@/server/services/customer.service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const customer = await customerService.getCustomerById(params.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json({ customer });
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

    const updated = await customerService.updateCustomer(params.id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      phone: typeof body?.phone === "string" ? body.phone.trim() : undefined,
      notes: typeof body?.notes === "string" ? body.notes.trim() : undefined,
    }, user.id);

    return NextResponse.json({ customer: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin(request);
    const result = await customerService.deleteCustomer(params.id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
