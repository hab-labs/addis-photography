import { NextResponse } from "next/server";
import { getPublicAlbumView, UNLOCK_SESSION_COOKIE_PREFIX } from "@/server/services/public-viewer.service";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Check unlock token in header or cookie
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
    return NextResponse.json({ error: result.message || "Album not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
