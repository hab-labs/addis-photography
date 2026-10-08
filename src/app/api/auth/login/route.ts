import { NextResponse } from "next/server";
import { INITIAL_USERS } from "@/lib/api/mockData";
import { AUTH_COOKIE_NAME, DEMO_PASSWORDS } from "@/lib/auth/config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = INITIAL_USERS.find(
    (candidate) =>
      candidate.username.toLowerCase() === username.toLowerCase() ||
      candidate.email.toLowerCase() === username.toLowerCase() ||
      candidate.phone === username,
  );

  if (!user || !user.is_active || DEMO_PASSWORDS[user.username] !== password) {
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
