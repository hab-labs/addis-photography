import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { authenticateOperator } from "@/lib/auth/operator-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = authenticateOperator(username, password);
  if (!user) {
    return NextResponse.json(
      { error: { message: "Invalid username or password" } },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ user });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: user.role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
