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

    const id = typeof body?.id === "string" && body.id.trim() ? body.id.trim() : undefined;
    const token = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : undefined;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const orderId = typeof body?.order_id === "string" && body.order_id.trim() ? body.order_id : `ord-${Date.now()}`;
    const customerId = typeof body?.customer_id === "string" && body.customer_id.trim() ? body.customer_id.trim() : undefined;
    const customerName = typeof body?.customer_name === "string" && body.customer_name.trim() ? body.customer_name.trim() : undefined;
    const eventDate = typeof body?.event_date === "string" ? body.event_date : undefined;
    const visibility = body?.visibility === "public" ? "public" : "private";
    const pin = typeof body?.pin === "string" && body.pin.trim() ? body.pin.trim() : undefined;
    const allowDownload = typeof body?.allow_download === "boolean" ? body.allow_download : true;
    const expiresAt = typeof body?.expires_at === "string" ? body.expires_at : undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Album title is required." },
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
        id,
        token,
        order_id: orderId,
        customer_id: customerId,
        customer_name: customerName,
        event_date: eventDate,
        title,
        visibility,
        pin,
        allow_download: allowDownload,
        expires_at: expiresAt,
      },
      user
    );

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
