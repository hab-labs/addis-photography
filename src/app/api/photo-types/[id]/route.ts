import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { priceService } from "@/server/services/price.service";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const priceValue = body?.standard_price !== undefined ? body.standard_price : body?.standard_unit_price;
    const updated = await priceService.updatePhotoType(params.id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      description: typeof body?.description === "string" ? body.description.trim() : undefined,
      standard_unit_price: priceValue !== undefined ? (priceValue === null ? null : String(priceValue)) : undefined,
      category: typeof body?.category === "string" ? body.category.trim() : undefined,
      active: typeof body?.active === "boolean" ? body.active : undefined,
      sort_order: typeof body?.sort_order === "number" ? body.sort_order : undefined,
    }, user.id);

    return NextResponse.json({ photo_type: updated });
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
    const updated = await priceService.updatePhotoType(params.id, { active: false }, user.id);
    return NextResponse.json({ success: true, photo_type: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

