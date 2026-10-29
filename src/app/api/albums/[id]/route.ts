import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { albumService } from "@/server/services/album.service";

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
    return NextResponse.json({ album });
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

    const coverImageUrl =
      typeof body?.cover_image_url === "string"
        ? body.cover_image_url.trim()
        : typeof body?.cover_url === "string"
        ? body.cover_url.trim()
        : undefined;

    const updated = await albumService.updateAlbum(
      params.id,
      {
        title: typeof body?.title === "string" ? body.title.trim() : undefined,
        visibility: body?.visibility,
        pin: typeof body?.pin === "string" ? body.pin.trim() : undefined,
        allow_download: typeof body?.allow_download === "boolean" ? body.allow_download : undefined,
        expires_at: typeof body?.expires_at === "string" ? body.expires_at : undefined,
        cover_image_url: coverImageUrl,
        cover_url: coverImageUrl,
      },
      { id: user.id, name: user.name || "Staff" }
    );


    return NextResponse.json({ album: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const result = await albumService.deleteAlbum(params.id, {
      id: user.id,
      name: user.name,
      role: user.role,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
