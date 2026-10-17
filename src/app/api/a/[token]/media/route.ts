import { NextResponse } from "next/server";
import { getPublicAlbumView, UNLOCK_SESSION_COOKIE_PREFIX } from "@/server/services/public-viewer.service";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${UNLOCK_SESSION_COOKIE_PREFIX}${token}=`));
  const unlockCookie = cookieMatch ? cookieMatch.split("=")[1] : undefined;
  const unlockHeader = request.headers.get("x-unlock-token") || undefined;
  const unlockToken = unlockHeader || unlockCookie;

  const result = await getPublicAlbumView(token, unlockToken, ip);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  if (result.status === "expired") {
    return NextResponse.json({ error: "Album expired." }, { status: 410 });
  }

  if (result.status === "locked") {
    return NextResponse.json(
      { error: "PIN required to view album media.", requiresPin: true },
      { status: 403 }
    );
  }

  return NextResponse.json({ media: result.media || [] });
}
