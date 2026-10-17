import { NextResponse } from "next/server";
import { unlockPrivateAlbum, UNLOCK_SESSION_COOKIE_PREFIX } from "@/server/services/public-viewer.service";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  if (!pin) {
    return NextResponse.json({ error: "PIN is required." }, { status: 400 });
  }

  const result = await unlockPrivateAlbum(token, pin, ip);

  if (!result.success) {
    const status = result.retryAfterSeconds ? 429 : 401;
    return NextResponse.json(
      {
        error: result.error,
        retryAfterSeconds: result.retryAfterSeconds,
      },
      { status }
    );
  }

  const response = NextResponse.json({
    success: true,
    unlockToken: result.unlockToken,
  });

  if (result.unlockToken) {
    response.cookies.set({
      name: `${UNLOCK_SESSION_COOKIE_PREFIX}${token}`,
      value: result.unlockToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });
  }

  return response;
}
