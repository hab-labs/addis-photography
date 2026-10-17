import { NextResponse } from "next/server";
import { getSessionIdFromRequest, destroySession, clearSessionCookie } from "@/server/auth/session";

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) {
    await destroySession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
