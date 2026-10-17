import { NextResponse } from "next/server";
import { db } from "../db/client";
import { generateRandomToken } from "./crypto";

export const SESSION_COOKIE_NAME = "addis_session_id";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: "admin" | "staff";
  active: boolean;
  must_change_pw: boolean;
}

export async function createSession(
  userId: string,
  role: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const sessionId = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await db.query(
    `INSERT INTO sessions (id, user_id, role, expires_at, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [sessionId, userId, role, expiresAt, ipAddress || null, userAgent || null]
  );

  return sessionId;
}

export async function getSession(
  sessionId: string
): Promise<{ user: AuthenticatedUser; session: any } | null> {
  if (!sessionId) return null;

  const res = await db.query(
    `SELECT s.*, u.name, u.username, u.email, u.phone, u.active, u.must_change_pw, r.name as role_name
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE s.id = $1`,
    [sessionId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  // Check session expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(sessionId);
    return null;
  }

  // Check user active status
  if (!row.active) {
    await destroySession(sessionId);
    return null;
  }

  const user: AuthenticatedUser = {
    id: row.user_id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    role: row.role_name as "admin" | "staff",
    active: row.active,
    must_change_pw: row.must_change_pw,
  };

  return { user, session: row };
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return null;
  return match.split("=")[1] || null;
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
