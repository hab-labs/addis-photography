import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { priceService } from "@/server/services/price.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    const photoTypes = await priceService.getAllPhotoTypes(includeInactive);
    return NextResponse.json({ photo_types: photoTypes });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const standardUnitPrice = body?.standard_unit_price !== undefined ? String(body.standard_unit_price) : null;
    const category = typeof body?.category === "string" ? body.category.trim() : "print";
    const sortOrder = typeof body?.sort_order === "number" ? body.sort_order : 0;

    if (!name) {
      return NextResponse.json({ error: "Photo type name is required." }, { status: 400 });
    }

    const created = await priceService.createPhotoType({
      name,
      description,
      standard_unit_price: standardUnitPrice,
      category,
      sort_order: sortOrder,
    }, user.id);

    return NextResponse.json({ photo_type: created }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
