import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { createOperator, listOperators, updateOperator } from "@/lib/auth/operator-store";

function isAdmin(request: Request) {
  return request.headers.get("cookie")?.split(";").some((cookie) => cookie.trim() === `${AUTH_COOKIE_NAME}=admin`) ?? false;
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  return NextResponse.json({ users: listOperators() });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const user = createOperator({
      name: typeof body?.name === "string" ? body.name : "",
      username: typeof body?.username === "string" ? body.username : "",
      email: typeof body?.email === "string" ? body.email : "",
      phone: typeof body?.phone === "string" ? body.phone : "",
      password: typeof body?.password === "string" ? body.password : "",
      role: body?.role === "admin" ? "admin" : "staff",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create operator." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
    if (!isAdmin(request)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const body = await request.json().catch(() => null);
    try {
      const user = updateOperator(String(body?.id || ""), {
        name: typeof body?.name === "string" ? body.name : "",
        username: typeof body?.username === "string" ? body.username : "",
        email: typeof body?.email === "string" ? body.email : "",
        phone: typeof body?.phone === "string" ? body.phone : "",
        role: body?.role === "admin" ? "admin" : "staff",
        password: typeof body?.password === "string" && body.password ? body.password : undefined,
      });
      return NextResponse.json({ user });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update operator." }, { status: 400 });
  }
}
