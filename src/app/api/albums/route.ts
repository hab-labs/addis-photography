import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { albumService } from "@/server/services/album.service";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("order_id") || undefined;
    const customerId = searchParams.get("customer_id") || undefined;
    const visibility = searchParams.get("visibility") || undefined;
    const search = searchParams.get("search") || undefined;

    const albums = await albumService.listAlbums({
      order_id: orderId,
      customer_id: customerId,
      visibility,
      search,
    });

    return NextResponse.json({ albums });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const orderId = typeof body?.order_id === "string" ? body.order_id : "";
    const customerId = typeof body?.customer_id === "string" ? body.customer_id : undefined;
    const visibility = body?.visibility === "public" ? "public" : "private";
    const pin = typeof body?.pin === "string" && body.pin.trim() ? body.pin.trim() : undefined;
    const allowDownload = typeof body?.allow_download === "boolean" ? body.allow_download : true;
    const expiresAt = typeof body?.expires_at === "string" ? body.expires_at : undefined;

    if (!title || !orderId) {
      return NextResponse.json(
        { error: "Album title and order_id are required." },
        { status: 400 }
      );
    }

    if (visibility === "private" && (!pin || pin.length < 4)) {
      return NextResponse.json(
        { error: "A PIN of at least 4 digits is required for private albums." },
        { status: 400 }
      );
    }

    const album = await albumService.createAlbum(
      {
        order_id: orderId,
        customer_id: customerId,
        title,
        visibility,
        pin,
        allow_download: allowDownload,
        expires_at: expiresAt,
      },
      user.id
    );

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
