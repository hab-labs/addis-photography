import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { albumService } from "@/server/services/album.service";
import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const album = await albumService.getAlbumById(params.id);
    if (!album) {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${protocol}://${host}/a/${album.public_token}`;

    const svg = await QRCode.toString(publicUrl, {
      type: "svg",
      margin: 2,
      width: 300,
      color: {
        dark: "#1A2530",
        light: "#FFFFFF",
      },
    });

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
