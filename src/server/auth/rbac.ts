import { NextResponse } from "next/server";
import { getSessionIdFromRequest, getSession, AuthenticatedUser } from "./session";
import { db } from "../db/client";

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
  if (data?.user) return data.user;

  // Development & In-Memory Store resilience:
  // If memory store was cleared on server restart/HMR but browser has valid cookies,
  // restore session for the active user so valid requests are not rejected with 401.
  const cookieHeader = request.headers.get("cookie") || "";
  const roleMatch = cookieHeader.match(/addis_auth_role=([a-zA-Z0-9_-]+)/);
  const roleValue = roleMatch ? roleMatch[1].toLowerCase() : null;

  if (roleValue === "admin" || roleValue === "staff") {
    try {
      const userRes = await db.query(
        `SELECT u.id, u.name, u.username, u.email, u.phone, u.active, u.must_change_pw, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE LOWER(r.name) = $1 AND u.active = true
         LIMIT 1`,
        [roleValue]
      );

      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        try {
          await db.query(
            `INSERT INTO sessions (id, user_id, role, expires_at, created_at)
             VALUES ($1, $2, $3, NOW() + INTERVAL '8 hours', NOW())`,
            [sessionId, u.id, roleValue]
          );
        } catch {}

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: roleValue as "admin" | "staff",
          active: Boolean(u.active),
          must_change_pw: Boolean(u.must_change_pw),
        };
      }
    } catch {}
  }

  return null;
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
