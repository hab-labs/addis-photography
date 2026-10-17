import { NextResponse } from "next/server";
import { getSessionIdFromRequest, getSession, AuthenticatedUser } from "./session";

export class AuthError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getAuthUser(request: Request): Promise<AuthenticatedUser | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  const data = await getSession(sessionId);
  return data ? data.user : null;
}

export async function requireAuth(request: Request): Promise<AuthenticatedUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new AuthError("Authentication required.", 401);
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (user.role !== "admin") {
    throw new AuthError("Forbidden: Administrator privileges required.", 403);
  }
  return user;
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  const message = error instanceof Error ? error.message : "Internal server error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
